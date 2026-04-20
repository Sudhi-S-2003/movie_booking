import React, { memo } from 'react';
import { Info } from 'lucide-react';
import type { ChatMessage } from '../../types.js';

interface SystemBubbleProps {
  msg: ChatMessage;
}

/**
 * Centered pill for system-generated messages (OTPs, booking confirmations,
 * "user joined", etc.). Aligned center regardless of `isOwn`. Subtle border
 * + inset glow makes it read as non-interactive ambient text.
 */
export const SystemBubble = memo(({ msg }: SystemBubbleProps) => (
  <div className="flex justify-center my-2">
    <span className="inline-flex items-center gap-1.5 text-[11px] italic text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1 font-medium shadow-[inset_0_0_12px_rgba(255,255,255,0.03)]">
      <Info size={11} className="opacity-60" aria-hidden="true" />
      {msg.text}
    </span>
  </div>
));

SystemBubble.displayName = 'SystemBubble';
