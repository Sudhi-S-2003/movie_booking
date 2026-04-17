import { useState, useEffect } from "react";
import { supportApi } from "../../../services/api/index.js";
import { ISSUES_PAGE_SIZE } from "../constants.js";
import type { Issue } from "../types.js";

export interface UseIssuesReturn {
  issues: Issue[];
  loading: boolean;
  issuesPage: number;
  hasMoreIssues: boolean;
  fetchIssues: (page?: number, append?: boolean) => Promise<void>;
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
}

export function useIssues(adminMode: boolean): UseIssuesReturn {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuesPage, setIssuesPage] = useState(1);
  const [hasMoreIssues, setHasMoreIssues] = useState(true);

  const fetchIssues = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const res = adminMode
        ? await supportApi.listAll({ page, limit: ISSUES_PAGE_SIZE })
        : await supportApi.listMine({ page, limit: ISSUES_PAGE_SIZE });

      if (append) {
        setIssues((prev) => [...prev, ...res.issues]);
      } else {
        setIssues(res.issues);
      }
      setHasMoreIssues(res.pagination.page < res.pagination.totalPages);
      setIssuesPage(page);
    } catch (err) {
      console.error("[useIssues] fetchIssues error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMode]);

  return { issues, loading, issuesPage, hasMoreIssues, fetchIssues, setIssues };
}
