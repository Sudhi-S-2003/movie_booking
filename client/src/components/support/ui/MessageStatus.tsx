import React from "react";
import { Check, CheckCheck, Loader2, AlertCircle } from "lucide-react";
import type { DeliveryStatus } from "../types.js";


export interface MessageStatusProps {
  status?: DeliveryStatus;
  isSending?: boolean;
  isFailed?: boolean;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status = "sent",
  isSending,
  isFailed,
}) => {
  if (isFailed) {
    return (
      <span className="inline-flex items-center text-red-400" title="Failed to send">
        <AlertCircle size={11} strokeWidth={2.5} />
      </span>
    );
  }
  if (isSending) {
    return (
      <span className="inline-flex items-center text-white/40" title="Sending">
        <Loader2 size={10} className="animate-spin" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="inline-flex items-center text-sky-300" title="Read">
        <CheckCheck size={12} strokeWidth={2.75} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-white/35" title="Sent">
      <Check size={11} strokeWidth={2.5} />
    </span>
  );
};
