import React from "react";
import { AtSign, Hash } from "lucide-react";

interface MentionChipProps {
  text: string;
  type: "mention" | "hashtag";
  href: string;
  isOwn?: boolean;
}

export const MentionChip: React.FC<MentionChipProps> = ({ text, type, href, isOwn }) => {
  const isMention = type === "mention";
  const Icon = isMention ? AtSign : Hash;
  const label = text.replace(/^[@#]/, "");

  return (
    <a
      href={href}
      target={isMention ? undefined : "_self"}
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md text-[10px] font-bold no-underline transition-all duration-150 hover:brightness-125 ${
        isOwn
          ? "bg-white/[0.08] hover:bg-white/[0.15] text-white/90"
          : isMention
            ? "bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/15"
            : "bg-accent-pink/10 hover:bg-accent-pink/20 text-accent-pink border border-accent-pink/15"
      }`}
    >
      <Icon size={9} strokeWidth={2.5} className="opacity-60" />
      <span className="tracking-tight">{label}</span>
    </a>
  );
};
