import { useState } from 'react';
import { motion } from 'framer-motion';
import { postsApi } from '../../services/api/index.js';
import type { Post } from '../../services/api/posts.api.js';
import { useAuthStore } from '../../store/authStore.js';
import { toSlug } from './utils.js';

interface HashtagComposerProps {
  slug:            string;
  defaultHashtags: string[];
  onClose:         () => void;
  onCreated:       (p: Post) => void;
}

export const HashtagComposer = ({
  slug,
  defaultHashtags,
  onClose,
  onCreated,
}: HashtagComposerProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState(defaultHashtags.join(' '));
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const hashtags = tagsText
        .split(/[\s,]+/)
        .map((t) => toSlug(t))
        .filter(Boolean);
      if (!hashtags.includes(slug)) hashtags.push(slug);
      const res = await postsApi.create({
        title:   title.trim(),
        content: content.trim(),
        hashtags,
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      });
      onCreated(res.post);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-background border border-white/10 p-8"
      >
        <h2 className="text-2xl font-black text-white mb-6">New post in #{slug}</h2>
        {!user && (
          <p className="mb-4 text-sm text-red-400">You must be logged in to post.</p>
        )}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-accent-pink"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts…"
          rows={6}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 mb-4 resize-none focus:outline-none focus:border-accent-pink"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-accent-pink"
        />
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="Hashtags (space separated)"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-accent-pink"
        />
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-full text-gray-400 hover:text-white font-bold text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !user || !title.trim() || !content.trim()}
            className="px-6 py-2 rounded-full bg-accent-pink text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
