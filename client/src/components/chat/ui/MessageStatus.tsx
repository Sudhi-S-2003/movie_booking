import { memo } from 'react';
import type { DeliveryStatus } from '../types.js';

interface MessageStatusProps {
  status?:    DeliveryStatus;
  isSending?: boolean;
  isFailed?:  boolean;
}

export const MessageStatus = memo(({ status, isSending, isFailed }: MessageStatusProps) => {
  if (isFailed) {
    return (
      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6m0-6l6 6" />
      </svg>
    );
  }

  if (isSending) {
    return (
      <svg className="w-3 h-3 text-white/20 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  if (status === 'read') {
    return (
      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l5.5 5.5L18 7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l5.5 5.5L23 7" />
      </svg>
    );
  }

  // Sent (single check)
  return (
    <svg className="w-3 h-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
});

MessageStatus.displayName = 'MessageStatus';
