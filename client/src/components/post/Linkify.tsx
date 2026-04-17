import { Link } from 'react-router-dom';

// Patterns for linkification
const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
const HASHTAG_REGEX = /#([a-zA-Z0-9_-]+)/g;

interface Token {
  type: 'text' | 'url' | 'mention' | 'hashtag';
  value: string;
  raw: string;
}

function tokenize(text: string): Token[] {
  const combined = new RegExp(
    `(${URL_REGEX.source})|(${MENTION_REGEX.source})|(${HASHTAG_REGEX.source})`,
    'g',
  );

  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(combined)) {
    const idx = match.index;
    if (idx === undefined) continue;

    // Add preceding text
    if (idx > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, idx), raw: text.slice(lastIndex, idx) });
    }

    const raw = match[0];
    if (match[1]) {
      // URL
      tokens.push({ type: 'url', value: raw, raw });
    } else if (match[2]) {
      // @mention — match[3] is the username
      tokens.push({ type: 'mention', value: match[3] ?? raw.slice(1), raw });
    } else if (match[4]) {
      // #hashtag — match[5] is the tag
      tokens.push({ type: 'hashtag', value: match[5] ?? raw.slice(1), raw });
    }

    lastIndex = idx + raw.length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex), raw: text.slice(lastIndex) });
  }

  return tokens;
}

interface LinkifyProps {
  text: string;
  className?: string;
}

export const Linkify = ({ text, className }: LinkifyProps) => {
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'url':
            return (
              <a
                key={i}
                href={token.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline break-all"
              >
                {token.value.length > 50
                  ? token.value.slice(0, 47) + '...'
                  : token.value}
              </a>
            );
          case 'mention':
            return (
              <Link
                key={i}
                to={`/user/${token.value}`}
                className="text-accent-pink hover:underline font-semibold"
              >
                @{token.value}
              </Link>
            );
          case 'hashtag':
            return (
              <Link
                key={i}
                to={`/hashtag/${token.value.toLowerCase()}`}
                className="text-accent-blue hover:underline font-semibold"
              >
                #{token.value}
              </Link>
            );
          default:
            return <span key={i}>{token.value}</span>;
        }
      })}
    </span>
  );
};
