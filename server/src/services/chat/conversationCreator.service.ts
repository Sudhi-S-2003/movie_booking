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
import { User } from '../../models/user.model.js';

/**
 * Lean conversation payload shape — what `Conversation.findById(...).lean()`
 * resolves to. Declared as a loose record to sidestep the noisy Mongoose
 * `FlattenMaps` / `HydratedDocument` mismatch under `exactOptionalPropertyTypes`.
 * Callers that need fields pluck them off this shape.
 */
type LeanConversation = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

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
const findDirectBetween = async (userA: IdLike, userB: IdLike) => {
  const matches = await ConversationParticipant.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: { userId: { $in: [toObjectId(userA), toObjectId(userB)] } } },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    { $match: { count: 2 } },
  ]);

  if (matches.length === 0) return null;

  return Conversation.findOne({
    _id: { $in: matches.map((m) => m._id) },
    type: 'direct',
  }).lean();
};

interface CreateDirectArgs {
  userA: IdLike;
  userB: IdLike;
  createdBy: IdLike;
}

/**
 * Idempotent direct-chat creation.
 *
 * Returns `{ conversation, existing }` so callers can decide whether to
 * emit new-conversation socket events or just return the existing doc.
 */

type UserInfo = {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  username: string
}

export const createDirectConversation = async ({
  userA,
  userB,
  createdBy,
}: CreateDirectArgs): Promise<{
  conversation: LeanConversation
  existing: boolean
}> => {

  const userAId = toObjectId(userA)
  const userBId = toObjectId(userB)
  const creatorId = toObjectId(createdBy)

  const existing = await findDirectBetween(userAId, userBId)

  if (existing) {
    return {
      conversation: existing as unknown as LeanConversation,
      existing: true,
    }
  }

  const userInfos = await User.find(
    {
      _id: {
        $in: [userAId, userBId],
      },
    },
    {
      name: 1,
      email: 1,
      username: 1,
    },
  ).lean<UserInfo[]>()

  const userInfoMap = new Map(
    userInfos.map(u => [u._id.toString(), u]),
  )

  const userAInfo = userInfoMap.get(userAId.toString())
  const userBInfo = userInfoMap.get(userBId.toString())

  if (!userAInfo || !userBInfo) {
    throw new Error(
      'One or both users not found for direct conversation creation',
    )
  }

  const created = await retryOnSlugCollision(() =>
    Conversation.create({
      type: 'direct',
      createdBy: creatorId,
      messageCount: 0,
      publicName: generateAutoPublicName('direct'),

      directParentParticipant: [
        {
          userId: userAId,
          name: userAInfo.name,
          email: userAInfo.email,
          username: userAInfo.username,
        },
        {
          userId: userBId,
          name: userBInfo.name,
          email: userBInfo.email,
          username: userBInfo.username,
        },
      ],
    }),
  )

  await syncParticipants(
    created._id as mongoose.Types.ObjectId,
    [userAId, userBId],
    { creatorId },
  )

  const lean = await Conversation.findById(
    created._id,
  ).lean()

  if (!lean) {
    throw new Error(
      'Direct conversation disappeared after insert',
    )
  }

  return {
    conversation: lean as unknown as LeanConversation,
    existing: false,
  }
}

// ─── Group ──────────────────────────────────────────────────────────────────

interface CreateGroupArgs {
  title: string;
  /** User-supplied slug. Pre-validated by the caller. */
  publicName: string;
  participantIds: ReadonlyArray<IdLike>;
  createdBy: IdLike;
}

type CreateGroupResult =
  | { ok: true; conversation: LeanConversation }
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
      type: 'group',
      title,
      publicName,
      createdBy: toObjectId(createdBy),
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

// ─── API ────────────────────────────────────────────────────────────────────

/**
 * Find the existing API-driven conversation between an owner and an
 * external email.
 */
const findApiBetween = async (createdBy: IdLike, email: string) => {
  return Conversation.findOne({
    type: 'api',
    createdBy: toObjectId(createdBy),
    'externalUser.email': email.toLowerCase(),
  }).lean();
};

interface CreateApiArgs {
  createdBy: IdLike;
  externalUser: {
    name: string;
    email: string;
  };
}

/**
 * Idempotent API-chat creation with inline external user info.
 */
export const createApiConversation = async ({
  createdBy,
  externalUser,
}: CreateApiArgs): Promise<{
  conversation: LeanConversation;
  existing: boolean;
}> => {
  const existing = await findApiBetween(createdBy, externalUser.email);
  if (existing) return { conversation: existing as unknown as LeanConversation, existing: true };
  const createdInfo = await User.findById(createdBy).lean<UserInfo>()
  if (!createdInfo) throw new Error("createdInfo Miss")

  const created = await retryOnSlugCollision(() =>
    Conversation.create({
      type: 'api',
      createdBy: toObjectId(createdBy),
      messageCount: 0,
      publicName: generateAutoPublicName('api'),
      externalUser: {
        name: externalUser.name.trim(),
        email: externalUser.email.trim().toLowerCase(),
      },
      directParentParticipant: [
        {
          userId: createdBy,
          name: createdInfo.name,
          email: createdInfo.email,
          username: createdInfo.username,
        },
      ],
    }),
  );


  // For API conversations, the only database participant is the key owner.
  await syncParticipants(
    created._id as mongoose.Types.ObjectId,
    [createdBy],
    { creatorId: createdBy },
  );

  const lean = await Conversation.findById(created._id).lean();
  if (!lean) throw new Error('API conversation disappeared after insert');
  return { conversation: lean as unknown as LeanConversation, existing: false };
};
