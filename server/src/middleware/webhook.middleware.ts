import type { Request, Response, NextFunction } from 'express';
import { verifyIdSignature } from '../utils/signature.util.js';
import { Integration } from '../models/integration.model.js';


/**
 * Middleware to verify the ID signature in the URL path.
 * Used for user-specific webhooks that don't pass HMAC in headers.
 */
export const validateWebhookSignature = async (req: Request, res: Response, next: NextFunction) => {
  const { id, signature } = req.params;
  
  if (!id || !signature) {
    return res.status(401).json({ 
      status: 'nack', 
      reason: 'missing_signature_params' 
    });
  }

  if (typeof id !== 'string' || typeof signature !== 'string') {
    return res.status(401).json({ 
      status: 'nack', 
      reason: 'invalid_params' 
    });
  }

  try {
    const integration = await Integration.findById(id);
    if (!integration) {
      return res.status(404).json({ 
        status: 'nack', 
        reason: 'integration_not_found' 
      });
    }

    // Verify signature using the integration's updatedAt timestamp
    const timestamp = integration.updatedAt.getTime().toString();
    if (!verifyIdSignature(id, signature, timestamp)) {
      return res.status(401).json({ 
        status: 'nack', 
        reason: 'bad_url_signature' 
      });
    }

    if (!integration.isActive) {
      return res.status(403).json({ 
        status: 'nack', 
        reason: 'integration_inactive' 
      });
    }

    // Attach to request
    (req as any).integration = integration;
    next();
  } catch (error) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error during validation' 
    });
  }
};

