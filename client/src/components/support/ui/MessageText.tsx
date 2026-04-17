import React from "react";
import Linkify from "linkify-react";
import "linkify-plugin-hashtag";
import "linkify-plugin-mention";
import { resolveSocialLink } from "../../../utils/social-resolver.js";
import { SocialChip } from "./SocialChip.js";
import { LinkChip } from "./LinkChip.js";
import { MentionChip } from "./MentionChip.js";

interface MessageTextProps {
  text: string;
  isOwn?: boolean;
}

const SOCIAL_MENTION_RE = /(@[\w-]+:[\w-]+)/g;

export const MessageText: React.FC<MessageTextProps> = ({ text, isOwn }) => (
  <div className="whitespace-pre-wrap break-words leading-relaxed">
    {text.split(SOCIAL_MENTION_RE).map((part, i) => {
      if (part.match(/^@[\w-]+:[\w-]+$/)) {
        return <SocialChip key={i} mention={part} isOwn={isOwn} />;
      }

      return (
        <Linkify
          key={i}
          options={{
            attributes: { target: "_blank", rel: "noopener noreferrer" },
            formatHref: {
              mention: (href: string) => resolveSocialLink(href),
              hashtag: (href: string) => `/hashtag/${href.substring(1)}`,
            },
            render: {
              url: ({ attributes, content }) => (
                <LinkChip
                  href={attributes.href}
                  text={content}
                  isOwn={isOwn}
                />
              ),
              mention: ({ attributes, content }) => (
                <MentionChip
                  text={content}
                  type="mention"
                  href={attributes.href}
                  isOwn={isOwn}
                />
              ),
              hashtag: ({ attributes, content }) => (
                <MentionChip
                  text={content}
                  type="hashtag"
                  href={attributes.href}
                  isOwn={isOwn}
                />
              ),
            },
          }}
        >
          {part}
        </Linkify>
      );
    })}
  </div>
);
