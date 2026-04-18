import type { NextFunction, Request, Response } from "express";
import { verifyKey } from "../services/apiKey/apiKey.service.js";
import { User } from "../models/user.model.js";
import { Conversation } from "../models/chat.model.js";
import { verifyConversationSignature } from "../utils/signature.util.js";


export const isAuthenticatedApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {

    const { apiKey, apiSecret } = req.body || {}


    const isKeyValid = await verifyKey(apiKey, apiSecret);
    if (!isKeyValid.ok) {
        return res.status(401).json({ success: false, message: 'Invalid API key or secret' });
    }

    const user = await User.findById(isKeyValid.userId);
    if (!user) {
        return res.status(401).json({ success: false, message: 'API key owner not found' });
    }

    req.user = user as any; // Cast to any to satisfy Express.Request augmentation if needed, though globally defined
    next();

}

/**
 * Middleware for external users accessing a chat via a signed URL.
 * Verifies the hmac signature and expiration.
 */
export const isChatSignatureValid = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.params.id as string | undefined;
        const { signature, expiresAt } = req.query;

        if (!id || !signature || !expiresAt) {
            return res.status(401).json({ success: false, message: 'Signature parameters missing' });
        }

        const isValid = verifyConversationSignature(id, String(signature), Number(expiresAt));
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid or expired signature' });
        }

        const conversation = await Conversation.findById(id).lean();
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Attach external user info to the request so guest-facing controllers
        // can identify the sender without re-loading the conversation.
        if (conversation.externalUser?.name) {
          req.externalUser = {
            name:  conversation.externalUser.name,
            ...(conversation.externalUser.email && { email: conversation.externalUser.email }),
          };
        }

        next();
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal auth error' });
    }
}