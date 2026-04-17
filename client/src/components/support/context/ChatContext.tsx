import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuthStore } from "../../../store/authStore.js";
import { supportApi } from "../../../services/api/index.js";
import { useMessages } from "../hooks/useMessages.js";
import type { UseMessagesReturn } from "../hooks/useMessages.js";
import type { Issue, IssueMessage } from "../types.js";


interface ChatContextValue extends UseMessagesReturn {
  issue: Issue;
  adminMode: boolean;
  userRole: "User" | "TheatreOwner" | "Guest";
  replyingTo: IssueMessage | null;
  setReplyingTo: (msg: IssueMessage | null) => void;
  sendReply: (text: string) => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within <ChatProvider>");
  return ctx;
}


interface ChatProviderProps {
  issue: Issue;
  adminMode: boolean;
  onRefreshIssues: () => void;
  onClose: () => void;
  onIssueUpdate: (patch: Partial<Issue>) => void;
  anchorMessageId?: string | null;
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  issue,
  adminMode,
  onRefreshIssues,
  onClose,
  onIssueUpdate,
  anchorMessageId,
  children,
}) => {
  const { user } = useAuthStore();
  const msgHook = useMessages(issue, user?.id, anchorMessageId ?? null);
  const [replyingTo, setReplyingTo] = useState<IssueMessage | null>(null);

  const userRole: ChatContextValue["userRole"] = user
    ? user.role === "theatre_owner" ? "TheatreOwner" : "User"
    : "Guest";

  const sendReply = useCallback(async (text: string) => {
    const replyRef = replyingTo
      ? { messageId: replyingTo._id, senderName: replyingTo.senderName, text: replyingTo.text?.slice(0, 200) }
      : undefined;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: IssueMessage = {
      _id: tempId,
      text,
      senderId: user?.id,
      senderName: user?.name || "You",
      senderRole: (userRole === "TheatreOwner" ? "TheatreOwner" : user?.role === "admin" ? "Admin" : "User") as IssueMessage["senderRole"],
      isYou: true,
      _status: "sending",
      replyTo: replyRef,
      createdAt: new Date().toISOString(),
    };

    msgHook.appendOptimistic(optimistic);
    setReplyingTo(null);
    requestAnimationFrame(() => msgHook.scrollToBottom(true));

    try {
      const body = replyRef ? { text, replyTo: replyRef } : { text };
      const res = await supportApi.addReply(issue._id, body);
      msgHook.confirmOptimistic(tempId, res.message);
      onRefreshIssues();
    } catch (err) {
      msgHook.removeOptimistic(tempId);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue._id, replyingTo, user, userRole]);

  const updateStatus = useCallback(async (newStatus: string) => {
    try {
      await supportApi.updateStatus(issue._id, newStatus);
      onRefreshIssues();
      onIssueUpdate({ status: newStatus as Issue["status"] });
    } catch {
      console.error("Status update failed");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue._id]);

  const value: ChatContextValue = {
    ...msgHook,
    issue,
    adminMode,
    userRole,
    replyingTo,
    setReplyingTo,
    sendReply,
    updateStatus,
    closeChat: onClose,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
