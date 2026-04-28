import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface ReviewCardProps {
  review: any;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const author = typeof review.userId === 'object' ? review.userId : null;
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/[0.03] border border-white/5 rounded-[40px] p-10 space-y-6 group hover:bg-white/[0.06] transition-all border-l-8 border-l-transparent hover:border-l-yellow-500/50 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {author?.avatar ? (
              <img src={author.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-white/5 to-white/10 flex items-center justify-center font-black text-gray-500">
                {author?.name?.[0] || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="font-black text-white text-lg tracking-tight">{author?.name || 'Anonymous'}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-2xl border border-yellow-500/10">
          <Star size={14} className="text-yellow-500" fill="currentColor" />
          <span className="text-sm font-black text-yellow-500">{review.rating}</span>
        </div>
      </div>
      <p className="text-gray-400 text-base italic leading-relaxed line-clamp-6">
        <span className="text-white/10 text-4xl font-serif leading-none inline-block align-top mr-2">"</span>
        {review.comment}
      </p>
    </motion.div>
  );
};
