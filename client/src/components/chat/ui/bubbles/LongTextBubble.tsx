import React, { memo, useCallback, useState } from 'react';
import { MessageText } from '../MessageText.js';
import { ReplyPreview } from '../ReplyPreview.js';
import { chatApi } from '../../../../services/api/chat.api.js';
import { useChat } from '../../context/ChatContext.js';
import type { ChatMessage } from '../../types.js';

interface LongTextBubbleProps {
  msg:               ChatMessage;
  isOwn:             boolean;
  isSameGroupPrev:   boolean;
  showDateSeparator: boolean;
  isFailed:          boolean;
  onJumpToMessage?:  (messageId: string) => void;
}

interface LoadedChunk {
  id:           string;
  content:      string;
  nextChunkId:  string | null;
}

/**
 * Hook that tracks lazy-loaded chunks for a longtext message. Walks the linked
 * list one fetch at a time; `loadAll` loops until `nextChunkId === null`.
 */
const useLongtextChunks = (msg: ChatMessage) => {
  const { guestSession } = useChat();
  const [chunks,  setChunks]  = useState<LoadedChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const nextId = chunks.length === 0
    ? msg.startChunkId ?? null
    : chunks[chunks.length - 1]!.nextChunkId;

  // Route chunk fetches through the signed-URL endpoint when the viewer is a
  // guest — the authed `/chat/messages/:id/chunks/next/...` path rejects
  // unauthenticated traffic, so without this the "Show more" button stalls.
  const fetchChunk = useCallback(
    (chunkId: string) =>
      guestSession
        ? chatApi.getGuestMessageChunk(
            msg.conversationId,
            msg._id,
            chunkId,
            guestSession,
          )
        : chatApi.getMessageChunk(msg._id, chunkId),
    [guestSession, msg.conversationId, msg._id],
  );

  const loadNext = useCallback(async (): Promise<boolean> => {
    if (!nextId || loading) return false;
    setLoading(true);
    try {
      const { content, nextChunkId } = await fetchChunk(nextId);
      setChunks((prev) => [...prev, { id: nextId, content, nextChunkId }]);
      return Boolean(nextChunkId);
    } catch (e) {
      console.error('[LongTextBubble] loadNext failed:', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [nextId, loading, fetchChunk]);

  const loadAll = useCallback(async () => {
    let cursorId: string | null = nextId;
    if (!cursorId) return;
    setLoading(true);
    try {
      const acc: LoadedChunk[] = [];
      while (cursorId) {
        // Sequential — keeps memory + order deterministic. N is small (a 1MB
        // message is 100 chunks max, well under the socket/http budget).
         
        const { content, nextChunkId }: { content: string; nextChunkId: string | null } =
          await fetchChunk(cursorId);
        acc.push({ id: cursorId, content, nextChunkId });
        cursorId = nextChunkId;
      }
      setChunks((prev) => [...prev, ...acc]);
    } catch (e) {
      console.error('[LongTextBubble] loadAll failed:', e);
    } finally {
      setLoading(false);
    }
  }, [nextId, fetchChunk]);

  const reset = useCallback(() => setChunks([]), []);

  return { chunks, loading, loadNext, loadAll, reset };
};

/**
 * Bubble for `contentType === 'longtext'`. The preview slice (first 1000
 * chars) is persisted on `msg.text` and renders immediately; the remainder is
 * fetched on demand via the chunk API.
 */
export const LongTextBubble = memo(({
  msg,
  isOwn,
  isSameGroupPrev,
  showDateSeparator,
  isFailed,
  onJumpToMessage,
}: LongTextBubbleProps) => {
  const { chunks, loading, loadNext, reset } = useLongtextChunks(msg);

  const previewLen = msg.text.length;
  const full       = msg.fullLength ?? previewLen;
  const hidden     = Math.max(0, full - previewLen);
  const expanded   = chunks.length > 0;
  const hasMore    = expanded
    ? Boolean(chunks[chunks.length - 1]!.nextChunkId)
    : hidden > 0;

  return (
    <div
      className={`relative min-w-0 overflow-hidden px-3.5 py-2.5 text-[12px] leading-snug break-words [overflow-wrap:anywhere] [&_a]:break-all transition-transform duration-200 ${
        isOwn ? 'hover:-translate-y-0.5' : ''
      } ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-2xl rounded-br-md shadow-2xl shadow-indigo-900/50 ring-1 ring-inset ring-white/[0.15]'
          : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] text-gray-200 rounded-2xl rounded-bl-md backdrop-blur-2xl shadow-lg shadow-black/20'
      } ${
        isSameGroupPrev && !showDateSeparator
          ? isOwn ? 'rounded-tr-md' : 'rounded-tl-md'
          : ''
      } ${isFailed ? 'ring-2 ring-red-500/50' : ''}`}
    >
      {msg.replyTo && (
        <ReplyPreview
          senderName={msg.replyTo.senderName}
          text={msg.replyTo.text}
          isOwn={isOwn}
          onClick={onJumpToMessage ? () => onJumpToMessage(msg.replyTo!.messageId) : undefined}
        />
      )}

      <MessageText text={msg.text} isOwn={isOwn} />

      {chunks.map((c) => (
        <div
          key={c.id}
          className="mt-1 animate-[fadeIn_240ms_ease-out]"
          style={{ animation: 'fadeIn 240ms ease-out' }}
        >
          <MessageText text={c.content} isOwn={isOwn} />
        </div>
      ))}

      {(hasMore || expanded) && (
        <div className="mt-2 flex items-center gap-2">
          {hasMore ? (
            <button
              type="button"
              onClick={() => void loadNext()}
              disabled={loading}
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                isOwn
                  ? 'bg-white/[0.15] hover:bg-white/[0.22] text-white/90'
                  : 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Loading…'
                : expanded
                  ? 'Show more'
                  : `+ ${hidden.toLocaleString()} more characters`}
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                isOwn
                  ? 'bg-white/[0.15] hover:bg-white/[0.22] text-white/90'
                  : 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70'
              }`}
            >
              Show less
            </button>
          )}
          {loading && (
            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/40'}`}>
              fetching…
            </span>
          )}
        </div>
      )}
    </div>
  );
});

LongTextBubble.displayName = 'LongTextBubble';
