import React from "react";
import { CheckCircle2 } from "lucide-react";
import { IssueListItem } from "./IssueListItem.js";
import type { Issue } from "../types.js";


interface IssueListProps {
  issues: Issue[];
  loading: boolean;
  hasMoreIssues: boolean;
  issuesPage: number;
  selectedIssueId?: string;
  unreadCounts: Record<string, number>;
  onSelect: (issue: Issue) => void;
  onLoadMore: (page: number) => void;
}

export const IssueList: React.FC<IssueListProps> = ({
  issues,
  loading,
  hasMoreIssues,
  issuesPage,
  selectedIssueId,
  unreadCounts,
  onSelect,
  onLoadMore,
}) => {
  if (loading && issues.length === 0) {
    return (
      <div className="flex-1 overflow-hidden space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[90px] shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!loading && issues.length === 0) {
    return (
      <div className="h-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-10 text-center flex flex-col items-center justify-center space-y-3">
        <CheckCircle2 size={32} className="mx-auto text-white/10" />
        <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/20">
          No tickets found
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
      {issues.map((issue) => (
        <IssueListItem
          key={issue._id}
          issue={issue}
          selected={selectedIssueId === issue._id}
          unreadCount={unreadCounts[issue._id] ?? 0}
          onSelect={onSelect}
        />
      ))}

      {hasMoreIssues && (
        <button
          onClick={() => onLoadMore(issuesPage + 1)}
          disabled={loading}
          className="w-full py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[7px] font-bold uppercase tracking-[0.2em] hover:bg-white/[0.06] transition-all disabled:opacity-50 flex-shrink-0"
        >
          {loading ? "Loading more..." : "Load more tickets"}
        </button>
      )}
      <div className="h-2 flex-shrink-0" />
    </div>
  );
};
