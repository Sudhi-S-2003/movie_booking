import type { Namespace } from 'socket.io';
import { Hashtag } from '../../models/hashtag.model.js';

/**
 * Hashtag channel — live blog feed.
 *
 * Rooms
 *   hashtag:<slug> — one per hashtag page. All visitors of /hashtag/:slug join.
 *
 * Events (server → client)
 *   post:new       — a new post was created with this hashtag
 *   post:liked     — like count changed for a post in this hashtag
 *   hashtag:stats  — aggregate stats tick (viewers, postCount, etc.)
 *   hashtag:typing — someone is composing a post (presence)
 *
 * Events (client → server)
 *   join       { slug }
 *   leave      { slug }
 *   typing     { slug }
 *
 * Presence: a per-slug viewer count is maintained in-memory and broadcast on
 * join/leave so the UI can show a live "42 watching" badge.
 */

const viewerCounts = new Map<string, number>();

const bumpViewers = (slug: string, delta: number) => {
  const next = Math.max(0, (viewerCounts.get(slug) ?? 0) + delta);
  viewerCounts.set(slug, next);
  return next;
};

export const registerHashtagHandlers = (namespace: Namespace) => {
  namespace.on('connection', (socket) => {
    const joined = new Set<string>();

    socket.on('join', async ({ slug }: { slug: string }) => {
      if (!slug || typeof slug !== 'string') return;
      const room = `hashtag:${slug}`;
      socket.join(room);
      joined.add(slug);
      const viewers = bumpViewers(slug, 1);
      namespace.to(room).emit('hashtag:viewers', { slug, viewers });

      // warm-start stats
      const hashtag = await Hashtag.findOne({ slug }).select(
        'name slug postCount followerCount viewCount trendingScore',
      ).lean();
      if (hashtag) {
        socket.emit('hashtag:stats', { slug, hashtag });
      }
    });

    socket.on('leave', ({ slug }: { slug: string }) => {
      if (!slug) return;
      const room = `hashtag:${slug}`;
      socket.leave(room);
      joined.delete(slug);
      const viewers = bumpViewers(slug, -1);
      namespace.to(room).emit('hashtag:viewers', { slug, viewers });
    });

    socket.on('typing', ({ slug, userName }: { slug: string; userName?: string }) => {
      if (!slug) return;
      socket.to(`hashtag:${slug}`).emit('hashtag:typing', { slug, userName });
    });

    socket.on('disconnect', () => {
      for (const slug of joined) {
        const viewers = bumpViewers(slug, -1);
        namespace.to(`hashtag:${slug}`).emit('hashtag:viewers', { slug, viewers });
      }
      joined.clear();
    });
  });
};
