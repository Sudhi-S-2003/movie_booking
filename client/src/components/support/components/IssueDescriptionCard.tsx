
import React from 'react';
import type { Issue } from '../types.js';

interface Props {
  issue: Issue;
}

export const IssueDescriptionCard: React.FC<Props> = ({ issue }) => (
  <div className="flex justify-center mb-4">
    <div className="px-4 py-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl max-w-[80%]">
      <p className="text-[8px] font-bold text-white/25 uppercase tracking-wider text-center mb-1.5">
        Issue Description
      </p>
      <p className="text-[11px] text-white/40 leading-relaxed text-center whitespace-pre-wrap">
        {issue.description}
      </p>
      <p className="text-[7px] text-white/15 text-center mt-1.5 tabular-nums">
        {new Date(issue.createdAt).toLocaleString()}
      </p>
    </div>
  </div>
);
