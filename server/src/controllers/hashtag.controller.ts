import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Hashtag } from '../models/hashtag.model.js';
import { Post } from '../models/post.model.js';
import { HashtagFollow } from '../models/hashtagFollow.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { toSlug } from '../utils/slug.utils.js';

// GET /api/hashtags/trending?limit=10
export const getTrending = async (req: Request, res: Response) => {
  try {
    const page = parsePage(req);
    const [items, total] = await Promise.all([
      Hashtag.find().sort({ trendingScore: -1, postCount: -1 }).skip(page.skip).limit(page.limit).lean(),
      Hashtag.countDocuments(),
    ]);
    res.status(200).json({
      success:    true,
      hashtags:   items,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/hashtags?search=foo
export const listHashtags = async (req: Request, res: Response) => {
  try {
    const page = parsePage(req);
    const search = (req.query.search as string) || '';
    const filter: Record<string, unknown> = {};
    if (search) filter.slug = { $regex: toSlug(search), $options: 'i' };

    const [items, total] = await Promise.all([
      Hashtag.find(filter).sort({ postCount: -1 }).skip(page.skip).limit(page.limit).lean(),
      Hashtag.countDocuments(filter),
    ]);
    res.status(200).json({
      success:    true,
      hashtags:   items,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/hashtags/:slug
export const getHashtag = async (req: AuthRequest, res: Response) => {
  try {
    const slug = toSlug(String(req.params.slug ?? ''));
    const hashtag = await Hashtag.findOneAndUpdate(
      { slug },
      { $inc: { viewCount: 1 }, $set: { lastActiveAt: new Date() } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    ).lean();

    let isFollowing = false;
    if (req.user?._id) {
      const follow = await HashtagFollow.findOne({
        userId: req.user._id,
        hashtagId: hashtag._id,
      }).lean();
      isFollowing = !!follow;
    }

    res.status(200).json({ success: true, hashtag, isFollowing });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/hashtags/:slug/related
export const getRelatedHashtags = async (req: Request, res: Response) => {
  try {
    const slug = toSlug(String(req.params.slug ?? ''));
    const limit = Math.min(20, parseInt((req.query.limit as string) || '8', 10) || 8);

    // Find hashtags that co-occur in posts with this slug
    const related = await Post.aggregate([
      { $match: { hashtags: slug } },
      { $unwind: '$hashtags' },
      { $match: { hashtags: { $ne: slug } } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'hashtags',
          localField: '_id',
          foreignField: 'slug',
          as: 'hashtag',
        },
      },
      { $unwind: { path: '$hashtag', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$hashtag._id',
          slug: '$_id',
          name: { $ifNull: ['$hashtag.name', '$_id'] },
          postCount: { $ifNull: ['$hashtag.postCount', '$count'] },
          color: { $ifNull: ['$hashtag.color', '#6366f1'] },
          coOccurrence: '$count',
        },
      },
    ]);

    res.status(200).json({ success: true, related });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// POST /api/hashtags/:slug/follow
export const followHashtag = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = toSlug(String(req.params.slug ?? ''));
    const hashtag = await Hashtag.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name: req.params.slug, slug } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );

    const existing = await HashtagFollow.findOne({
      userId: req.user._id,
      hashtagId: hashtag._id,
    });

    if (existing) {
      await HashtagFollow.deleteOne({ _id: existing._id });
      await Hashtag.updateOne({ _id: hashtag._id }, { $inc: { followerCount: -1 } });
      res.status(200).json({ success: true, following: false });
      return;
    }

    await HashtagFollow.create({
      userId: req.user._id,
      hashtagId: hashtag._id,
      hashtagSlug: slug,
    });
    await Hashtag.updateOne({ _id: hashtag._id }, { $inc: { followerCount: 1 } });
    res.status(200).json({ success: true, following: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/hashtags/:slug/stats — light stats only (for socket warm-start)
export const getHashtagStats = async (req: Request, res: Response) => {
  try {
    const slug = toSlug(String(req.params.slug ?? ''));
    const hashtag = await Hashtag.findOne({ slug }).select(
      'name slug postCount followerCount viewCount trendingScore color',
    ).lean();
    if (!hashtag) {
      res.status(404).json({ success: false, message: 'Hashtag not found' });
      return;
    }
    res.status(200).json({ success: true, hashtag });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// Helper used by seed / tests
export const ensureHashtagsForSlugs = async (slugs: string[]) => {
  const normalized = Array.from(new Set(slugs.map(toSlug).filter(Boolean)));
  if (normalized.length === 0) return;
  const ops = normalized.map((slug) => ({
    updateOne: {
      filter: { slug },
      update: { $setOnInsert: { slug, name: slug } },
      upsert: true,
    },
  }));
  await Hashtag.bulkWrite(ops);
};

