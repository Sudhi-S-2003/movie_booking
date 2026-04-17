import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { LifeBuoy, Plus, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";

import { useIssues } from "./hooks/useIssues.js";
import { useUnreadCounts } from "./hooks/useUnreadCounts.js";
import { IssueList } from "./components/IssueList.js";
import { ChatPanel } from "./components/ChatPanel.js";
import { NewTicketModal } from "./components/NewTicketModal.js";
import { ChatProvider } from "./context/ChatContext.js";
import type { Issue } from "./types.js";

interface IssueSuiteProps {
  contextMetadata?: any;
  adminMode?: boolean;
}

export const IssueSuite: React.FC<IssueSuiteProps> = ({
  contextMetadata = {},
  adminMode = false,
}) => {
  const { user } = useAuthStore();
  const { issueId } = useParams<{ issueId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openedAnchor, setOpenedAnchor] = useState<string | null>(null);
  const issues = useIssues(adminMode);
  const unread = useUnreadCounts(!!user);

  const userRole: "User" | "TheatreOwner" | "Guest" = user
    ? user.role === "theatre_owner" ? "TheatreOwner" : "User"
    : "Guest";

  const getBasePath = useCallback(() => {
    if (issueId) return location.pathname.replace(`/${issueId}`, "");
    return location.pathname;
  }, [issueId, location.pathname]);

  useEffect(() => {
    if (!issueId) {
      setSelectedIssue(null);
      setOpenedAnchor(null);
      return;
    }
    const found = issues.issues.find((i) => i._id === issueId);
    if (found && found._id !== selectedIssue?._id) {
      const hasUnread = (unread.counts[found._id] ?? 0) > 0;
      const anchor = hasUnread ? unread.lastReadMap[found._id] ?? null : null;
      setOpenedAnchor(anchor);
      setSelectedIssue(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, issues.issues]);

  const handleSelect = useCallback(
    (issue: Issue) => {
      const hasUnread = (unread.counts[issue._id] ?? 0) > 0;
      const anchor = hasUnread ? unread.lastReadMap[issue._id] ?? null : null;
      setOpenedAnchor(anchor);
      setSelectedIssue(issue);
      unread.clearIssue(issue._id);
      navigate(`${getBasePath()}/${issue._id}`, { replace: true });
    },
    [navigate, getBasePath, unread]
  );

  const handleClose = useCallback(() => {
    setSelectedIssue(null);
    navigate(getBasePath(), { replace: true });
  }, [navigate, getBasePath]);

  const hasChat = !!selectedIssue;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {}
          {hasChat && (
            <button
              onClick={handleClose}
              className="lg:hidden w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-white">
              <LifeBuoy size={18} className="text-accent-blue" />
              Support Hub
            </h2>
            <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mt-0.5">
              {userRole === "TheatreOwner"
                ? "Advanced Technical Orchestration"
                : "Global Cinema Support"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-accent-blue text-white rounded-lg font-bold text-[8px] uppercase tracking-widest flex items-center gap-1.5 hover:scale-105 transition-all shadow-md shadow-accent-blue/20"
        >
          <Plus size={13} /> Open New Ticket
        </button>
      </div>

      {}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[340px_1fr] grid-rows-[1fr] gap-4">
        {}
        <div className={`min-h-0 flex flex-col overflow-hidden ${hasChat ? "hidden lg:flex" : "flex"}`}>
          <IssueList
            issues={issues.issues}
            loading={issues.loading}
            hasMoreIssues={issues.hasMoreIssues}
            issuesPage={issues.issuesPage}
            selectedIssueId={selectedIssue?._id}
            unreadCounts={unread.counts}
            onSelect={handleSelect}
            onLoadMore={issues.fetchIssues}
          />
        </div>

        {}
        <div className={`min-h-0 flex-col overflow-hidden relative ${hasChat ? "flex" : "hidden lg:flex"}`}>
          {selectedIssue ? (
            <ChatProvider
              issue={selectedIssue}
              adminMode={adminMode}
              anchorMessageId={openedAnchor}
              onRefreshIssues={() => {
                issues.fetchIssues(1, false);
                unread.refresh();
              }}
              onClose={handleClose}
              onIssueUpdate={(patch) =>
                setSelectedIssue((prev) => (prev ? { ...prev, ...patch } : null))
              }
            >
              <ChatPanel />
            </ChatProvider>
          ) : (
            <div className="flex-1 min-h-0 bg-white/[0.02] border border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/10">
                <LifeBuoy size={22} />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
                  No ticket selected
                </p>
                <p className="text-[8px] text-white/15 font-medium">
                  Select a ticket to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {}
      <NewTicketModal
        show={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => issues.fetchIssues(1, false)}
        user={user}
        userRole={userRole}
        contextMetadata={contextMetadata}
      />
    </div>
  );
};
