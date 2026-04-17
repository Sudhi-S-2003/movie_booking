import React from "react";
import { ExternalLink } from "lucide-react";
import { extractDomain } from "../../../utils/social-resolver.js";

interface LinkChipProps {
  href: string;
  text: string;
  isOwn?: boolean;
}

export const LinkChip: React.FC<LinkChipProps> = ({ href, text, isOwn }) => {
  const domain = extractDomain(href);
  const display = text.length > 45 ? text.substring(0, 45) + "…" : text;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-[10px] font-medium no-underline transition-all duration-150 ${
        isOwn
          ? "bg-white/[0.08] hover:bg-white/[0.15] text-white/90 underline decoration-white/20 underline-offset-2"
          : "bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/15"
      }`}
    >
      <ExternalLink size={9} className="flex-shrink-0 opacity-60" />
      <span className="truncate max-w-[200px]">{display}</span>
      <span className={`text-[8px] opacity-40 flex-shrink-0 hidden sm:inline`}>
        {domain}
      </span>
    </a>
  );
};
