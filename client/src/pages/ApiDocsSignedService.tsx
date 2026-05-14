import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shield, Lock, ArrowRight, Info, ExternalLink, ChevronDown, Code2, MessageSquare } from 'lucide-react';
import { SignatureGuide } from '../components/api-docs/signed-service/SignatureGuide.js';
import { CodeShareLifecycle } from '../components/api-docs/signed-service/CodeShareLifecycle.js';
import { ChatLifecycle } from '../components/api-docs/signed-service/ChatLifecycle.js';
import { BackendApiReference } from '../components/api-docs/signed-service/BackendApiReference.js';

const CATEGORIES = [
  { id: 'code-share', label: 'Code Share', icon: Code2, desc: 'Secure snippet sharing' },
  { id: 'chat', label: 'Chat Service', icon: MessageSquare, desc: 'Guest messaging (Soon)' },
];

export const ApiDocsSignedService = () => {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]!);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-20 selection:bg-accent-blue/30">
      {/* Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-accent-blue/[0.03] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-500/[0.02] blur-[150px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          <span className="hover:text-white transition-colors cursor-pointer">API Docs</span>
          <ArrowRight size={10} />
          <span className="text-accent-blue">Signed Service</span>
        </div>

        {/* Hero Section */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
                <Shield className="text-accent-blue" size={24} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">Signed API Service</h1>
            </div>
            <p className="text-lg text-white/50 leading-relaxed max-w-2xl">
              Securely expose resources to external users using time-limited, HMAC-signed URLs. 
              Ideal for code sharing, temporary file access, and secure guest interactions.
            </p>
          </div>

          {/* Category Selector */}
          <div className="relative min-w-[240px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2 ml-1">Documentation Scoped To:</p>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <activeCategory.icon size={18} className="text-accent-blue" />
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight">{activeCategory.label}</p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-white/20 group-hover:text-white transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeCategory.id === cat.id ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}
                    >
                      <cat.icon size={16} />
                      <div className="text-left">
                        <p className="text-[11px] font-black uppercase tracking-tight">{cat.label}</p>
                        <p className="text-[9px] opacity-60 font-medium">{cat.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Core Concepts */}
        <section className="grid md:grid-cols-3 gap-6 mb-20">
          {[
            { icon: Lock, title: "HMAC Signing", desc: "URLs are signed using SHA-256 HMAC with your API Secret." },
            { icon: Clock, title: "Time Limited", desc: "Every URL has a custom expiry. Once expired, access is revoked instantly." },
            { icon: Shield, title: "Scoped Access", desc: "Access is restricted to the specific resource ID and category." }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-3xl"
            >
              <item.icon className="text-accent-blue mb-4" size={20} />
              <h3 className="text-sm font-black uppercase tracking-wider mb-2">{item.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Dynamic Content */}
        <div className="space-y-24 min-h-[600px]">
          <SignatureGuide category={activeCategory.id} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeCategory.id === 'code-share' && <CodeShareLifecycle />}
              {activeCategory.id === 'chat' && <ChatLifecycle />}
            </motion.div>
          </AnimatePresence>

          <div className="pt-24 border-t border-white/[0.05]">
            <BackendApiReference />
          </div>
        </div>

        {/* Footer info */}
        <footer className="mt-32 pt-12 border-t border-white/[0.05] text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
              <Info size={12} />
              Security Whitepaper
            </div>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
              <ExternalLink size={12} />
              Postman Collection
            </div>
          </div>
          <p className="text-[9px] font-bold text-white/10 uppercase tracking-[0.4em]">
            © 2026 Antigravity API Infrastructure
          </p>
        </footer>
      </div>
    </div>
  );
};
