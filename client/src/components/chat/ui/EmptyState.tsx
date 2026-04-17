import React from 'react';
import { MessageCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?:    React.ReactNode;
  title:    string;
  subtitle: string;
  action?:  React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => (
  <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 text-center p-8">
    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/10">
      {icon ?? <MessageCircle size={28} />}
    </div>
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">
        {title}
      </p>
      <p className="text-[9px] text-white/15 font-medium max-w-xs">
        {subtitle}
      </p>
    </div>
    {action}
  </div>
);
