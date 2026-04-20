// ─────────────────────────────────────────────────────────────────────────────
// longtext.service
//
// Owns the three-phase upload for `longtext` chat messages:
//
//   1. startUpload()    → mint an ephemeral `uploadId`
//   2. saveChunk()      → upsert one chunk by (uploadId, index) — idempotent
//   3. completeUpload() → link chunks, create ChatMessage, stamp pointers
//
// Also exposes lazy-fetch helpers used by the chunk GET endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  MessageChunk,
  LONGTEXT_CHUNK_LIMIT,
  LONGTEXT_MAX_CHUNKS,
  LONGTEXT_PREVIEW_LIMIT,
  type MessageChunkDoc,
} from '../../models/messageChunk.model.js';
import { LongtextUpload } from '../../models/longtextUpload.model.js';
import { ChatMessage, type ChatMessageDoc } from '../../models/chat.model.js';
import { withSession } from '../../utils/transaction.util.js';

/**
 * Tagged-union input for opening a longtext session. The two arms cover the
 * JWT (registered user) flow and the signed-URL (guest) flow; the service
 * simply persists the corresponding identity fields on the row. Ownership is
 * enforced at the controller layer, not here.
 *
 * NOTE: no `fullLength` field — the total message length is computed
 * authoritatively at `complete` time from the head + every chunk's actual
 * `content.length`. Accepting a client-declared number would be a metering
 * bypass.
 */
export type StartUploadInput =
  | {
      kind:   'user';
      userId: mongoose.Types.ObjectId | string;
      text:   string;
    }
  | {
      kind:             'guest';
      externalUserName: string;
      conversationId:   mongoose.Types.ObjectId | string;
      text:             string;
    };

export interface StartUploadResult {
  uploadId: string;
}

export interface SaveChunkInput {
  uploadId: string;
  index:    number;
  content:  string;
}

/**
 * Gate invoked by `completeUpload` once it has computed the authoritative
 * `fullLength` (= head length + sum of chunk content lengths). Return
 * `{ ok: true }` to proceed with ChatMessage creation, or `{ ok: false }`
 * to abort — e.g. token metering failed and the caller has already written
 * a 402 to the response.
 */
export type MeterTokensResult =
  | { ok: true }
  | { ok: false };

export type MeterTokensFn = (fullLength: number) => Promise<MeterTokensResult>;

export interface CompleteUploadInput {
  conversationId:    mongoose.Types.ObjectId | string;
  /** `null` for guest sends — mirrors `ChatMessage.senderId` semantics. */
  senderId:          mongoose.Types.ObjectId | string | null;
  senderName:        string;
  uploadId:           string;
  expectedChunkCount: number;
  replyTo?: {
    messageId:  string;
    senderName: string;
    text:       string;
  };
  /**
   * Invoked after chunks are loaded (so the authoritative `fullLength` is
   * known) and before the ChatMessage is created. Lets the caller debit
   * tokens against the real total and short-circuit the rest of the
   * transaction if the user is over-limit.
   */
  meterTokens?: MeterTokensFn;
  /**
   * Optional mongoose ClientSession. When supplied, every write performed by
   * `completeUpload` runs within the same transaction — so a mid-flight crash
   * can't leave chunks half-stamped with a half-linked ChatMessage.
   */
  mongoSession?: mongoose.ClientSession | null | undefined;
}

export type CompleteUploadError =
  | { kind: 'missing_chunks'; expected: number; got: number }
  | { kind: 'session_expired' }    // upload row TTL'd out or never existed
  | { kind: 'metering_rejected' }; // meterTokens returned ok:false (402 already written)

export type CompleteUploadResult =
  | { ok: true;  message: ChatMessageDoc }
  | { ok: false; error: CompleteUploadError };

export type StartUploadError =
  | { kind: 'invalid_text' };

export type StartUploadReturn =
  | { ok: true;  uploadId: string }
  | { ok: false; error: StartUploadError };

/**
 * Open a new upload session. The `text` (head shown in the bubble) is
 * persisted to a TTL'd collection so subsequent calls (chunk + complete)
 * only need the `uploadId`. Rows auto-expire after 1 hour — abandoned
 * sessions clean themselves up.
 */
export const startUpload = async (
  input: StartUploadInput,
): Promise<StartUploadReturn> => {
  const { text } = input;
  if (typeof text !== 'string' || text.length < 1 || text.length > LONGTEXT_PREVIEW_LIMIT) {
    return { ok: false, error: { kind: 'invalid_text' } };
  }

  const uploadId = crypto.randomBytes(16).toString('hex');
  if (input.kind === 'user') {
    await LongtextUpload.create({
      uploadId,
      userId: new mongoose.Types.ObjectId(String(input.userId)),
      text,
    });
  } else {
    await LongtextUpload.create({
      uploadId,
      externalUserName: input.externalUserName,
      conversationId:   new mongoose.Types.ObjectId(String(input.conversationId)),
      text,
    });
  }
  return { ok: true, uploadId };
};

/**
 * Upsert a chunk for an in-flight upload. Safe to re-invoke with the same
 * (uploadId, index) — the content is replaced. Does NOT require a prior
 * `startUpload` row.
 */
export const saveChunk = async ({ uploadId, index, content }: SaveChunkInput): Promise<void> => {
  if (typeof uploadId !== 'string' || uploadId.length === 0) {
    throw new Error('uploadId is required');
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('index must be a non-negative integer');
  }
  if (index >= LONGTEXT_MAX_CHUNKS) {
    throw new Error('too_many_chunks');
  }
  if (typeof content !== 'string' || content.length === 0 || content.length > LONGTEXT_CHUNK_LIMIT) {
    throw new Error(`chunk content must be 1..${LONGTEXT_CHUNK_LIMIT} chars`);
  }

  await MessageChunk.updateOne(
    { uploadId, index },
    { $set: { uploadId, index, content }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
};

/**
 * Link pre-uploaded chunks to a freshly-persisted ChatMessage. Single-writer
 * per-uploadId — no explicit locking (the TTL garbage-collects orphans on
 * abort).
 */
export const completeUpload = async (
  input: CompleteUploadInput,
): Promise<CompleteUploadResult> => {
  const { uploadId, expectedChunkCount, replyTo, meterTokens } = input;
  const mongoSession = input.mongoSession ?? undefined;

  // Look up the upload-session row the client opened at `start`. A missing row
  // means the 1-hour TTL expired (or the uploadId was never valid), so we
  // don't have `text` to persist on the message.
  //
  // NOTE: caller-side ownership is enforced by the controllers before we get
  // here — they've already matched the session's identity against the
  // authenticated caller.
  const uploadRow = await LongtextUpload.findOne({ uploadId }, null, withSession(mongoSession)).lean();
  if (!uploadRow) {
    return { ok: false, error: { kind: 'session_expired' } };
  }

  const chunks = await MessageChunk
    .find({ uploadId }, { _id: 1, index: 1, content: 1 }, withSession(mongoSession))
    .sort({ index: 1 })
    .lean();

  if (chunks.length !== expectedChunkCount) {
    return {
      ok: false,
      error: { kind: 'missing_chunks', expected: expectedChunkCount, got: chunks.length },
    };
  }

  // Server-side authoritative total — head (from the session row) plus every
  // chunk's actual persisted content length. The client never gets to declare
  // this number; anything it sent at `start` would be an input to metering
  // that the server couldn't verify.
  const fullLength = uploadRow.text.length
    + chunks.reduce((n, c) => n + c.content.length, 0);

  // Token metering happens against the real length, before we spend any more
  // write budget creating the ChatMessage.
  if (meterTokens) {
    const metered = await meterTokens(fullLength);
    if (!metered.ok) {
      return { ok: false, error: { kind: 'metering_rejected' } };
    }
  }

  // Step 1: create the message (without chunk pointers yet — they'll be
  // stamped once we know the final linked-list shape).
  const docFields: Record<string, unknown> = {
    conversationId: new mongoose.Types.ObjectId(String(input.conversationId)),
    senderId:       input.senderId === null
      ? null
      : new mongoose.Types.ObjectId(String(input.senderId)),
    senderName:     input.senderName,
    contentType:    'longtext',
    text:           uploadRow.text,
    attachments:    [],
    isSystem:       false,
    fullLength,
  };
  if (replyTo) {
    docFields.replyTo = {
      messageId:  new mongoose.Types.ObjectId(replyTo.messageId),
      senderName: replyTo.senderName,
      text:       replyTo.text.slice(0, 200),
    };
  }
  const [message] = await ChatMessage.create([docFields], withSession(mongoSession));
  const msg = message!;

  // Step 2: walk the chunk array last → first, stamping messageId and
  // nextChunkId on each. The tail's nextChunkId stays undefined.
  let nextId: mongoose.Types.ObjectId | undefined;
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const c = chunks[i]!;
    const update: Record<string, unknown> = {
      $set:   { messageId: msg._id },
      $unset: { uploadId: '' },
    };
    if (nextId) {
      (update.$set as Record<string, unknown>).nextChunkId = nextId;
    } else {
      (update.$unset as Record<string, unknown>).nextChunkId = '';
    }
    // eslint-disable-next-line no-await-in-loop
    await MessageChunk.updateOne({ _id: c._id }, update, withSession(mongoSession));
    nextId = c._id as mongoose.Types.ObjectId;
  }

  const firstChunkId = chunks[0]!._id as mongoose.Types.ObjectId;
  const lastChunkId  = chunks[chunks.length - 1]!._id as mongoose.Types.ObjectId;

  // Step 3: back-patch the ChatMessage with the chunk pointers.
  msg.startChunkId = firstChunkId;
  msg.endChunkId   = lastChunkId;
  await msg.save(withSession(mongoSession));

  // Step 4: drop the upload-session row. It's already TTL-scheduled but an
  // explicit delete is cleaner and keeps the collection tiny in practice.
  await LongtextUpload.deleteOne({ uploadId }, withSession(mongoSession)).catch(() => { /* fine */ });

  return { ok: true, message: msg };
};

/**
 * Load a single chunk by id. Verifies it belongs to `messageId` so a caller
 * can't request a chunk from a message they don't have access to.
 */
export const loadChunk = async (
  messageId: mongoose.Types.ObjectId | string,
  chunkId:   mongoose.Types.ObjectId | string,
): Promise<Pick<MessageChunkDoc, '_id' | 'content' | 'nextChunkId'> | null> => {
  const chunk = await MessageChunk
    .findOne(
      { _id: chunkId, messageId },
      { _id: 1, content: 1, nextChunkId: 1 },
    )
    .lean();
  if (!chunk) return null;
  return {
    _id:         chunk._id,
    content:     chunk.content,
    ...(chunk.nextChunkId ? { nextChunkId: chunk.nextChunkId } : {}),
  } as Pick<MessageChunkDoc, '_id' | 'content' | 'nextChunkId'>;
};

/** Fetch every chunk for a message, ordered. */
export const loadAllChunks = async (
  messageId: mongoose.Types.ObjectId | string,
): Promise<Array<Pick<MessageChunkDoc, '_id' | 'content' | 'nextChunkId' | 'index'>>> => {
  const rows = await MessageChunk
    .find({ messageId }, { _id: 1, content: 1, nextChunkId: 1, index: 1 })
    .sort({ index: 1 })
    .lean();
  return rows as Array<Pick<MessageChunkDoc, '_id' | 'content' | 'nextChunkId' | 'index'>>;
};
