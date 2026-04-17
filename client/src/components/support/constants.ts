export const MAX_MESSAGES = 200;

export const MESSAGES_PAGE_SIZE = 20;

export const ISSUES_PAGE_SIZE = 10;

export const PRIORITY_COLORS: Record<string, string> = {
  LOW:      "text-blue-400 border-blue-400/20 bg-blue-400/10",
  MEDIUM:   "text-yellow-400 border-yellow-400/20 bg-yellow-400/10",
  HIGH:     "text-orange-400 border-orange-400/20 bg-orange-400/10",
  CRITICAL: "text-red-500 border-red-500/30 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
};

export const CATEGORIES: Record<"User" | "TheatreOwner", string[]> = {
  User: [
    "Cannot Book",
    "Auto-cancel Issue",
    "Payment Error",
    "Missing Movie (New/Upcoming)",
    "App Crash",
    "Review/Rating Issue",
    "Other",
  ],
  TheatreOwner: [
    "Theatre Add Error",
    "Show Add Error",
    "Movie Missing in Catalog",
    "Timeline Collision",
    "Screen Layout Issue",
    "Revenue Discrepancy",
    "Other",
  ],
};

export const STATUS_STYLES: Record<string, string> = {
  OPEN:        "text-accent-blue border-accent-blue/30 bg-accent-blue/10",
  IN_PROGRESS: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  RESOLVED:    "text-green-400 border-green-400/30 bg-green-400/10",
  CLOSED:      "text-gray-500 border-white/10 bg-white/5",
};

export const STATUS_DOT: Record<string, string> = {
  OPEN:        "bg-accent-blue animate-pulse",
  IN_PROGRESS: "bg-yellow-500 animate-pulse",
  RESOLVED:    "bg-green-500",
  CLOSED:      "bg-gray-600",
};
