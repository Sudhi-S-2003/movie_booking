import { Hashtag } from '../../models/hashtag.model.js';
import { Post } from '../../models/post.model.js';
import { PostLike } from '../../models/postLike.model.js';
import { HashtagFollow } from '../../models/hashtagFollow.model.js';
import { Comment } from '../../models/comment.model.js';
import { User } from '../../models/user.model.js';
import { UserRole } from '../../constants/enums.js';
import { hashtagsSeedData } from '../seedData/hashtags.data.js';
import { postTemplates } from '../seedData/posts.data.js';
import { log, shuffle, randomInt, pick, toTag } from './helpers.js';
import type { UserDoc } from './users.js';
import type { MovieDoc } from './movies.js';

// ── Comment templates ────────────────────────────────────────────────────────

const commentTexts = [
  'Great review! Totally agree with your take on this movie.',
  'I had a completely different experience watching this. Interesting perspective though.',
  'This is one of the best posts on this topic. Well written!',
  'I watched this last weekend and loved every minute of it.',
  'The cinematography alone makes this worth watching. Nice breakdown!',
  'Disagree with the rating but respect the detailed analysis.',
  'Anyone else think the ending was rushed? Otherwise solid film.',
  'Been waiting for someone to write about this. Thanks for sharing!',
  'Just added this to my watchlist based on your review.',
  'The director really outdid themselves with this one.',
  'This review captures exactly what I felt walking out of the theatre.',
  'Unpopular opinion: I think this movie is overrated.',
  'Would love to see a follow-up review after a second viewing.',
  'The soundtrack deserves its own post honestly.',
  'Perfect weekend movie recommendation. Thanks!',
  'I cried during the third act. No spoilers but wow.',
  'Saw this in IMAX and it was a game changer.',
  'Your writing style makes these reviews so enjoyable to read.',
  'Can you do a review of the prequel next?',
  'This is why I follow this hashtag. Quality content!',
];

const replyTexts = [
  'Totally agree with you!',
  'Good point, I hadn\'t thought of it that way.',
  'Haha same here!',
  'This is exactly what I was thinking.',
  'Thanks for the recommendation!',
  'I\'ll have to rewatch it with this in mind.',
  'Well said!',
  'Couldn\'t have said it better myself.',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Insert the curated hashtag list with randomized view/trending counts. */
const insertHashtags = async () =>
  Hashtag.insertMany(
    hashtagsSeedData.map((h) => ({
      ...h,
      postCount:     0,
      followerCount: 0,
      viewCount:     randomInt(100, 5000),
      trendingScore: randomInt(10, 200),
      lastActiveAt:  new Date(),
    })),
  );

/** Pick a realistic set of hashtag slugs for a single post. */
const slugsForMovie = (
  movie: MovieDoc,
  hashtagBySlug: Map<string, unknown>,
): string[] => {
  const tags = new Set<string>(['cinema', 'reviews']);
  movie.genres.forEach((g: string) => {
    const t = toTag(g);
    if (hashtagBySlug.has(t)) tags.add(t);
  });
  const langSlug = toTag(movie.language);
  if (hashtagBySlug.has(langSlug)) tags.add(langSlug);
  if (Math.random() > 0.6) tags.add('imax');
  if (Math.random() > 0.7) tags.add('movienight');
  if (Math.random() > 0.8) tags.add('behindthescenes');
  return [...tags];
};

/** Generate the post row set (not yet inserted). */
const buildPostRows = (
  movies: MovieDoc[],
  customers: UserDoc[],
  hashtagBySlug: Map<string, unknown>,
) => {
  const rows: Array<Record<string, unknown>> = [];
  for (const movie of movies.slice(0, 30)) {
    const count = randomInt(2, 4);
    for (let i = 0; i < count; i++) {
      const template = pick(postTemplates);
      const { title, content } = template(movie);
      const author = pick(customers);
      rows.push({
        authorId:     author._id,
        title,
        content,
        excerpt:      content.slice(0, 180),
        imageUrl:     movie.backdropUrl,
        hashtags:     slugsForMovie(movie, hashtagBySlug),
        likeCount:    randomInt(0, 120),
        commentCount: 0, // will be backfilled after seeding comments
        viewCount:    randomInt(20, 2000),
        pinned:       false,
      });
    }
  }
  return rows;
};

/** Seed comments for every post. Returns total comments created. */
const seedComments = async (
  posts: Array<{ _id: any }>,
  customers: UserDoc[],
): Promise<number> => {
  const commentRows: Array<Record<string, unknown>> = [];
  const replyRows: Array<{ parentIndex: number; row: Record<string, unknown> }> = [];

  for (const post of posts) {
    const numComments = randomInt(1, 8);
    const commenters = shuffle(customers).slice(0, numComments);

    for (const commenter of commenters) {
      commentRows.push({
        postId:    post._id,
        userId:    commenter._id,
        text:      pick(commentTexts),
        likeCount: randomInt(0, 15),
      });

      // ~30% chance of a reply on this comment
      if (Math.random() > 0.7) {
        replyRows.push({
          parentIndex: commentRows.length - 1,
          row: {
            postId:    post._id,
            userId:    pick(customers)._id,
            text:      pick(replyTexts),
            likeCount: randomInt(0, 5),
            // parentId will be filled after insertion
          },
        });
      }
    }
  }

  // Insert top-level comments
  const insertedComments = await Comment.insertMany(commentRows);

  // Build reply rows with parentId pointing to actual inserted comment _id
  const replyInserts = replyRows
    .map((r) => {
      const parent = insertedComments[r.parentIndex];
      if (!parent) return null;
      return { ...r.row, parentId: parent._id };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (replyInserts.length) {
    await Comment.insertMany(replyInserts);
  }

  const totalComments = insertedComments.length + replyInserts.length;

  // Backfill accurate commentCount on each post
  for (const post of posts) {
    const count = await Comment.countDocuments({ postId: post._id });
    await Post.updateOne({ _id: post._id }, { $set: { commentCount: count } });
  }

  return totalComments;
};

// ── Main ─────────────────────────────────────────────────────────────────────

export const seedHashtagsAndPosts = async (
  users: UserDoc[],
  movies: MovieDoc[],
) => {
  log('🏷️ ', 'Seeding hashtags and posts...');

  const hashtagDocs = await insertHashtags();
  const hashtagBySlug = new Map(hashtagDocs.map((h) => [h.slug, h]));

  const customers = users.filter((u) => u.role === UserRole.USER);
  const postRows = buildPostRows(movies, customers, hashtagBySlug);
  const createdPosts = await Post.insertMany(postRows);

  // Recount hashtag postCount from the actual posts
  for (const tag of hashtagDocs) {
    const count = createdPosts.filter((p) =>
      (p.hashtags as string[]).includes(tag.slug),
    ).length;
    await Hashtag.updateOne(
      { _id: tag._id },
      {
        $set: {
          postCount:     count,
          trendingScore: count * 5 + randomInt(10, 60),
          lastActiveAt:  new Date(),
        },
      },
    );
  }

  // Seed real comments for every post
  const postsForComments = createdPosts.map((p) => ({ _id: p._id }));
  const totalComments = await seedComments(postsForComments, customers);

  // Sprinkle some random likes so the UI has real data
  const likeRows: Array<Record<string, unknown>> = [];
  for (const post of createdPosts) {
    const likers = shuffle(customers).slice(
      0,
      randomInt(0, Math.min(3, customers.length)),
    );
    for (const liker of likers) {
      likeRows.push({ userId: liker._id, postId: post._id });
    }
  }
  if (likeRows.length) {
    try {
      await PostLike.insertMany(likeRows, { ordered: false });
    } catch {
      /* ignore dup key from random collisions */
    }
  }

  // Each customer follows 2-4 hashtags
  const followRows: Array<Record<string, unknown>> = [];
  for (const user of customers) {
    const chosen = shuffle(hashtagDocs).slice(0, randomInt(2, 4));
    for (const tag of chosen) {
      followRows.push({ userId: user._id, hashtagId: tag._id, hashtagSlug: tag.slug });
    }
  }
  if (followRows.length) {
    try {
      await HashtagFollow.insertMany(followRows, { ordered: false });
    } catch {
      /* ignore */
    }
  }

  // Backfill user.postCount
  for (const user of users) {
    const count = createdPosts.filter(
      (p) => String(p.authorId) === String(user._id),
    ).length;
    if (count > 0) {
      await User.updateOne({ _id: user._id }, { $set: { postCount: count } });
    }
  }

  log(
    '✅',
    `${hashtagDocs.length} hashtags, ${createdPosts.length} posts, ${totalComments} comments, ${likeRows.length} likes, ${followRows.length} follows seeded`,
  );
};
