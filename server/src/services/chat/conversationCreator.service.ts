// ─────────────────────────────────────────────────────────────────────────────
// conversationCreator.service
//
// Higher-level creation primitives for the two user-initiated conversation
// types. Factored out of the controller so HTTP handlers stay thin and
// non-HTTP callers (seeds, tests, future workers) can build conversations
// through the same code path.
//
// Responsibilities:
//   • direct: dedup the pair → insert with auto slug → sync membership
//   • group:  insert with user-supplied slug → sync membership
//
// Slug uniqueness is enforced by the partial unique index on
// `Conversation.publicName`. Auto-generated slugs are retried on the
// astronomically unlikely E11000; user-supplied slugs surface duplicates as
// an `ApiError`-style "slug taken" result that the caller can map to 409.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { Conversation, ConversationParticipant } from '../../models/chat.model.js';
import { generateAutoPublicName } from '../../utils/publicName.util.js';
import { syncParticipants } from './conversationParticipants.service.js';

/**
 * Lean conversation payload shape — what `Conversation.findById(...).lean()`
 * resolves to. Declared as a loose record to sidestep the noisy Mongoose
 * `FlattenMaps` / `HydratedDocument` mismatch under `exactOptionalPropertyTypes`.
 * Callers that need fields pluck them off this shape.
 */
export type LeanConversation = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

type IdLike = mongoose.Types.ObjectId | string;

const toObjectId = (v: IdLike) => new mongoose.Types.ObjectId(String(v));

/** Was this error a Mongo duplicate-key violation? */
const isDuplicateKeyError = (err: unknown): boolean =>
  !!err && typeof err === 'object' && (err as { code?: number }).code === 11000;

/**
 * Retry `factory` on duplicate-key errors. Used for auto-generated slugs
 * where a collision is recoverable by picking a fresh suffix.
 */
const retryOnSlugCollision = async <T>(factory: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await factory();
    } catch (err: unknown) {
      if (!isDuplicateKeyError(err)) throw err;
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to allocate unique slug');
};

// ─── Direct ─────────────────────────────────────────────────────────────────

/**
 * Find the existing direct conversation between two users, if any.
 * Direct chats always have exactly 2 participants, so a conversation that
 * both users belong to is the pair chat.
 */
export const findDirectBetween = async (userA: IdLike, userB: IdLike) => {
  const matches = await ConversationParticipant.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: { userId: { $in: [toObjectId(userA), toObjectId(userB)] } } },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    { $match: { count: 2 } },
  ]);

  if (matches.length === 0) return null;

  return Conversation.findOne({
    _id:  { $in: matches.map((m) => m._id) },
    type: 'direct',
  }).lean();
};

export interface CreateDirectArgs {
  userA:     IdLike;
  userB:     IdLike;
  createdBy: IdLike;
}

/**
 * Idempotent direct-chat creation.
 *
 * Returns `{ conversation, existing }` so callers can decide whether to
 * emit new-conversation socket events or just return the existing doc.
 */
export const createDirectConversation = async ({
  userA,
  userB,
  createdBy,
}: CreateDirectArgs): Promise<{
  conversation: LeanConversation;
  existing:     boolean;
}> => {
  const existing = await findDirectBetween(userA, userB);
  if (existing) return { conversation: existing as unknown as LeanConversation, existing: true };

  const created = await retryOnSlugCollision(() =>
    Conversation.create({
      type:         'direct',
      createdBy:    toObjectId(createdBy),
      messageCount: 0,
      publicName:   generateAutoPublicName('direct'),
    }),
  );

  await syncParticipants(
    created._id as mongoose.Types.ObjectId,
    [userA, userB],
    { creatorId: createdBy },
  );

  const lean = await Conversation.findById(created._id).lean();
  if (!lean) throw new Error('Direct conversation disappeared after insert');
  return { conversation: lean as unknown as LeanConversation, existing: false };
};

// ─── Group ──────────────────────────────────────────────────────────────────

export interface CreateGroupArgs {
  title:          string;
  /** User-supplied slug. Pre-validated by the caller. */
  publicName:     string;
  participantIds: ReadonlyArray<IdLike>;
  createdBy:      IdLike;
}

export type CreateGroupResult =
  | { ok: true;  conversation: LeanConversation }
  | { ok: false; reason: 'slug-taken' };

/**
 * Create a group conversation. Maps duplicate-slug errors to a
 * structured `reason: 'slug-taken'` so the HTTP layer can translate to 409
 * without catching raw Mongo errors.
 */
export const createGroupConversation = async ({
  title,
  publicName,
  participantIds,
  createdBy,
}: CreateGroupArgs): Promise<CreateGroupResult> => {
  let created;
  try {
    created = await Conversation.create({
      type:         'group',
      title,
      publicName,
      createdBy:    toObjectId(createdBy),
      messageCount: 0,
    });
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) return { ok: false, reason: 'slug-taken' };
    throw err;
  }

  await syncParticipants(
    created._id as mongoose.Types.ObjectId,
    participantIds,
    { creatorId: createdBy },
  );

  const lean = await Conversation.findById(created._id).lean();
  if (!lean) throw new Error('Group conversation disappeared after insert');
  return { ok: true, conversation: lean as unknown as LeanConversation };
};
