import type { Response } from 'express';
import mongoose from 'mongoose';
import { Comment } from '../models/comment.model.js';
import { CommentLike } from '../models/commentLike.model.js';
import { Post } from '../models/post.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getHashtagNamespace } from '../socket/index.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { hydrateUsers } from '../utils/hydration.js';
import { enqueueNotification } from '../queues/notification.queue.js';

// GET /api/posts/:id/comments — paginated top-level comments with replyCount
// Sort: current user's comments first → most liked → most replied → newest
export const listComments = async (req: AuthRequest, res: Response) => {
  try {
    const postId = new mongoose.Types.ObjectId(String(req.params.id));
    const page = parsePage(req, 20);
    const currentUserId = req.user?._id ? new mongoose.Types.ObjectId(String(req.user._id)) : null;

    // Use aggregation for custom sort: own comments first, then likes, then date
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { postId, parentId: { $exists: false } } },
      // Lookup reply counts
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'parentId',
          pipeline: [{ $count: 'count' }],
          as: '_replyCounts',
        },
      },
      {
        $addFields: {
          replyCount: {
            $ifNull: [{ $arrayElemAt: ['$_replyCounts.count', 0] }, 0],
          },
          // Flag own comments to sort first
          _isOwn: currentUserId
            ? { $cond: [{ $eq: ['$userId', currentUserId] }, 1, 0] }
            : { $literal: 0 },
        },
      },
      { $sort: { _isOwn: -1, likeCount: -1, replyCount: -1, createdAt: -1 } },
      { $skip: page.skip },
      { $limit: page.limit },
      { $project: { _replyCounts: 0, _isOwn: 0 } },
    ];

    // If logged in, also look up which comments the user has liked
    if (currentUserId) {
      pipeline.push({
        $lookup: {
          from: 'commentlikes',
          let: { cid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$commentId', '$$cid'] }, { $eq: ['$userId', currentUserId] }] } } },
            { $limit: 1 },
          ],
          as: '_liked',
        },
      });
      pipeline.push({
        $addFields: { liked: { $gt: [{ $size: '$_liked' }, 0] } },
      });
      pipeline.push({ $project: { _liked: 0 } });
    }

    const [rows, total] = await Promise.all([
      Comment.aggregate(pipeline),
      Comment.countDocuments({ postId, parentId: { $exists: false } }),
    ]);

    const hydratedRows = await hydrateUsers(rows);

    const comments = hydratedRows.map((c: any) => ({
      ...c,
      replyCount: c.replyCount ?? 0,
      liked: c.liked ?? false,
      replies: [] as any[], // frontend loads replies on demand
    }));

    res.status(200).json({
      success:    true,
      comments,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/posts/comments/:commentId/replies — paginated replies for a comment
export const listReplies = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = new mongoose.Types.ObjectId(String(req.params.commentId));
    const page = parsePage(req, 10);
    const currentUserId = req.user?._id ? new mongoose.Types.ObjectId(String(req.user._id)) : null;

    const [rows, total] = await Promise.all([
      Comment.find({ parentId })
        .sort({ createdAt: 1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Comment.countDocuments({ parentId }),
    ]);

    // Look up liked state for replies too
    let likedSet = new Set<string>();
    if (currentUserId && rows.length > 0) {
      const replyIds = rows.map((r) => r._id);
      const likes = await CommentLike.find({
        userId: currentUserId,
        commentId: { $in: replyIds },
      }).lean();
      likedSet = new Set(likes.map((l) => String(l.commentId)));
    }

    const hydratedRows = await hydrateUsers(rows);

    const replies = hydratedRows.map((r: any) => ({
      ...r,
      liked: likedSet.has(String(r._id)),
    }));

    res.status(200).json({
      success:    true,
      replies,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// POST /api/posts/:id/comments
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = new mongoose.Types.ObjectId(String(req.params.id));
    const { text, parentId } = req.body as { text?: string; parentId?: string };

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: 'text is required' });
      return;
    }

    const post = await Post.findById(postId).lean();
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    // If replying, validate parent exists
    if (parentId) {
      const parent = await Comment.findById(parentId).lean();
      if (!parent) {
        res.status(404).json({ success: false, message: 'Parent comment not found' });
        return;
      }
    }

    const comment = await Comment.create({
      postId,
      userId: req.user._id,
      text: text.trim(),
      ...(parentId ? { parentId: new mongoose.Types.ObjectId(parentId) } : {}),
    });

    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

    const [hydrated] = await hydrateUsers([(comment as any).toObject()]);

    // Broadcast to anyone viewing the post's hashtag rooms
    try {
      const ns = getHashtagNamespace();
      if (post.hashtags?.length) {
        for (const slug of post.hashtags) {
          ns.to(`hashtag:${slug}`).emit('comment:new', {
            slug,
            postId: String(postId),
            comment: hydrated,
          });
        }
      }
    } catch {
      // socket not yet initialized — skip broadcast
    }

    res.status(201).json({ success: true, comment: { ...hydrated, liked: false } });

    // Notify post author when someone comments (not self-comments)
    if (String(post.authorId) !== String(req.user._id)) {
      void enqueueNotification({
        type: 'post_commented',
        postId: String(postId),
        authorId: String(post.authorId),
        commenterName: req.user.name || 'Someone',
        commentText: text.trim(),
        postTitle: post.title || 'Untitled',
      });
    }
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// PATCH /api/posts/comments/:commentId
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const comment = await Comment.findById(String(req.params.commentId));
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: 'text is required' });
      return;
    }

    comment.text = text.trim();
    await comment.save();

    const [hydrated] = await hydrateUsers([comment.toObject()]);
    res.status(200).json({ success: true, comment: hydrated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// DELETE /api/posts/comments/:commentId
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const comment = await Comment.findById(String(req.params.commentId));
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }
    if (
      comment.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    // Count replies to adjust commentCount properly
    const replyCount = await Comment.countDocuments({ parentId: comment._id });
    await Comment.deleteOne({ _id: comment._id });
    await Comment.deleteMany({ parentId: comment._id });
    // Clean up likes for deleted comments
    const deletedIds = [comment._id];
    if (replyCount > 0) {
      // Already deleted replies, just clean up likes
    }
    await CommentLike.deleteMany({ commentId: { $in: deletedIds } });

    await Post.updateOne(
      { _id: comment.postId },
      { $inc: { commentCount: -(1 + replyCount) } },
    );

    res.status(200).json({ success: true, deleted: true, deletedCount: 1 + replyCount });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// POST /api/posts/comments/:commentId/like — proper toggle
export const toggleCommentLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const commentId = new mongoose.Types.ObjectId(String(req.params.commentId));
    const userId = new mongoose.Types.ObjectId(String(req.user._id));

    const existing = await CommentLike.findOne({ userId, commentId });

    let liked: boolean;
    if (existing) {
      await CommentLike.deleteOne({ _id: existing._id });
      await Comment.updateOne({ _id: commentId }, { $inc: { likeCount: -1 } });
      liked = false;
    } else {
      await CommentLike.create({ userId, commentId });
      await Comment.updateOne({ _id: commentId }, { $inc: { likeCount: 1 } });
      liked = true;
    }

    const updated = await Comment.findById(commentId).lean();
    res.status(200).json({
      success: true,
      liked,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
