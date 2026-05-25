import React from 'react';
import { MessageSquare, ShieldCheck } from 'lucide-react';

export const ChatLifecycle: React.FC = () => {
  return (
    <div className="space-y-12">
      <section className="text-center py-20 bg-white/[0.01] border border-white/[0.05] rounded-[40px]">
        <div className="w-16 h-16 bg-accent-blue/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="text-accent-blue" size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Chat Service Documentation</h2>
        <p className="text-white/40 max-w-md mx-auto text-sm leading-relaxed">
          The Signed API for Chat is currently in development. It will support guest messaging, channel history signing, and secure attachment streaming.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-full text-[10px] font-black text-accent-blue uppercase tracking-widest">
          <ShieldCheck size={12} />
          Coming Summer 2026
        </div>
      </section>
    </div>
  );
};
