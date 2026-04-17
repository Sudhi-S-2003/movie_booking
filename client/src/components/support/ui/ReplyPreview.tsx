import React from "react";
import { Reply, X } from "lucide-react";

interface ReplyPreviewProps {
  senderName: string;
  text: string;
  onDismiss?: () => void;
  compact?: boolean;
  isOwn?: boolean;
  onClick?: () => void;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  senderName,
  text,
  onDismiss,
  compact = false,
  isOwn = false,
  onClick,
}) => {
  if (compact) {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={(e) => {
          if (onClick) {
            e.stopPropagation();
            onClick();
          }
        }}
        onKeyDown={(e) => {
          if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.stopPropagation();
            onClick();
          }
        }}
        className={`flex items-start gap-1.5 px-2.5 py-1.5 mb-1.5 rounded-lg border-l-2 transition-colors ${
          onClick ? "cursor-pointer hover:bg-white/[0.08]" : ""
        } ${
          isOwn
            ? "bg-white/10 border-white/30"
            : "bg-white/[0.04] border-accent-blue/40"
        }`}
      >
        <Reply size={9} className={`mt-0.5 flex-shrink-0 ${isOwn ? "text-white/50" : "text-accent-blue/50"}`} />
        <div className="min-w-0">
          <span className={`text-[8px] font-bold uppercase tracking-wider block ${isOwn ? "text-white/50" : "text-accent-blue/60"}`}>
            {senderName}
          </span>
          <span className={`text-[10px] line-clamp-1 block ${isOwn ? "text-white/60" : "text-white/30"}`}>
            {text}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg">
      <div className="w-0.5 h-8 bg-accent-blue rounded-full flex-shrink-0" />
      <Reply size={12} className="text-accent-blue/50 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-[8px] font-bold text-accent-blue/70 uppercase tracking-wider block">
          Replying to {senderName}
        </span>
        <span className="text-[10px] text-white/40 line-clamp-1 block">{text}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-all flex-shrink-0"
        >
          <X size={12} className="text-white/30" />
        </button>
      )}
    </div>
  );
};
