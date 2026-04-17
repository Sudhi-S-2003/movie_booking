import { Link } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { motion } from 'framer-motion';

interface TagCloudProps {
  tags: string[];
  variant?: 'blue' | 'pink' | 'white';
  showHash?: boolean;
}

export const TagCloud = ({ tags, variant = 'pink', showHash = true }: TagCloudProps) => {
  const colorMap = {
    blue: 'text-accent-blue bg-accent-blue/5 border-accent-blue/10 hover:bg-accent-blue/10',
    pink: 'text-accent-pink bg-accent-pink/5 border-accent-pink/10 hover:bg-accent-pink/10',
    white: 'text-white bg-white/5 border-white/10 hover:bg-white/10'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
        
        return (
          <motion.div
            key={tag}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              to={`/hashtag/${cleanTag}`}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${colorMap[variant]}`}
            >
              {showHash && <Hash size={10} className="stroke-[3]" />}
              {cleanTag.replace(/_/g, ' ')}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};
