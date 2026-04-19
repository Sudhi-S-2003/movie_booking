import { Router } from 'express';
import { isAuthenticatedApiKey, isChatSignatureValid } from '../middleware/api.key.middleware.js';
import {
    getGuestConversation,
    getGuestMessages,
    sendGuestMessage,
    deleteGuestMessage,
    markGuestMessagesRead,
    getGuestSubscription,
    createChatConversation,
    getSignedChatConversation,
} from '../controllers/api.chat.controller.js';


const router = Router();


// 1. Management API (Authenticated)
router.post("/conversation", isAuthenticatedApiKey, createChatConversation);
router.post("/conversation/signed-url", isAuthenticatedApiKey, getSignedChatConversation);

// 2. Guest API (Signature Protected)

// We apply isChatSignatureValid here because it needs req.params.id 
// from the conversation/:id path segment.
router.get("/conversation/:id", isChatSignatureValid, getGuestConversation);
router.get("/conversation/:id/messages", isChatSignatureValid, getGuestMessages);
router.get("/conversation/:id/subscription", isChatSignatureValid, getGuestSubscription);
router.post("/conversation/:id/messages", isChatSignatureValid, sendGuestMessage);
router.post("/conversation/:id/messages/read", isChatSignatureValid, markGuestMessagesRead);
router.delete("/conversation/:id/messages/:messageId", isChatSignatureValid, deleteGuestMessage);

export default router;
