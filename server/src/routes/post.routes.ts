import express from 'express';
import type { RequestHandler } from 'express';
import { getPost, createPost, toggleLike, updatePost, deletePost } from '../controllers/post.controller.js';
import { toggleBookmark } from '../controllers/bookmark.controller.js';
import { listComments, listReplies, createComment, updateComment, deleteComment, toggleCommentLike } from '../controllers/comment.controller.js';
import { isAuthenticated, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:id',              optionalAuthenticate as RequestHandler, getPost as RequestHandler);
router.post('/',                isAuthenticated as RequestHandler, createPost as RequestHandler);
router.patch('/:id',            isAuthenticated as RequestHandler, updatePost as RequestHandler);
router.delete('/:id',           isAuthenticated as RequestHandler, deletePost as RequestHandler);
router.post('/:id/like',        isAuthenticated as RequestHandler, toggleLike as RequestHandler);
router.post('/:id/bookmark',    isAuthenticated as RequestHandler, toggleBookmark as RequestHandler);

router.get('/:id/comments',     optionalAuthenticate as RequestHandler, listComments as RequestHandler);
router.post('/:id/comments',    isAuthenticated as RequestHandler, createComment as RequestHandler);
router.get('/comments/:commentId/replies', optionalAuthenticate as RequestHandler, listReplies as RequestHandler);
router.patch('/comments/:commentId',  isAuthenticated as RequestHandler, updateComment as RequestHandler);
router.delete('/comments/:commentId', isAuthenticated as RequestHandler, deleteComment as RequestHandler);
router.post('/comments/:commentId/like', isAuthenticated as RequestHandler, toggleCommentLike as RequestHandler);

export default router;
