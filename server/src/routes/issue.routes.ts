import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  createIssue,
  getMyIssues,
  getAllIssues,
  addReply,
  updateIssueStatus,
  getIssueMessages,
  markMessagesRead,
  getUnreadCounts,
} from '../controllers/issue.controller.js';
import { isAuthenticated, isAdmin, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Support routes handle both authenticated users and guests (via optionalAuthenticate + guest session logic in controllers)
router.post('/', optionalAuthenticate as RequestHandler, createIssue as RequestHandler);
router.get('/my', optionalAuthenticate as RequestHandler, getMyIssues as RequestHandler);
router.get('/all', isAuthenticated as RequestHandler, isAdmin as RequestHandler, getAllIssues as RequestHandler);
router.get('/unread-counts', isAuthenticated as RequestHandler, getUnreadCounts as RequestHandler);
router.get('/:id/messages', optionalAuthenticate as RequestHandler, getIssueMessages as RequestHandler);
router.post('/:id/replies', optionalAuthenticate as RequestHandler, addReply as RequestHandler);
router.post('/:id/messages/read', isAuthenticated as RequestHandler, markMessagesRead as RequestHandler);
router.patch('/:id/status', optionalAuthenticate as RequestHandler, updateIssueStatus as RequestHandler);

export default router;
