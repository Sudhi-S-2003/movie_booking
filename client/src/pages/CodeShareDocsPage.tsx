import React from 'react';
import { Shield, Lock, Clock } from 'lucide-react';
import { SignatureGuide } from '../components/api-docs/code-share/SignatureGuide.js';
import { CodeShareLifecycle } from '../components/api-docs/code-share/CodeShareLifecycle.js';
import { BackendApiReference } from '../components/api-docs/code-share/BackendApiReference.js';
import { ApiDocsBackButton } from '../components/api-docs/DocComponents.js';

export const CodeShareDocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-20 text-white relative">
      <ApiDocsBackButton />

      {/* Hero Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
            <Shield className="text-accent-blue" size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Code Share V1 signed API</h1>
        </div>
        <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
          Securely stream large files and snippets to guest users using time-limited HMAC signatures.
        </p>
      </header>

      {/* Concepts */}
      <section className="grid sm:grid-cols-3 gap-6">
        {[
          { icon: Lock, title: "HMAC Signed", desc: "URLs are verified via SHA-256 HMAC utilizing your account Secret." },
          { icon: Clock, title: "Time Expired", desc: "Access is automatically revoked once the custom link expiry is crossed." },
          { icon: Shield, title: "Category Scopes", desc: "API limits requests to only the matching categories (code-share)." }
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
        <CodeShareLifecycle />
        <BackendApiReference />
      </div>
    </div>
  );
};

export default CodeShareDocsPage;
