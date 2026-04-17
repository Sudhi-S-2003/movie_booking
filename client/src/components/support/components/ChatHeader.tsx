
import React from 'react';
import { LifeBuoy, X } from 'lucide-react';
import { STATUS_STYLES } from '../constants.js';
import type { Issue } from '../types.js';

interface ChatHeaderProps {
  issue: Issue;
  adminMode: boolean;
  onStatusChange: (s: string) => void;
  onClose: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  issue,
  adminMode,
  onStatusChange,
  onClose,
}) => (
  <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
          <LifeBuoy size={15} className="text-accent-blue" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-xs text-white truncate">{issue.title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] font-bold text-accent-blue/70 uppercase tracking-wider">
              {issue.category}
            </span>
            <span className="text-white/10 text-[8px]">·</span>
            <span
              className={`text-[7px] font-bold px-1.5 py-px rounded border ${
                STATUS_STYLES[issue.status] ?? STATUS_STYLES.CLOSED
              } uppercase tracking-wider`}
            >
              {issue.status}
            </span>
            <span className="text-white/10 text-[8px]">·</span>
            <span className="text-[7px] font-mono text-white/20">
              #{issue._id.slice(-6)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {adminMode ? (
          <>
            {issue.status !== 'RESOLVED' && (
              <StatusButton
                label="Resolve"
                color="green"
                onClick={() => onStatusChange('RESOLVED')}
              />
            )}
            {issue.status !== 'CLOSED' && (
              <StatusButton
                label="Close"
                color="red"
                onClick={() => onStatusChange('CLOSED')}
              />
            )}
            {(issue.status === 'RESOLVED' || issue.status === 'CLOSED') && (
              <StatusButton
                label="Re-open"
                color="blue"
                onClick={() => onStatusChange('OPEN')}
              />
            )}
          </>
        ) : (
          issue.status !== 'CLOSED' && (
            <button
              type="button"
              onClick={() => onStatusChange('CLOSED')}
              className="px-2.5 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-[7px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
            >
              Close
            </button>
          )
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all"
        >
          <X size={14} className="text-gray-500" />
        </button>
      </div>
    </div>

    {(issue.metadata?.linkedTheatreId || issue.metadata?.linkedMovieId) && (
      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-11">
        {issue.metadata?.linkedTheatreId && (
          <MetadataTag
            color="accent-blue"
            label={
              typeof issue.metadata.linkedTheatreId === 'object'
                ? issue.metadata.linkedTheatreId.name
                : issue.metadata.linkedTheatreId
            }
          />
        )}
        {issue.metadata?.linkedMovieId && (
          <MetadataTag
            color="accent-pink"
            label={
              typeof issue.metadata.linkedMovieId === 'object'
                ? issue.metadata.linkedMovieId.title
                : issue.metadata.linkedMovieId
            }
          />
        )}
      </div>
    )}
  </div>
);

interface StatusButtonProps {
  label: string;
  color: 'green' | 'red' | 'blue';
  onClick: () => void;
}

const StatusButton: React.FC<StatusButtonProps> = ({ label, color, onClick }) => {
  const styles = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
    blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 hover:bg-accent-blue/20',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 border rounded-lg text-[7px] font-bold uppercase tracking-wider transition-all ${styles[color]}`}
    >
      {label}
    </button>
  );
};

const MetadataTag: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div
    className={`px-2 py-0.5 bg-${color}/5 border border-${color}/10 rounded-md flex items-center gap-1.5`}
  >
    <div className={`w-1 h-1 rounded-full bg-${color} animate-pulse`} />
    <span className={`text-[7px] font-bold text-${color} uppercase tracking-wider`}>
      {label}
    </span>
  </div>
);
