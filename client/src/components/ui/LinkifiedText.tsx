import Linkify from 'linkify-react';
import 'linkify-plugin-hashtag';
import 'linkify-plugin-mention';

/**
 * LinkifiedText — renders user-generated text with smart auto-linking.
 *
 *   - URLs           → <a href=...>
 *   - #hashtag       → /hashtag/<slug>
 *   - @mention       → /user/<username>
 *
 * All links open in the same tab for internal routes, and a new tab for
 * external URLs. The `slug` passed to hashtags strips the leading `#` so it
 * plugs straight into the existing `/hashtag/:tag` route.
 */
export const LinkifiedText = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => {
  const options = {
    defaultProtocol: 'https',
    target: (_href: string, type: string) =>
      type === 'url' ? '_blank' : '_self',
    rel: 'noopener noreferrer',
    formatHref: {
      hashtag: (href: string) => `/hashtag/${href.replace(/^#/, '').toLowerCase()}`,
      mention: (href: string) => `/user/${href.replace(/^@/, '').toLowerCase()}`,
    },
    className: {
      url:     'text-accent-blue hover:underline break-words',
      hashtag: 'text-accent-pink font-bold hover:underline',
      mention: 'text-accent-blue font-bold hover:underline',
      email:   'text-accent-blue hover:underline',
    },
  } as const;

  return (
    <span className={className}>
      <Linkify options={options}>{children}</Linkify>
    </span>
  );
};
