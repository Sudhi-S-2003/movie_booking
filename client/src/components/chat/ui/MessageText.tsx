import React, { memo } from 'react';
import Linkify from 'linkify-react';
import 'linkify-plugin-hashtag';
import 'linkify-plugin-mention';
import { resolveSocialLink } from '../../../utils/social-resolver.js';
import { LinkChip, MentionChip, SocialChip } from './index.js';

interface MessageTextProps {
  text: string;
  isOwn?: boolean;
}

const SOCIAL_MENTION_RE = /(@[\w-]+:[\w-]+)/g;

/**
 * Rich message text renderer with:
 * - Markdown support (**bold**, *italic*, ~strike~, `code`)
 * - Linkification (URLs, hashtags, mentions)
 * - Social chips (@github:user, etc.)
 * - Safety (no dangerouslySetInnerHTML)
 */
export const MessageText = memo(({ text, isOwn }: MessageTextProps) => {
  // Step 1: Split by social mentions first (like support version)
  const parts = text.split(SOCIAL_MENTION_RE);

  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) => {
        if (part.match(/^@[\w-]+:[\w-]+$/)) {
          return <SocialChip key={i} mention={part} isOwn={isOwn} />;
        }

        // Step 2: For other parts, apply Markdown + Linkify
        return (
          <Linkify
            key={i}
            options={{
              attributes: { target: '_blank', rel: 'noopener noreferrer' },
              validate: {
                url: (value: string) => /^(https?:\/\/)/.test(value),
              },
              formatHref: {
                mention: (href: string) => resolveSocialLink(href),
                hashtag: (href: string) => `/hashtag/${href.substring(1)}`,
              },
              render: {
                url: ({ attributes, content }) => (
                  <LinkChip href={attributes.href} text={content} isOwn={isOwn} />
                ),
                mention: ({ attributes, content }) => (
                  <MentionChip text={content} type="mention" href={attributes.href} isOwn={isOwn} />
                ),
                hashtag: ({ attributes, content }) => (
                  <MentionChip text={content} type="hashtag" href={attributes.href} isOwn={isOwn} />
                ),
              },
            }}
          >
            {formatRichContent(part)}
          </Linkify>
        );
      })}
    </div>
  );
});

MessageText.displayName = 'MessageText';

/**
 * Internal React-based formatter for:
 * **bold**, *italic*, ~strike~, `code`
 */
function formatRichContent(text: string): React.ReactNode[] {
  // Order of operations: Code -> Bold -> Italic -> Strike
  // We'll use a recursive splitting approach or a sequential regex replace that returns components.
  
  let nodes: React.ReactNode[] = [text];

  // 1. Code (` `)
  nodes = nodes.flatMap(node => {
    if (typeof node !== 'string') return node;
    const parts = node.split(/(`.+?`)/g);
    return parts.map((p, idx) => {
      if (p.startsWith('`') && p.endsWith('`')) {
        return <code key={idx} className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono">{p.slice(1, -1)}</code>;
      }
      return p;
    });
  });

  // 2. Bold (** **)
  nodes = nodes.flatMap(node => {
    if (typeof node !== 'string') return node;
    const parts = node.split(/(\*\*.+?\*\*)/g);
    return parts.map((p, idx) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={idx} className="font-bold">{p.slice(2, -2)}</strong>;
      }
      return p;
    });
  });

  // 3. Italic (* *)
  nodes = nodes.flatMap(node => {
    if (typeof node !== 'string') return node;
    // Regex for single asterisk but NOT double asterisk
    const parts = node.split(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g);
    // Note: split with capturing group in regex returns the groups too.
    // For italics, we need to be careful. Let's use a simpler split for demo.
    const results: React.ReactNode[] = [];
    let lastIndex = 0;
    const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    let match;
    while ((match = italicRegex.exec(node)) !== null) {
      results.push(node.substring(lastIndex, match.index));
      results.push(<em key={match.index} className="italic">{match[1]}</em>);
      lastIndex = italicRegex.lastIndex;
    }
    results.push(node.substring(lastIndex));
    return results;
  });

  // 4. Strike (~ ~)
  nodes = nodes.flatMap(node => {
    if (typeof node !== 'string') return node;
    const results: React.ReactNode[] = [];
    let lastIndex = 0;
    const strikeRegex = /~(.+?)~/g;
    let match;
    while ((match = strikeRegex.exec(node)) !== null) {
      results.push(node.substring(lastIndex, match.index));
      results.push(<del key={match.index} className="line-through opacity-50">{match[1]}</del>);
      lastIndex = strikeRegex.lastIndex;
    }
    results.push(node.substring(lastIndex));
    return results;
  });

  return nodes;
}
