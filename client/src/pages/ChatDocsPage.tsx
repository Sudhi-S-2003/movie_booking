import React from 'react';
import { Shield, Lock, Clock } from 'lucide-react';
import { SignatureGuide } from '../components/api-docs/chat/SignatureGuide.js';
import { ChatLifecycle } from '../components/api-docs/chat/ChatLifecycle.js';
import { BackendChatApiReference } from '../components/api-docs/chat/BackendChatApiReference.js';
import { ApiDocsBackButton } from '../components/api-docs/DocComponents.js';

export const ChatDocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-20 text-white relative">
      <ApiDocsBackButton />

      {/* Hero Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
            <Shield className="text-accent-blue" size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Chat signed Service</h1>
        </div>
        <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
          Programmatically authenticate users to channels, embed chat widgets securely, and sync message feeds.
        </p>
      </header>

      {/* Concepts */}
      <section className="grid sm:grid-cols-3 gap-6">
        {[
          { icon: Lock, title: "Guest Iframe Widgets", desc: "Allow users to read and send messages without register credentials." },
          { icon: Clock, title: "Time Expired Rooms", desc: "Temporary signed access windows prevent guest reuse." },
          { icon: Shield, title: "Scoped Conversations", desc: "Signed credentials grant access solely to the targeted chat conversation." }
        ].map((item, i) => (
          <div key={i} className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-3xl">
            <item.icon className="text-accent-blue mb-3" size={16} />
            <h3 className="text-xs font-black uppercase tracking-wider mb-1 text-white">{item.title}</h3>
            <p className="text-[11px] text-white/40 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Lifecycle & Endpoints */}
      <div className="space-y-24 border-t border-white/[0.05] pt-16">
        <SignatureGuide />
        <ChatLifecycle />
        <BackendChatApiReference />
      </div>
    </div>
  );
};

export default ChatDocsPage;
