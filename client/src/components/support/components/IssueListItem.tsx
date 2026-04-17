import React from "react";
import { motion } from "framer-motion";
import { PRIORITY_COLORS, STATUS_DOT } from "../constants.js";
import { UnreadBadge } from "../ui/UnreadBadge.js";
import type { Issue } from "../types.js";


export interface IssueListItemProps {
  issue: Issue;
  selected: boolean;
  unreadCount: number;
  onSelect: (issue: Issue) => void;
}

export const IssueListItem: React.FC<IssueListItemProps> = React.memo(
  ({ issue, selected, unreadCount, onSelect }) => {
    return (
      <motion.button
        layoutId={`ticket-${issue._id}`}
        onClick={() => onSelect(issue)}
        className={`w-full text-left p-4 flex-shrink-0 rounded-xl border transition-all ${
          selected
            ? "bg-white/10 border-white/15 shadow-lg"
            : "bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex justify-between items-start mb-2.5">
          <span
            className={`text-[7px] font-bold px-1.5 py-px rounded border ${
              PRIORITY_COLORS[issue.priority]
            }`}
          >
            {issue.priority}
          </span>
          <div className="flex items-center gap-1.5">
            <UnreadBadge count={unreadCount} />
            <span className="text-[7px] font-mono text-white/20">
              #{issue._id.slice(-6)}
            </span>
          </div>
        </div>
        <h4
          className={`text-xs mb-2 line-clamp-2 leading-snug ${
            unreadCount > 0 ? "font-black text-white" : "font-bold text-white"
          }`}
        >
          {issue.title}
        </h4>
        <div className="flex justify-between items-center text-[7px] font-bold text-white/30 uppercase tracking-wider">
          <span>{issue.category}</span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                STATUS_DOT[issue.status] || "bg-gray-500"
              }`}
            />
            {issue.status}
          </div>
        </div>
      </motion.button>
    );
  },
);

IssueListItem.displayName = "IssueListItem";
