import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetType: string;
  accentColor: string;
  isSubmitting: boolean;
  onSubmit: (review: { rating: number; comment: string }) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ 
  isOpen, 
  onClose, 
  targetName, 
  targetType, 
  accentColor, 
  isSubmitting,
  onSubmit 
}) => {
  const [newReview, setNewReview] = useState({ rating: 10, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.comment.trim()) return;
    await onSubmit(newReview);
    setNewReview({ rating: 10, comment: '' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-12"
        >
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-surface/95 border border-white/10 rounded-[48px] p-8 sm:p-12 w-full max-w-4xl relative z-10 shadow-2xl flex flex-col md:flex-row gap-12"
          >
            <div className="flex-1 space-y-8">
              <div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Share your experience</h3>
                <p className="text-gray-500 text-sm font-medium">How would you rate your time at {targetName}?</p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Rating (1-10)</span>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                        <div 
                          key={star} 
                          className="relative cursor-pointer transition-transform hover:scale-110 p-0.5"
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const isHalf = e.clientX - rect.left < rect.width / 2;
                            setNewReview({ ...newReview, rating: isHalf ? star - 0.5 : star });
                          }}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const isHalf = e.clientX - rect.left < rect.width / 2;
                            setHoverRating(isHalf ? star - 0.5 : star);
                          }}
                        >
                          <Star size={24} className="text-gray-800" fill="none" />
                          <div 
                            className="absolute inset-0.5 overflow-hidden pointer-events-none"
                            style={{ 
                              width: (hoverRating || newReview.rating) >= star 
                                ? '100%' 
                                : (hoverRating || newReview.rating) === star - 0.5 
                                  ? '50%' 
                                  : '0%' 
                            }}
                          >
                            <Star size={24} className="text-yellow-500" fill="currentColor" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="text-2xl font-black text-yellow-500 bg-yellow-500/10 px-4 py-1 rounded-2xl border border-yellow-500/10">
                      {hoverRating || newReview.rating}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Detailed Feedback</span>
                    <textarea 
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      placeholder={targetType === 'Movie' ? "Tell us about the plot, acting, and experience..." : "How were the seats, sound, and overall atmosphere?"}
                      className="w-full bg-black/40 border border-white/5 rounded-3xl p-8 text-white text-base outline-none focus:border-white/20 transition-all h-48 resize-none shadow-inner"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 bg-${accentColor} text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl disabled:opacity-50`}
                    >
                      {isSubmitting ? "Submitting..." : "Post Review"}
                    </button>
                    <button 
                      type="button"
                      onClick={onClose}
                      className="px-8 bg-white/5 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Tips Sidebar */}
            <div className="hidden md:block w-64 bg-white/5 rounded-[32px] p-8 space-y-6">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Review Tips</h4>
              <ul className="space-y-4">
                {[
                  "Be descriptive and honest",
                  "Mention specific highlights",
                  "Keep it respectful",
                  "Check for spoilers!"
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 text-xs text-gray-500 leading-relaxed font-medium">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${accentColor} mt-1 flex-shrink-0`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
