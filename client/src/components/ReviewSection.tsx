import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReviews } from '../hooks/useReviews.js';
import { useAuthStore } from '../store/authStore.js';
import { ReviewCard } from './review/ReviewCard.js';
import { ReviewStats } from './review/ReviewStats.js';
import { ReviewModal } from './review/ReviewModal.js';

interface ReviewSectionProps {
  targetId: string;
  targetType: 'Movie' | 'Theatre';
  targetName?: string;
  split?: boolean;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ targetId, targetType, targetName, split = false }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { 
    reviews, 
    stats, 
    pagination, 
    isLoading, 
    page, 
    setPage, 
    sort,
    setSort,
    submitReview, 
    isSubmitting 
  } = useReviews(targetId, targetType);

  const accentColor = targetType === 'Movie' ? 'accent-pink' : 'accent-blue';
  const shadowColor = targetType === 'Movie' ? 'shadow-accent-pink/20' : 'shadow-accent-blue/20';

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const handleReviewSubmit = async (reviewData: { rating: number; comment: string }) => {
    try {
      await submitReview(reviewData);
      setIsOverlayOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Floating Action Button */}
      {isAuthenticated && (
        <div className="fixed bottom-8 right-8 z-50">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOverlayOpen(true)}
            className={`w-16 h-16 bg-${accentColor} text-white rounded-full flex items-center justify-center shadow-2xl ${shadowColor} border border-white/20 group relative`}
          >
            <div className="absolute -inset-2 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <MessageSquare size={24} className="relative z-10" />
          </motion.button>
        </div>
      )}

      {/* Review Modal Component */}
      <ReviewModal 
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        targetName={targetName || (targetType === 'Movie' ? 'Movie' : 'Cinema')}
        targetType={targetType}
        accentColor={accentColor}
        isSubmitting={isSubmitting}
        onSubmit={handleReviewSubmit}
      />

      {/* Top Section: Standard Stats & Breakdown */}
      <ReviewStats stats={stats} accentColor={accentColor} />

      {/* Middle Bar: Sorting & Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white/[0.03] border border-white/5 rounded-[32px] p-6 gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-gray-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sort By</span>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'highest', label: 'Highest' },
              { id: 'lowest', label: 'Lowest' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSort(opt.id as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sort === opt.id ? `bg-white/10 text-white shadow-lg` : 'text-gray-500 hover:text-white'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isAuthenticated && (
          <button 
            onClick={() => setIsOverlayOpen(true)}
            className={`w-full sm:w-auto px-10 py-4 bg-${accentColor} text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl ${shadowColor}`}
          >
            Write Review
          </button>
        )}
      </div>

      {/* Bottom Section: Reviews Feed */}
      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/5 h-64 rounded-[48px]" />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <motion.div 
              key={`${page}-${sort}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {reviews.map((review) => (
                <ReviewCard key={review._id} review={review} />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-32 bg-white/[0.02] rounded-[60px] border border-dashed border-white/10">
              <MessageSquare size={64} className="text-gray-800 mx-auto mb-6 opacity-30" />
              <p className="text-gray-500 font-black text-2xl italic opacity-50 uppercase tracking-[0.2em]">No reviews yet</p>
            </div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-8">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white disabled:opacity-20 hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-black text-white text-sm uppercase tracking-widest">
              Page {page} <span className="text-gray-500">of</span> {pagination.totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white disabled:opacity-20 hover:bg-white/10 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
