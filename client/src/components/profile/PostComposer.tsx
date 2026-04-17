import { useState } from 'react';
import { motion } from 'framer-motion';
import { postsApi } from '../../services/api/index.js';
import type { Post } from '../../services/api/posts.api.js';
import { inputCls } from './utils.js';

interface PostComposerProps {
  editing: Post | null;
  onClose: () => void;
  onSaved: (post: Post, mode: 'create' | 'update') => void;
}

const toSlug = (s: string) =>
  s.toLowerCase().replace(/^#+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const PostComposer = ({ editing, onClose, onSaved }: PostComposerProps) => {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [content, setContent] = useState(editing?.content ?? '');
  const [tagsText, setTagsText] = useState((editing?.hashtags ?? []).join(' '));
  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const hashtags = tagsText.split(/[\s,]+/).map(toSlug).filter(Boolean);
      const payload: { title: string; content: string; hashtags: string[]; imageUrl?: string } = {
        title:   title.trim(),
        content: content.trim(),
        hashtags,
      };
      if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();

      if (editing) {
        const res = await postsApi.update(editing._id, payload);
        onSaved(res.post, 'update');
      } else {
        const res = await postsApi.create(payload);
        onSaved(res.post, 'create');
      }
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
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-background border border-white/10 p-8 my-auto"
      >
        <h2 className="text-2xl font-black text-white mb-6">
          {editing ? 'Edit post' : 'New post'}
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className={`${inputCls} mb-4`}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts — #hashtags and @mentions supported"
          rows={6}
          className={`${inputCls} mb-4 resize-none`}
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          className={`${inputCls} mb-4`}
        />
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="Hashtags (space separated)"
          className={`${inputCls} mb-6`}
        />
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-full text-gray-400 hover:text-white font-bold text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="px-6 py-2 rounded-full bg-accent-pink text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Post'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
