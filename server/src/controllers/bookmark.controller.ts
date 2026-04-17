import type { Response } from 'express';
import mongoose from 'mongoose';
import { Bookmark } from '../models/bookmark.model.js';
import { Post } from '../models/post.model.js';
import { User } from '../models/user.model.js';
import { PostLike } from '../models/postLike.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';

// POST /api/posts/:id/bookmark — toggle
export const toggleBookmark = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = new mongoose.Types.ObjectId(String(req.params.id));
    const existing = await Bookmark.findOne({ userId: req.user._id, postId });

    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      res.status(200).json({ success: true, bookmarked: false });
      return;
    }

    await Bookmark.create({ userId: req.user._id, postId });
    res.status(200).json({ success: true, bookmarked: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/bookmarks — self only
export const listBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const target = await User.findOne({
      $or: [{ username: handle }, { _id: mongoose.Types.ObjectId.isValid(handle) ? handle : null }],
    }).lean();
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!req.user?._id || req.user._id.toString() !== target._id.toString()) {
      res.status(403).json({ success: false, message: 'Bookmarks are private' });
      return;
    }

    const page = parsePage(req);
    const [rows, total] = await Promise.all([
      Bookmark.find({ userId: target._id }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
      Bookmark.countDocuments({ userId: target._id }),
    ]);

    const postIds = rows.map((b) => b.postId);
    const posts = await Post.find({ _id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((p) => [String(p._id), p]));

    // hydrate authors + liked status
    const authorIds = [...new Set(posts.map((p) => String(p.authorId)))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select('name username avatar role')
      .lean();
    const authorMap = new Map(authors.map((u) => [String(u._id), u]));

    let likedSet = new Set<string>();
    if (postIds.length) {
      const likes = await PostLike.find({
        userId: target._id,
        postId: { $in: postIds },
      }).lean();
      likedSet = new Set(likes.map((l) => String(l.postId)));
    }

    const items = rows.flatMap((b) => {
      const post = postMap.get(String(b.postId));
      if (!post) return [];
      return [{
        ...post,
        author: authorMap.get(String(post.authorId)) ?? null,
        liked: likedSet.has(String(post._id)),
        bookmarked: true,
        bookmarkedAt: b.createdAt,
      }];
    });

    res.status(200).json({
      success:    true,
      posts:      items,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
