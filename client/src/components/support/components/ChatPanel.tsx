
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useChatContext } from '../context/ChatContext.js';
import { ChatHeader } from './ChatHeader.js';
import { MessageThread } from './MessageThread.js';
import { ReplyComposer } from './ReplyComposer.js';
import type { ReplyComposerHandle } from './ReplyComposer.js';
import type { IssueMessage } from '../types.js';

export const ChatPanel: React.FC = () => {
  const { issue, adminMode, updateStatus, closeChat, setReplyingTo } = useChatContext();
  const composerRef = useRef<ReplyComposerHandle>(null);

  const handleReplyTo = (msg: IssueMessage) => {
    setReplyingTo(msg);
    composerRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col flex-1 min-h-0"
    >
      <ChatHeader
        issue={issue}
        adminMode={adminMode}
        onStatusChange={updateStatus}
        onClose={closeChat}
      />
      <MessageThread onReplyTo={handleReplyTo} />
      <ReplyComposer ref={composerRef} />
    </motion.div>
  );
};
