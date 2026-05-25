import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Book, Code2, FileCode, MessageSquare, X, ChevronRight } from 'lucide-react';

interface ApiDocsSelectorModalProps {
  open: boolean;
  onClose: () => void;
}

export const ApiDocsSelectorModal = memo(({ open, onClose }: ApiDocsSelectorModalProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Calculate parent base path (e.g. /owner or /admin or /user)
  const basePath = location.pathname.substring(0, location.pathname.indexOf('/api-keys'));

  const options = [
    {
      title: 'Core Management APIs',
      desc: 'General Booking Systems. Includes credentials endpoints for theater listings, reviews, user statistics, and movies management.',
      icon: Book,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      path: `${basePath}/api-docs`
    },
    {
      title: 'Code Share V1 (Legacy)',
      desc: 'Single-file streaming signed API. Initiates a session and streams large plain text buffers using dynamic client-side chunk upload/download operations.',
      icon: Code2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      path: `${basePath}/api-docs/code-share`
    },
    {
      title: 'Code Share V2 (Git-like)',
      desc: 'Multi-file workspace repository. Full folder directories registries, delta commits additions/deletions, side-by-side diff viewers, and progress-bar based ZIP archives.',
      icon: FileCode,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      path: `${basePath}/api-docs/code-share-v2`
    },
    {
      title: 'Chat Service Docs',
      desc: 'Temporary signed links for guest rooms messaging and guest users support channel history embedding.',
      icon: MessageSquare,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      path: `${basePath}/api-docs/chat`
    }
  ];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0c0c0c] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06] shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Select API Documentation
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 font-medium">
                  Choose a service documentation package to review
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar">
              {options.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => handleSelect(opt.path)}
                  className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.05] hover:border-white/10 rounded-2xl cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex gap-4 items-start pr-4">
                    <div className={`p-3 rounded-xl border flex-shrink-0 flex items-center justify-center ${opt.color}`}>
                      <opt.icon size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-tight text-white group-hover:text-accent-blue transition-colors">
                        {opt.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-all transform group-hover:translate-x-1 flex-shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default ApiDocsSelectorModal;
