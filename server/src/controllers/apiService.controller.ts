import type { Request, Response } from 'express';
import { getErrorMessage } from '../utils/error.utils.js';
import { signApiService } from '../utils/signature.util.js';
import { env } from '../env.js';
import { handleCodeShareAction, createCodeShare } from '../services/codeShare/codeShare.service.js';
import { generateSignedUrlData } from '../utils/apiService.util.js';


/**
 * Internal helper to extract and validate the category from the request.
 */
const getValidatedCategory = (req: Request) => {
  const category = (req.params.category || req.body.category || req.apiKeyCategory || req.apiServiceCategory) as string;
  if (!category) return { error: { status: 400, message: 'Category is required' } };

  if (req.apiKeyCategory && req.apiKeyCategory !== category) {
    return {
      error: {
        status: 403,
        message: `This API key is only authorized for category '${req.apiKeyCategory}', but '${category}' was requested.`
      }
    };
  }
  return { category };
};

/**
 * POST /api/public/api-service/:category/signed-url
 */
export const getSignedApiServiceUrl = async (req: Request, res: Response) => {
  try {
    const { resourceId, expiryMinutes } = req.body;
    if (!resourceId) return res.status(400).json({ success: false, message: 'Resource ID is required' });

    const { category, error } = getValidatedCategory(req);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const data = generateSignedUrlData(resourceId, category!, expiryMinutes);
    res.status(200).json({ success: true, data });
  } catch (e: unknown) {
    res.status(400).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/public/api-service/:category
 */
export const createApiServiceResource = async (req: Request, res: Response) => {
  try {
    const result = getValidatedCategory(req);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    const category = result.category;

    if (category === 'code-share') {
      if (!req.apiKeyId) return res.status(401).json({ success: false, message: 'API key required to create' });
      
      const { title, code, expiresAt, expiryMinutes } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'Title required' });

      let computedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
      if (!computedExpiresAt && expiryMinutes) {
        computedExpiresAt = new Date(Date.now() + expiryMinutes * 60000);
      }

    const data: any = await createCodeShare(String(req.user?._id), {
        title,
        code: code || '',
        expiresAt: computedExpiresAt
      });

      const resourceId = String(data._id);
      const signedData = generateSignedUrlData(resourceId, category, req.body.expiryMinutes);

      return res.status(201).json({
        success: true,
        message: 'Resource created',
        data: { resourceId, ...signedData },
      });
    }

    res.status(400).json({ success: false, message: `Category '${category}' is not supported yet` });
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    if (message.toLowerCase().includes('not found')) {
      return res.status(404).json({ success: false, message });
    }
    res.status(500).json({ success: false, message });
  }
};


/**
 * GET /api/public/api-service/:category/:id
 */
export const getApiServiceResource = async (req: Request, res: Response) => {
  try {
    const resourceId = req.apiServiceId || req.params.id;
    if (!resourceId || typeof resourceId !== 'string') {
      return res.status(400).json({ success: false, message: 'Resource ID is required' });
    }

    const validation = getValidatedCategory(req);
    if (validation.error) return res.status(validation.error.status).json({ success: false, message: validation.error.message });

    const category = validation.category;

    const action = (req.query?.action || req.body?.action || 'read') as string;

    if (category === 'code-share') {
      const result = await handleCodeShareAction({
        resourceId,
        action,
        body: req.body || {},
        query: req.query || {},
        userId: String(req.user?._id || ''),
        apiKeyId: req.apiKeyId,
      } as any);

      return res.json({
        success: true,
        message: result.message || 'Success',
        data: result.data,
      });
    }

    res.status(400).json({ success: false, message: `Category '${category}' is not supported yet` });
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    if (message.toLowerCase().includes('not found')) {
      return res.status(404).json({ success: false, message });
    }
    res.status(500).json({ success: false, message });
  }
};
