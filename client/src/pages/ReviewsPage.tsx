import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Film, MapPin } from 'lucide-react';
import { ReviewSection } from '../components/ReviewSection.js';
import { useMovieDetails } from '../hooks/useMovieDetails.js';
import { useTheatreDetails } from '../hooks/useTheatreDetails.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export const ReviewsPage: React.FC<{ type: 'Movie' | 'Theatre' }> = ({ type }) => {
  const { id } = useParams();
  
  // Use existing hooks to get target details for the hero
  // For movie, we don't need city or date for reviews, but the hook might require them
  const movieData = useMovieDetails(type === 'Movie' ? id : undefined, undefined, undefined);
  const theatreData = useTheatreDetails(type === 'Theatre' ? id : undefined, undefined);

  const target = type === 'Movie' ? movieData.movie : theatreData.theatre;
  const loading = type === 'Movie' ? movieData.loading : theatreData.loading;

  const title = type === 'Movie' 
    ? (target as any)?.title 
    : (target as any)?.name;

  useDocumentTitle(`${title || 'Reviews'} | CinemaConnect`);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse uppercase tracking-[0.3em]">Downloading Intelligence...</div>;
  if (!target) return <div className="min-h-screen flex items-center justify-center font-black">NODE NOT FOUND</div>;

  const backdrop = (target as any).backdropUrl;
  const subtitle = type === 'Movie' 
    ? (target as any).genres?.join(' • ') 
    : (target as any).city;

  return (
    <div className="pb-32">
      {/* Hero Section */}
      <div className="relative h-[40vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        {backdrop && (
          <img 
            src={backdrop} 
            className="w-full h-full object-cover scale-105 opacity-40 blur-sm"
            alt=""
          />
        )}
        
        <div className="absolute inset-0 z-20 flex flex-col justify-end pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <Link 
              to={type === 'Movie' ? `/movie/${id}` : `/theatre/${id}`}
              className="inline-flex items-center gap-2 text-accent-pink font-black text-xs uppercase tracking-widest mb-6 hover:translate-x-[-4px] transition-transform"
            >
              <ChevronLeft size={16} /> Back to {type}
            </Link>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  {type === 'Movie' ? <Film size={12} className="inline mr-2" /> : <MapPin size={12} className="inline mr-2" />}
                  Archive Entry
                </span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter uppercase">{title}</h1>
              <p className="text-accent-pink font-black uppercase tracking-[0.3em] text-[10px]">{subtitle}</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Reviews Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <ReviewSection 
          targetId={id!} 
          targetType={type} 
          targetName={title}
          split={true}
        />
      </div>
    </div>
  );
};
