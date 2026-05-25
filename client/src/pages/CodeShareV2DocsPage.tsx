import React from 'react';
import { Shield, Lock, Clock } from 'lucide-react';
import { SignatureGuide } from '../components/api-docs/code-share-v2/SignatureGuide.js';
import { CodeShareV2Lifecycle } from '../components/api-docs/code-share-v2/CodeShareV2Lifecycle.js';
import { BackendV2ApiReference } from '../components/api-docs/code-share-v2/BackendV2ApiReference.js';
import { ApiDocsBackButton } from '../components/api-docs/DocComponents.js';

export const CodeShareV2DocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-20 text-white relative">
      <ApiDocsBackButton />

      {/* Hero Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
            <Shield className="text-accent-blue" size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Code Share V2 Git-like API</h1>
        </div>
        <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
          Complete project workspace manager supporting multi-file layout trees, delta revisions, inline checkouts, and zip downloading.
        </p>
      </header>

      {/* Concepts */}
      <section className="grid sm:grid-cols-3 gap-6">
        {[
          { icon: Lock, title: "Multi-File Workspaces", desc: "Manage structured file/folder layouts inside standard directory hierarchies." },
          { icon: Clock, title: "Git-Like Commits", desc: "Incremental commits with messages, authors, additions/deletions, and line diffs." },
          { icon: Shield, title: "Bulk Fetching", desc: "Download entire workspaces in a single bulk fetch request with progress loading." }
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
        <CodeShareV2Lifecycle />
        <BackendV2ApiReference />
      </div>
    </div>
  );
};

export default CodeShareV2DocsPage;
