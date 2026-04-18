// ─────────────────────────────────────────────────────────────────────────────
// apiKey.controller
//
// HTTP handlers for /api/keys — thin wrappers over apiKey.service.
// Every endpoint is authenticated; users can only see and mutate their own
// keys (ownership is enforced in the service via `userId` in the query).
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuthUser } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage } from '../utils/pagination.js';
import {
  createKey,
  listKeys,
  revokeKey,
} from '../services/apiKey/apiKey.service.js';
import type { ApiKeyCategory } from '../models/apiKey.model.js';

const ALLOWED_CATEGORIES: ReadonlyArray<ApiKeyCategory> = ['chat'];

const isCategory = (raw: unknown): raw is ApiKeyCategory =>
  typeof raw === 'string' && (ALLOWED_CATEGORIES as ReadonlyArray<string>).includes(raw);

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/keys
 * Paginated list of the caller's API keys. No secrets returned.
 */
export const listMyKeys = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const page = parsePage(req, 15);
    const { keys, pagination } = await listKeys(user._id, page);
    res.json({ success: true, keys, pagination });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/keys
 * Body: { name: string, category?: ApiKeyCategory }
 * Returns: { key, secret } — `secret` is shown exactly once.
 */
export const createMyKey = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ success: false, message: 'Key name is required' });
    }
    if (name.length > 80) {
      return res.status(400).json({ success: false, message: 'Key name must be 80 characters or fewer' });
    }

    const rawCategory = req.body?.category ?? 'chat';
    if (!isCategory(rawCategory)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const { key, secret } = await createKey({
      userId:   user._id,
      name,
      category: rawCategory,
    });
    res.status(201).json({ success: true, key, secret });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * DELETE /api/keys/:id
 * Soft-revoke one of the caller's keys.
 */
export const revokeMyKey = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const id = req.params.id as string;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid key id' });
    }
    const key = await revokeKey(user._id, id);
    if (!key) {
      return res.status(404).json({ success: false, message: 'Key not found or already revoked' });
    }
    res.json({ success: true, key });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};
