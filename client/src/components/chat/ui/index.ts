// Barrel for chat UI primitives. Re-exports only the subset consumed either
// by the thread + composer (`../components/Message*.tsx`) or by sibling UI
// files (`MessageText.tsx` imports chips from here). Everything else is
// imported via its direct path.
export { MessageBubble }      from './MessageBubble.js';
export { PaginationShimmer }  from './PaginationShimmer.js';
export { TypingIndicator }    from './TypingIndicator.js';
export { ReplyPreview }       from './ReplyPreview.js';
export { EmojiPicker }        from './EmojiPicker.js';
export { QuickSuggestions }   from './QuickSuggestions.js';
export { ThreadInput }        from './ThreadInput.js';

// Inline chips used by MessageText for rendering @mentions, #hashtags and URL
// previews inside a text bubble.
export { LinkChip }    from './LinkChip.js';
export { MentionChip } from './MentionChip.js';
export { SocialChip }  from './SocialChip.js';
