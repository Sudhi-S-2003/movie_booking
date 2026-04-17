export interface SocialMeta {
  platform: string;
  displayName: string;
  username: string;
  url: string;
  color: string;
  iconName: string;
}

interface PlatformConfig {
  url: string;
  color: string;
  icon: string;
  displayName: string;
  aliases?: string[];
}

const PLATFORMS: Record<string, PlatformConfig> = {
  github: {
    url: "https://github.com/",
    color: "#2ea44f",
    icon: "Github",
    displayName: "GitHub",
  },
  linkedin: {
    url: "https://linkedin.com/in/",
    color: "#0077b5",
    icon: "Linkedin",
    displayName: "LinkedIn",
    aliases: ["in"],
  },
  x: {
    url: "https://x.com/",
    color: "#1DA1F2",
    icon: "Twitter",
    displayName: "X",
    aliases: ["twitter"],
  },
  youtube: {
    url: "https://youtube.com/@",
    color: "#FF0000",
    icon: "Youtube",
    displayName: "YouTube",
  },
  instagram: {
    url: "https://instagram.com/",
    color: "#E1306C",
    icon: "Instagram",
    displayName: "Instagram",
    aliases: ["insta"],
  },
  facebook: {
    url: "https://facebook.com/",
    color: "#1877F2",
    icon: "Facebook",
    displayName: "Facebook",
    aliases: ["fb"],
  },
  // Internal: link to a public group chat by its publicName (slug).
  // Resolves to the in-app social page `/chat/g/:publicName` via a relative URL.
  group: {
    url: "/chat/g/",
    color: "#10b981",
    icon: "Users",
    displayName: "Group Chat",
    aliases: ["g"],
  },
};

export const getAvailablePlatforms = () => Object.keys(PLATFORMS);

export const getSocialMeta = (href: string): SocialMeta | null => {
  const value = href.startsWith("@") ? href.substring(1) : href;
  if (!value.includes(":")) return null;

  const [platformKey, rawUsername] = value.split(":");
  if (!platformKey) return null;
  const p = platformKey.toLowerCase();

  const username = rawUsername?.replace(/^[:/]+/, "").trim();
  if (!username) return null;

  const entry = Object.entries(PLATFORMS).find(
    ([key, config]) => key === p || config.aliases?.includes(p)
  );
  if (!entry) return null;

  const [, config] = entry;

  return {
    platform: p,
    displayName: config.displayName,
    username,
    url: `${config.url}${username}`,
    color: config.color,
    iconName: config.icon,
  };
};

export const resolveSocialLink = (href: string) => {
  const meta = getSocialMeta(href);
  if (meta) return meta.url;

  let value = href.startsWith("@") ? href.substring(1) : href;
  value = value.replace(/^[/]+/, "").trim();
  return `/user/${value}`;
};

export const getSocialColor = (href: string) => {
  const meta = getSocialMeta(href);
  if (!meta) return "text-accent-blue";

  const mapping: Record<string, string> = {
    github: "text-[#2ea44f]",
    linkedin: "text-[#0077b5]",
    x: "text-[#1DA1F2]",
    youtube: "text-[#FF0000]",
    instagram: "text-[#E1306C]",
    facebook: "text-[#1877F2]",
    group: "text-emerald-500",
  };

  return mapping[meta.platform] || "text-accent-blue";
};

export const extractDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url.length > 30 ? url.substring(0, 30) + "…" : url;
  }
};
