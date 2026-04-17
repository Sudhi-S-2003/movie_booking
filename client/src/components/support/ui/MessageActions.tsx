import React, { useState, useEffect, useRef } from "react";
import { Copy, Reply, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MessageActionsProps {
  text: string;
  isOwn: boolean;
  onReply: () => void;
  menuPos: { x: number; y: number } | null;
  onCloseMenu: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  text,
  isOwn,
  onReply,
  menuPos,
  onCloseMenu,
}) => {
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {  }
    onCloseMenu();
  };

  const handleReply = () => {
    onReply();
    onCloseMenu();
  };

  useEffect(() => {
    if (!menuPos) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu();
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuPos, onCloseMenu]);

  useEffect(() => {
    if (!menuPos) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseMenu(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuPos, onCloseMenu]);

  return (
    <>
      {}
      <div
        className={`absolute -top-1 ${isOwn ? "right-full mr-1" : "left-full ml-1"} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 z-20`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="w-5 h-5 flex items-center justify-center rounded bg-white/5 border border-white/10 text-white/25 hover:text-white hover:bg-white/10 transition-all"
          title="Copy"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleReply(); }}
          className="w-5 h-5 flex items-center justify-center rounded bg-white/5 border border-white/10 text-white/25 hover:text-white hover:bg-white/10 transition-all"
          title="Reply"
        >
          <Reply size={10} />
        </button>
      </div>

      {}
      <AnimatePresence>
        {menuPos && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[200] bg-[#111113] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[140px] backdrop-blur-xl"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              onClick={handleReply}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Reply size={13} className="text-violet-400" />
              Reply
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {copied ? (
                <Check size={13} className="text-green-400" />
              ) : (
                <Copy size={13} className="text-white/40" />
              )}
              {copied ? "Copied!" : "Copy text"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
