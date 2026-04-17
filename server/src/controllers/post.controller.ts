import type { Response } from 'express';
import mongoose from 'mongoose';
import { Post } from '../models/post.model.js';
import { PostLike } from '../models/postLike.model.js';
import { Hashtag } from '../models/hashtag.model.js';
import { User } from '../models/user.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { toSlug } from '../utils/slug.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getHashtagNamespace } from '../socket/index.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { hydrateAuthors } from '../utils/hydration.js';
import { enqueueNotification } from '../queues/notification.queue.js';

// GET /api/hashtags/:slug/posts?sort=latest|top|most_commented
export const listPostsForHashtag = async (req: AuthRequest, res: Response) => {
  try {
    const slug = toSlug(String(req.params.slug ?? ''));
    const page = parsePage(req);
    const sort = (req.query.sort as string) || 'latest';

    const sortSpec: Record<string, 1 | -1> =
      sort === 'top'
        ? { likeCount: -1, createdAt: -1 }
        : sort === 'most_commented'
          ? { commentCount: -1, createdAt: -1 }
          : { pinned: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Post.find({ hashtags: slug }).sort(sortSpec).skip(page.skip).limit(page.limit).lean(),
      Post.countDocuments({ hashtags: slug }),
    ]);

    const hydrated = await hydrateAuthors(items);

    let likedSet = new Set<string>();
    if (req.user?._id && hydrated.length) {
      const likes = await PostLike.find({
        userId: req.user._id,
        postId: { $in: hydrated.map((p) => p._id) },
      }).lean();
      likedSet = new Set(likes.map((l) => String(l.postId)));
    }

    const posts = hydrated.map((p) => ({ ...p, liked: likedSet.has(String(p._id)) }));

    res.status(200).json({
      success:    true,
      posts,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// ── View-count rate limiter (1 count per visitor per post per 30 min) ────────
const recentViews = new Map<string, number>();
const VIEW_COOLDOWN = 30 * 60 * 1000; // 30 minutes

// Clean stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentViews) {
    if (now - ts > VIEW_COOLDOWN) recentViews.delete(key);
  }
}, 10 * 60 * 1000);

// GET /api/posts/:id
export const getPost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = String(req.params.id);
    const viewerKey = req.user?._id
      ? `u:${req.user._id}:${postId}`
      : `ip:${req.ip ?? 'unknown'}:${postId}`;

    const lastView = recentViews.get(viewerKey);
    const shouldCount = !lastView || Date.now() - lastView > VIEW_COOLDOWN;

    const post = shouldCount
      ? await Post.findByIdAndUpdate(postId, { $inc: { viewCount: 1 } }, { returnDocument: 'after' }).lean()
      : await Post.findById(postId).lean();

    if (shouldCount) recentViews.set(viewerKey, Date.now());

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const [hydrated] = await hydrateAuthors([post]);
    let liked = false;
    if (req.user?._id) {
      liked = !!(await PostLike.findOne({ userId: req.user._id, postId: post._id }).lean());
    }
    res.status(200).json({ success: true, post: { ...hydrated, liked } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// POST /api/posts
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, content, imageUrl, hashtags = [] } = req.body as {
      title: string;
      content: string;
      imageUrl?: string;
      hashtags?: string[];
    };

    if (!title || !content) {
      res.status(400).json({ success: false, message: 'title and content required' });
      return;
    }

    const slugs = Array.from(new Set((hashtags || []).map(toSlug).filter(Boolean)));
    const excerpt = content.length > 200 ? content.slice(0, 200) + '…' : content;

    const post = await Post.create({
      authorId: req.user._id,
      title,
      content,
      excerpt,
      hashtags: slugs,
      ...(imageUrl ? { imageUrl } : {}),
    });

    await User.updateOne({ _id: req.user._id }, { $inc: { postCount: 1 } });

    // upsert hashtags and bump counts
    if (slugs.length) {
      await Hashtag.bulkWrite(
        slugs.map((slug) => ({
          updateOne: {
            filter: { slug },
            update: {
              $setOnInsert: { name: slug, slug },
              $inc: { postCount: 1, trendingScore: 10 },
              $set: { lastActiveAt: new Date() },
            },
            upsert: true,
          },
        })),
      );
    }

    const [hydrated] = await hydrateAuthors([(post as any).toObject()]);

    // emit to hashtag rooms
    try {
      const ns = getHashtagNamespace();
      for (const slug of slugs) {
        ns.to(`hashtag:${slug}`).emit('post:new', { slug, post: hydrated });
      }
    } catch {
      // socket not yet initialized — skip broadcast
    }

    res.status(201).json({ success: true, post: hydrated });

    // ── Async notifications (fire-and-forget, failures don't affect response) ──
    const authorName = req.user.name || 'Someone';
    const postText = content;
    const postId = String(post._id);

    // Notify followers of the author
    void enqueueNotification({
      type:       'new_post_by_followed_user',
      postId,
      authorId:   String(req.user._id),
      authorName,
      postText,
    });

    // Notify followers of each hashtag
    if (slugs.length) {
      const hashtagDocs = await Hashtag.find({ slug: { $in: slugs } }).select('_id slug').lean();
      for (const ht of hashtagDocs) {
        void enqueueNotification({
          type:       'new_post_in_followed_hashtag',
          postId,
          hashtagId:  String(ht._id),
          hashtagTag: ht.slug,
          authorName,
          postText,
        });
      }
    }
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// PATCH /api/posts/:id — author-only update
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const post = await Post.findById(String(req.params.id));
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    const body = req.body as { title?: string; content?: string; imageUrl?: string; hashtags?: string[] };
    if (body.title !== undefined) post.title = body.title;
    if (body.content !== undefined) {
      post.content = body.content;
      post.excerpt = body.content.length > 200 ? body.content.slice(0, 200) + '…' : body.content;
    }
    if (body.imageUrl !== undefined) post.imageUrl = body.imageUrl;
    if (body.hashtags !== undefined) {
      post.hashtags = Array.from(new Set(body.hashtags.map(toSlug).filter(Boolean)));
    }
    await post.save();
    const [hydrated] = await hydrateAuthors([(post as any).toObject()]);
    res.status(200).json({ success: true, post: hydrated });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// DELETE /api/posts/:id — author-only delete
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const post = await Post.findById(String(req.params.id));
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    await Post.deleteOne({ _id: post._id });
    await PostLike.deleteMany({ postId: post._id });
    await User.updateOne({ _id: post.authorId }, { $inc: { postCount: -1 } });
    if (post.hashtags?.length) {
      await Hashtag.updateMany(
        { slug: { $in: post.hashtags } },
        { $inc: { postCount: -1 } },
      );
    }
    res.status(200).json({ success: true, deleted: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// POST /api/posts/:id/like
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = new mongoose.Types.ObjectId(String(req.params.id));
    const existing = await PostLike.findOne({ userId: req.user._id, postId });

    let liked: boolean;
    let likeCount: number;
    if (existing) {
      await PostLike.deleteOne({ _id: existing._id });
      const updated = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likeCount: -1 } },
        { returnDocument: 'after' },
      ).lean();
      liked = false;
      likeCount = updated?.likeCount ?? 0;
    } else {
      await PostLike.create({ userId: req.user._id, postId });
      const updated = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likeCount: 1 } },
        { returnDocument: 'after' },
      ).lean();
      liked = true;
      likeCount = updated?.likeCount ?? 0;
    }

    // broadcast
    try {
      const ns = getHashtagNamespace();
      const post = await Post.findById(postId).select('hashtags').lean();
      for (const slug of post?.hashtags ?? []) {
        ns.to(`hashtag:${slug}`).emit('post:liked', {
          slug,
          postId: String(postId),
          likeCount,
          liked,
          userId: String(req.user._id),
        });
      }
    } catch {
      // socket not yet initialized — skip broadcast
    }

    res.status(200).json({ success: true, liked, likeCount });

    // Notify post author when someone likes their post (not self-likes)
    if (liked) {
      const fullPost = await Post.findById(postId).select('authorId title').lean();
      if (fullPost && String(fullPost.authorId) !== String(req.user._id)) {
        void enqueueNotification({
          type: 'post_liked',
          postId: String(postId),
          authorId: String(fullPost.authorId),
          likerName: req.user.name || 'Someone',
          postTitle: fullPost.title || 'Untitled',
        });
      }
    }
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
