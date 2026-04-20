import { Router } from 'express';
import { isAuthenticated, optionalAuthenticate } from '../middleware/auth.middleware.js';
import {
  getConversations,
  createConversation,
  getConversation,
  getConversationMembers,
  updateConversation,
  addParticipants,
  removeParticipant,
  getMessages,
  sendMessage,
  deleteMessage,
  markMessagesRead,
  getUnreadCounts,
  searchUsers,
} from '../controllers/chat.controller.js';
import {
  getPublicConversation,
  setPublicName,
  createJoinRequest,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  createInviteLink,
  listInviteLinks,
  revokeInviteLink,
  getInviteByToken,
  acceptInvite,
} from '../controllers/chatPublic.controller.js';
import {
  longtextStart,
  longtextChunk,
  longtextComplete,
  getMessageChunkNext,
} from '../controllers/chat/longtext.controller.js';

const router = Router();

// ─── Public / optional-auth surface ──────────────────────────────────────────
// Social resolver and invite preview must work for anonymous visitors so the
// frontend can decide whether to redirect to /login. `optionalAuthenticate`
// populates req.user if a valid token is present, otherwise leaves it undefined.

router.get('/public/:publicName', optionalAuthenticate, getPublicConversation);
router.get('/invites/:token',     optionalAuthenticate, getInviteByToken);

// ─── Authenticated surface ───────────────────────────────────────────────────

router.use(isAuthenticated);

// Conversations
router.get('/conversations',               getConversations);
router.post('/conversations',              createConversation);
router.get('/conversations/:id',           getConversation);
router.get('/conversations/:id/members',   getConversationMembers);
router.patch('/conversations/:id',         updateConversation);
router.post('/conversations/:id/participants',                addParticipants);
router.delete('/conversations/:id/participants/:userId',      removeParticipant);

// Public name (slug) — owner only, enforced in the handler.
router.post('/conversations/:id/public-name', setPublicName);

// Join requests
router.post('/conversations/:id/join-requests',                     createJoinRequest);
router.get('/conversations/:id/join-requests',                      listJoinRequests);
router.post('/conversations/:id/join-requests/:requestId/approve',  approveJoinRequest);
router.post('/conversations/:id/join-requests/:requestId/reject',   rejectJoinRequest);

// Invite links
router.post('/conversations/:id/invites',                createInviteLink);
router.get('/conversations/:id/invites',                 listInviteLinks);
router.delete('/conversations/:id/invites/:inviteId',    revokeInviteLink);

// Accept invite — authenticated users only.
router.post('/invites/:token/accept', acceptInvite);

// Messages
router.get('/conversations/:id/messages',                     getMessages);
router.post('/conversations/:id/messages',                    sendMessage);
router.delete('/conversations/:id/messages/:messageId',       deleteMessage);
router.post('/conversations/:id/messages/read',               markMessagesRead);

// Longtext (chunked upload of messages > 1000 chars).
router.post('/longtext/start',                                longtextStart);
router.post('/longtext/chunk',                                longtextChunk);
router.post('/conversations/:id/messages/longtext',           longtextComplete);
router.get('/messages/:messageId/chunks/next/:chunkId',       getMessageChunkNext);

// Unread
router.get('/unread-counts', getUnreadCounts);

// User search (for starting new chats)
router.get('/users/search', searchUsers);

export default router;
