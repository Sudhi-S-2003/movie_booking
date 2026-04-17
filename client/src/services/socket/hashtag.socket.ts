import { createSocket } from './connection.js';
import type { Post } from '../api/posts.api.js';
import type { Hashtag } from '../api/hashtags.api.js';

type Listener = () => void;

interface State {
  viewers: number;
  newPosts: Post[];                 // posts that arrived after we loaded the page
  likes: Record<string, { likeCount: number; liked?: boolean }>;
  stats: Hashtag | null;
  typing: string | null;
}

class HashtagSocketService {
  private socket = createSocket('/hashtag');
  private listeners: Set<Listener> = new Set();
  private slug: string | null = null;
  private state: State = { viewers: 0, newPosts: [], likes: {}, stats: null, typing: null };
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.socket.on('hashtag:viewers', ({ slug, viewers }: { slug: string; viewers: number }) => {
      if (slug !== this.slug) return;
      this.state = { ...this.state, viewers };
      this.notify();
    });

    this.socket.on('hashtag:stats', ({ slug, hashtag }: { slug: string; hashtag: Hashtag }) => {
      if (slug !== this.slug) return;
      this.state = { ...this.state, stats: hashtag };
      this.notify();
    });

    this.socket.on('post:new', ({ slug, post }: { slug: string; post: Post }) => {
      if (slug !== this.slug) return;
      this.state = { ...this.state, newPosts: [post, ...this.state.newPosts] };
      this.notify();
    });

    this.socket.on(
      'post:liked',
      ({
        slug,
        postId,
        likeCount,
        liked,
      }: { slug: string; postId: string; likeCount: number; liked: boolean }) => {
        if (slug !== this.slug) return;
        this.state = {
          ...this.state,
          likes: { ...this.state.likes, [postId]: { likeCount, liked } },
        };
        this.notify();
      },
    );

    this.socket.on('hashtag:typing', ({ slug, userName }: { slug: string; userName?: string }) => {
      if (slug !== this.slug) return;
      this.state = { ...this.state, typing: userName ?? 'Someone' };
      if (this.typingTimer) clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(() => {
        this.state = { ...this.state, typing: null };
        this.notify();
      }, 2500);
      this.notify();
    });
  }

  join(slug: string) {
    if (!this.socket.connected) this.socket.connect();
    if (this.slug && this.slug !== slug) {
      this.socket.emit('leave', { slug: this.slug });
    }
    this.slug = slug;
    this.state = { viewers: 0, newPosts: [], likes: {}, stats: null, typing: null };
    this.socket.emit('join', { slug });
    this.notify();
  }

  leave() {
    if (this.slug) this.socket.emit('leave', { slug: this.slug });
    this.slug = null;
  }

  sendTyping(userName?: string) {
    if (!this.slug) return;
    this.socket.emit('typing', { slug: this.slug, userName });
  }

  /** Caller can consume and clear the buffered "new posts since load" list. */
  drainNewPosts(): Post[] {
    const drained = this.state.newPosts;
    this.state = { ...this.state, newPosts: [] };
    this.notify();
    return drained;
  }

  getSnapshot() {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const hashtagSocket = new HashtagSocketService();
