import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface ReviewStatsProps {
  stats: any;
  accentColor: string;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({ stats, accentColor }) => {
  const breakdownData = Array.from({ length: 10 }, (_, i) => {
    const stars = 10 - i;
    const item = stats.breakdown?.find((b: any) => b._id === stars);
    return { stars, count: item?.count || 0 };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
      {/* Main Stats */}
      <div className="md:col-span-4 bg-white/[0.03] border border-white/5 rounded-[40px] p-10 flex flex-col items-center justify-center text-center space-y-6">
        <div>
          <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Average Rating</h3>
          <p className="text-7xl font-black text-white tracking-tighter">{stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}</p>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
            <div key={s} className="relative">
              <Star size={12} className="text-gray-800" fill="none" />
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ 
                  width: stats.averageRating >= s 
                    ? '100%' 
                    : stats.averageRating >= s - 0.5 
                      ? '50%' 
                      : '0%' 
                }}
              >
                <Star size={12} className="text-yellow-500" fill="currentColor" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stats.totalReviews} Verified Reviews</p>
      </div>

      {/* Breakdown Bars */}
      <div className="md:col-span-8 bg-white/[0.03] border border-white/5 rounded-[40px] p-10 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xs font-black text-white uppercase tracking-widest">Rating Distribution</h4>
          <div className="h-px flex-1 bg-white/5 mx-6" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
          {breakdownData.map(({ stars, count }) => {
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-4 group">
                <span className="w-4 text-[10px] font-black text-gray-500 group-hover:text-white transition-colors">{stars}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full bg-${accentColor}/60 group-hover:bg-${accentColor} transition-colors`}
                  />
                </div>
                <span className="w-8 text-[10px] font-black text-gray-600 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
