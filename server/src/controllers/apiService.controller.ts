import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getErrorMessage } from '../utils/error.utils.js';
import { handleCodeShareAction, createCodeShare } from '../services/codeShare/codeShare.service.js';
import { handleCodeShareV2Action, createCodeShareV2 } from '../services/codeShare/codeShareV2.service.js';
import { generateSignedUrlData, WRITE_ACTIONS } from '../utils/apiService.util.js';
import { ApiServiceCategory } from '../constants/enums.js';
import { CodeShare } from '../models/codeShare.model.js';
import { CodeShareV2 } from '../models/codeShareV2/codeShareV2.model.js';
import { meterOrReject, tokensForText } from '../modules/billing/meter.js';

type Category = (typeof ApiServiceCategory)[keyof typeof ApiServiceCategory];

const SIGNABLE: ReadonlySet<string> = new Set([ApiServiceCategory.CODE_SHARE, ApiServiceCategory.CODE_SHARE_V2]);

/** Resolve the category and make sure an API key is only used for its own category. */
const getValidatedCategory = (req: Request): { category: Category } | { error: { status: number; message: string } } => {
  const category = (req.params.category || req.body?.category || req.apiKeyCategory || req.apiServiceCategory) as string | undefined;
  if (!category) return { error: { status: 400, message: 'Category is required' } };
  if (req.apiKeyCategory && req.apiKeyCategory !== category) {
    return { error: { status: 403, message: `This API key is only authorized for category '${req.apiKeyCategory}'` } };
  }
  return { category: category as Category };
};

/** True when `resourceId` exists and was created by `userId`. */
const ownsResource = async (category: Category, resourceId: string, userId: string): Promise<boolean> => {
  if (!mongoose.isValidObjectId(resourceId)) return false;
  const filter = { _id: resourceId, createdBy: userId };
  if (category === ApiServiceCategory.CODE_SHARE) return !!(await CodeShare.exists(filter));
  if (category === ApiServiceCategory.CODE_SHARE_V2) return !!(await CodeShareV2.exists(filter));
  return false;
};

const expiryFrom = (expiresAt: unknown, expiryMinutes: unknown): Date | undefined => {
  if (typeof expiresAt === 'string' || typeof expiresAt === 'number') {
    const d = new Date(expiresAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof expiryMinutes === 'number' && expiryMinutes > 0) return new Date(Date.now() + expiryMinutes * 60_000);
  return undefined;
};

/**
 * POST /api/public/api-service/signed-url
 * Body: { resourceId, category?, expiryMinutes?, scope?: 'read'|'write' }
 * Only the resource owner (the API key's account) can mint links for it.
 */
export const getSignedApiServiceUrl = async (req: Request, res: Response) => {
  try {
    const { resourceId, expiryMinutes, scope } = req.body ?? {};
    if (typeof resourceId !== 'string' || !resourceId) {
      return res.status(400).json({ success: false, message: 'Resource ID is required' });
    }
    const result = getValidatedCategory(req);
    if ('error' in result) return res.status(result.error.status).json({ success: false, message: result.error.message });
    if (!SIGNABLE.has(result.category)) {
      return res.status(400).json({ success: false, message: `Category '${result.category}' does not support signed links` });
    }
    if (!(await ownsResource(result.category, resourceId, String(req.user?._id)))) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const data = generateSignedUrlData(resourceId, result.category, expiryMinutes, scope === 'read' ? 'read' : 'write');
    res.status(200).json({ success: true, data });
  } catch (e: unknown) {
    res.status(400).json({ success: false, message: getErrorMessage(e) });
  }
};

/** POST /api/public/api-service — create a resource (API key required). */
export const createApiServiceResource = async (req: Request, res: Response) => {
  try {
    const result = getValidatedCategory(req);
    if ('error' in result) return res.status(result.error.status).json({ success: false, message: result.error.message });
    const { category } = result;
    const userId = String(req.user?._id);
    if (!req.apiKeyId) return res.status(401).json({ success: false, message: 'API key required to create' });

    const { title, expiresAt, expiryMinutes } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ success: false, message: 'Title required' });
    const computedExpiresAt = expiryFrom(expiresAt, expiryMinutes);

    let resourceId: string;
    if (category === ApiServiceCategory.CODE_SHARE) {
      const code = typeof req.body.code === 'string' ? req.body.code : '';
      const metered = await meterOrReject(res, { user: req.user!, serviceKey: category, units: tokensForText(title + code), description: 'Code Share: create snippet' });
      if (!metered) return;
      const data = await createCodeShare(userId, { title, code, expiresAt: computedExpiresAt });
      resourceId = String(data._id);
    } else if (category === ApiServiceCategory.CODE_SHARE_V2) {
      const { files } = req.body;
      if (!Array.isArray(files)) return res.status(400).json({ success: false, message: 'Files array required' });
      const metered = await meterOrReject(res, { user: req.user!, serviceKey: category, units: tokensForText(JSON.stringify({ title, files })), description: 'Code Workspaces: create workspace' });
      if (!metered) return;
      const data = await createCodeShareV2(userId, { title, files, ...(computedExpiresAt ? { expiresAt: computedExpiresAt } : {}) });
      resourceId = String(data._id);
    } else {
      return res.status(400).json({ success: false, message: `Category '${category}' is not supported` });
    }

    const signed = generateSignedUrlData(resourceId, category, expiryMinutes, 'write');
    return res.status(201).json({ success: true, message: 'Resource created', data: { resourceId, ...signed } });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET|POST /api/public/api-service/:category/:id?action=...
 * Read actions work with any valid link. Write actions need a `write` link
 * and must be sent as POST (never GET, so links can't trigger mutations).
 */
export const getApiServiceResource = async (req: Request, res: Response) => {
  try {
    const resourceId = req.apiServiceId;
    if (!resourceId || !mongoose.isValidObjectId(resourceId)) {
      return res.status(400).json({ success: false, message: 'Resource ID is required' });
    }
    const validation = getValidatedCategory(req);
    if ('error' in validation) return res.status(validation.error.status).json({ success: false, message: validation.error.message });
    const { category } = validation;

    const action = String(req.query?.action || req.body?.action || (category === ApiServiceCategory.CODE_SHARE_V2 ? 'v2-read' : 'read'));
    if (WRITE_ACTIONS.has(action)) {
      if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Write actions require POST' });
      if (req.signedScope !== 'write') return res.status(403).json({ success: false, message: 'This link is read-only' });
    }

    const ctx = { resourceId, action, body: req.body || {}, query: req.query || {} };
    const result =
      category === ApiServiceCategory.CODE_SHARE ? await handleCodeShareAction(ctx as never)
      : category === ApiServiceCategory.CODE_SHARE_V2 ? await handleCodeShareV2Action(ctx as never)
      : null;
    if (!result) return res.status(400).json({ success: false, message: `Category '${category}' is not supported` });

    return res.json({ success: true, message: result.message || 'Success', data: result.data });
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    const status = /not found/i.test(message) ? 404 : /invalid|required|not supported|exceeds/i.test(message) ? 400 : 500;
    res.status(status).json({ success: false, message: status === 500 ? 'Internal error' : message });
  }
};
