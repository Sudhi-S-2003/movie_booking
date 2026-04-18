// ─────────────────────────────────────────────────────────────────────────────
// apiKey.service
//
// Business logic for API key lifecycle — owned by the API key controller
// and (later) by authentication middleware that accepts keyId+secret pairs.
//
// Single-responsibility split:
//   • createKey   — mint a new key; returns the raw secret (shown once)
//   • listKeys    — paginated list for the manage page (no secrets)
//   • revokeKey   — soft-revoke (timestamps `revokedAt`)
//   • verifyKey   — credentials check for inbound API calls
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { ApiKey } from '../../models/apiKey.model.js';
import type { ApiKeyCategory, ApiKeyDoc } from '../../models/apiKey.model.js';
import { buildPageEnvelope } from '../../utils/pagination.js';
import type { PageParams, PageEnvelope } from '../../utils/pagination.js';
import {
  generateKeyId,
  generateSecret,
  hashSecret,
  verifySecret,
} from '../../utils/apiKey.util.js';

type IdLike = mongoose.Types.ObjectId | string;

const toObjectId = (v: IdLike) => new mongoose.Types.ObjectId(String(v));

// ─── Serialization ──────────────────────────────────────────────────────────

export interface SerializedApiKey {
  _id:        string;
  name:       string;
  category:   ApiKeyCategory;
  keyId:      string;
  createdAt:  Date;
  lastUsedAt: Date | null;
  revokedAt:  Date | null;
}

const serialize = (doc: ApiKeyDoc): SerializedApiKey => ({
  _id:        doc._id?.toString() ?? '',
  name:       doc.name,
  category:   doc.category,
  keyId:      doc.keyId,
  createdAt:  doc.createdAt,
  lastUsedAt: doc.lastUsedAt ?? null,
  revokedAt:  doc.revokedAt  ?? null,
});

// ─── Create ─────────────────────────────────────────────────────────────────

export interface CreateKeyArgs {
  userId:   IdLike;
  name:     string;
  category: ApiKeyCategory;
}

export interface CreateKeyResult {
  key:    SerializedApiKey;
  /** The raw secret — returned exactly once, never retrievable afterward. */
  secret: string;
}

export const createKey = async ({ userId, name, category }: CreateKeyArgs): Promise<CreateKeyResult> => {
  const keyId  = generateKeyId();
  const secret = generateSecret();
  const secretHash = await hashSecret(secret);

  const doc = await ApiKey.create({
    userId: toObjectId(userId),
    name:   name.trim(),
    category,
    keyId,
    secretHash,
  });

  return { key: serialize(doc), secret };
};

// ─── List ───────────────────────────────────────────────────────────────────

export interface ListKeysResult {
  keys:       SerializedApiKey[];
  pagination: PageEnvelope;
}

export const listKeys = async (userId: IdLike, page: PageParams): Promise<ListKeysResult> => {
  const filter = { userId: toObjectId(userId) };

  const [docs, total] = await Promise.all([
    ApiKey.find(filter)
      .sort({ createdAt: -1 })
      .skip(page.skip)
      .limit(page.limit),
    ApiKey.countDocuments(filter),
  ]);

  return {
    keys:       docs.map(serialize),
    pagination: buildPageEnvelope(total, page),
  };
};

// ─── Revoke ─────────────────────────────────────────────────────────────────

/** Soft-revoke. Returns the updated doc, or null if the key isn't this user's. */
export const revokeKey = async (userId: IdLike, keyDocId: IdLike): Promise<SerializedApiKey | null> => {
  const doc = await ApiKey.findOneAndUpdate(
    { _id: toObjectId(keyDocId), userId: toObjectId(userId), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return doc ? serialize(doc) : null;
};

// ─── Verify (for inbound API calls) ─────────────────────────────────────────

export interface VerifyResult {
  ok:     true;
  userId: mongoose.Types.ObjectId;
  keyId:  string;
}

export type VerifyOutcome = VerifyResult | { ok: false; reason: 'not-found' | 'revoked' | 'bad-secret' };

/**
 * Validate a (keyId, secret) pair. On success, advances `lastUsedAt` as a
 * fire-and-forget side-effect so callers don't pay for the extra write.
 */
export const verifyKey = async (keyId: string, secret: string): Promise<VerifyOutcome> => {
  const doc = await ApiKey.findOne({ keyId }).select('+secretHash');
  if (!doc) return { ok: false, reason: 'not-found' };
  if (doc.revokedAt) return { ok: false, reason: 'revoked' };

  const matches = await verifySecret(secret, doc.secretHash);
  if (!matches) return { ok: false, reason: 'bad-secret' };

  // Bump lastUsedAt; we don't block the response on this.
  ApiKey.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

  return { ok: true, userId: doc.userId, keyId: doc.keyId };
};
