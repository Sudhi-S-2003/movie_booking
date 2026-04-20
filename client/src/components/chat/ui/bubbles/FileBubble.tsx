import React, { memo } from 'react';
import { FileText, Archive, Image as ImageIcon, File as FileIcon, ArrowDownToLine } from 'lucide-react';
import {
  fileKindBadge,
  fileKindFromName,
  fileNameFromUrl,
  formatBytes,
  truncateMiddle,
  type FileKind,
} from './helpers.js';
import type { ChatMessage } from '../../types.js';

interface FileBubbleProps {
  msg:   ChatMessage;
  isOwn: boolean;
}

const ICON_FOR_KIND: Record<FileKind, React.ComponentType<{ size?: number; className?: string }>> = {
  pdf:   FileText,
  zip:   Archive,
  image: ImageIcon,
  other: FileIcon,
};

/**
 * FileRow — an individual downloadable attachment inside the bubble. The
 * entire card is wrapped in an `<a download>` so clicking anywhere on it
 * triggers the browser's download flow. Size/mime is not part of the
 * current message model so we render without a size line by default — if
 * we ever attach a sidecar `bytes` value, `formatBytes` is wired for it.
 */
const FileRow: React.FC<{ url: string; bytes?: number }> = ({ url, bytes }) => {
  const name = fileNameFromUrl(url);
  const kind = fileKindFromName(name);
  const Icon = ICON_FOR_KIND[kind];
  const badge = fileKindBadge[kind];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="flex items-center gap-3 p-2 -mx-1 rounded-lg hover:bg-white/[0.05] transition-colors group/file"
      aria-label={`Download ${name}`}
    >
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${badge}`}>
        <Icon size={18} />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-semibold truncate" title={name}>
          {truncateMiddle(name, 28)}
        </span>
        {bytes !== undefined && (
          <span className="text-[10px] text-white/55 tabular-nums uppercase tracking-wider">
            {formatBytes(bytes)}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 border border-white/10 text-white/70 group-hover/file:text-white group-hover/file:bg-white/15 transition-colors flex-shrink-0"
      >
        <ArrowDownToLine size={15} />
      </span>
    </a>
  );
};

export const FileBubble = memo(({ msg, isOwn }: FileBubbleProps) => {
  const urls = msg.attachments ?? [];
  return (
    <div
      className={`rounded-2xl px-3 py-2.5 text-[12px] w-full min-w-0 max-w-full overflow-hidden transition-transform duration-200 ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-br-md ring-1 ring-inset ring-white/[0.15] hover:-translate-y-0.5'
          : 'bg-white/[0.03] border border-white/[0.08] text-gray-200 rounded-bl-md backdrop-blur-2xl'
      }`}
    >
      {urls.length === 0 ? (
        <span className="px-1">{msg.text || 'File'}</span>
      ) : (
        urls.map((url, i) => <FileRow key={i} url={url} />)
      )}
      {msg.text && urls.length > 0 && (
        <p className="mt-2 px-1 text-[11px] opacity-80 break-words">{msg.text}</p>
      )}
    </div>
  );
});

FileBubble.displayName = 'FileBubble';
