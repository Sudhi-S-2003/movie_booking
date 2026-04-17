import React, { memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageActions } from "./MessageActions.js";
import { ReplyPreview } from "./ReplyPreview.js";
import { MessageText } from "./MessageText.js";
import { MessageStatus } from "./MessageStatus.js";
import type { IssueMessage } from "../types.js";


export interface MessageBubbleProps {
  msg: IssueMessage;
  isOwn: boolean;
  isSameGroupPrev: boolean;
  isSameGroupNext: boolean;
  showDateSeparator: boolean;
  dateLabel: string;
  isSending?: boolean;
  isHighlighted?: boolean;
  onReply?: (msg: IssueMessage) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export const MessageBubble = memo(
  ({
    msg,
    isOwn,
    isSameGroupPrev,
    isSameGroupNext,
    showDateSeparator,
    dateLabel,
    isSending,
    isHighlighted,
    onReply,
    onJumpToMessage,
  }: MessageBubbleProps) => {
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
    const closeMenu = useCallback(() => setMenuPos(null), []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuPos({ x: e.clientX, y: e.clientY });
    }, []);

    return (
      <React.Fragment>
        { }
        {showDateSeparator && (
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
              {dateLabel}
            </span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
        )}

        { }
        <motion.div
          data-msg-id={msg._id}
          initial={{ opacity: 0, y: 4 }}
          animate={{
            opacity: isSending ? 0.6 : 1,
            y: 0,
            backgroundColor: isHighlighted ? "rgba(139,92,246,0.15)" : "rgba(0,0,0,0)",
          }}
          transition={{ duration: isHighlighted ? 0.3 : 0.15 }}
          className={`flex items-end gap-2.5 rounded-xl px-1 -mx-1 ${isOwn ? "flex-row-reverse" : "flex-row"} ${isSameGroupPrev && !showDateSeparator ? "mt-0.5" : "mt-4"
            }`}
        >
          { }
          <div className="w-7 h-7 flex-shrink-0">
            {!isSameGroupNext && (
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isOwn
                    ? "bg-gradient-to-br from-violet-600/90 to-indigo-700/90 shadow-sm shadow-violet-500/15"
                    : "bg-white/10 border border-white/10"
                  }`}
              >
                {msg.senderName?.[0]?.toUpperCase() || (isOwn ? "Y" : "U")}
              </div>
            )}
          </div>

          { }
          <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
            { }
            {!isSameGroupPrev && (
              <span
                className={`text-[8px] font-bold uppercase tracking-widest mb-1 px-1 ${isOwn ? "text-violet-300/70" : "text-white/30"
                  }`}
              >
                {msg.senderName}
              </span>
            )}

            { }
            <div className="relative group/bubble" onContextMenu={!isSending ? handleContextMenu : undefined}>
              { }
              {!isSending && onReply && (
                <MessageActions
                  text={msg.text}
                  isOwn={isOwn}
                  onReply={() => onReply(msg)}
                  menuPos={menuPos}
                  onCloseMenu={closeMenu}
                />
              )}

              <div
                className={`relative px-3.5 py-2.5 text-[12px] leading-relaxed ${isOwn
                    ? "bg-gradient-to-br from-violet-600/80 to-indigo-700/80 text-white/95 rounded-2xl rounded-br-md shadow-lg shadow-violet-900/20"
                    : "bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-2xl rounded-bl-md"
                  } ${isSameGroupPrev && !showDateSeparator
                    ? isOwn
                      ? "rounded-tr-md"
                      : "rounded-tl-md"
                    : ""
                  }`}
              >
                { }
                {msg.replyTo && (
                  <ReplyPreview
                    senderName={msg.replyTo.senderName}
                    text={msg.replyTo.text}
                    compact
                    isOwn={isOwn}
                    onClick={onJumpToMessage ? () => onJumpToMessage(msg.replyTo?.messageId || '') : undefined}
                  />
                )}

                <MessageText text={msg.text} isOwn={isOwn} />
              </div>
            </div>

            { }
            {!isSameGroupNext && (
              <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                <span className="text-[8px] font-medium text-white/25 tabular-nums">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {isOwn && (
                  <MessageStatus
                    status={msg.deliveryStatus}
                    isSending={isSending}
                    isFailed={msg._status === "failed"}
                  />
                )}
                <span
                  className={`text-[7px] font-bold px-1.5 py-px rounded ${isOwn
                      ? "text-violet-300/50 bg-violet-500/10"
                      : "text-white/20 bg-white/[0.03]"
                    } uppercase tracking-wider`}
                >
                  {msg.senderRole}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </React.Fragment>
    );
  }
);

MessageBubble.displayName = "MessageBubble";
