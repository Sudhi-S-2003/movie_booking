import React from 'react';
import { Terminal, Copy, Check, Info } from 'lucide-react';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

export const MethodBadge: React.FC<{ method: Method; className?: string }> = ({ method, className = "" }) => {
  const colors = {
    GET: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    POST: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    PATCH: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${colors[method]} ${className}`}>
      {method}
    </span>
  );
};

export const ParamTable: React.FC<{ 
  title: string; 
  params: Param[]; 
  icon?: React.ReactNode; 
  className?: string;
  defaultOpen?: boolean;
}> = ({ title, params, icon, className = "", defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  if (!params.length) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors w-full text-left group"
      >
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
           {icon || <Info size={14} />}
        </span>
        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] flex-1">{title}</h5>
        <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          {isOpen ? '[ COLLAPSE ]' : '[ EXPAND ]'}
        </span>
      </button>

      {isOpen && (
        <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-2 px-4 text-gray-500 font-bold uppercase tracking-wider">Name</th>
                <th className="py-2 px-4 text-gray-500 font-bold uppercase tracking-wider">Type</th>
                <th className="py-2 px-4 text-gray-500 font-bold uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {params.map((p) => (
                <tr key={p.name} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-4 font-mono">
                    <span className="text-emerald-400">{p.name}</span>
                    {p.required && <span className="text-rose-500 ml-1" title="Required">*</span>}
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-white/5 px-2 py-1 rounded text-[10px] text-gray-400 border border-white/5">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-400 leading-relaxed">
                    {p.description}
                    {p.default && (
                      <div className="mt-1 text-[10px] text-gray-600">
                        Default: <code className="text-gray-500">{p.default}</code>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const DocCodeBlock: React.FC<{ 
  title: string; 
  content: string; 
  icon?: React.ReactNode; 
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'gray';
  className?: string;
  actions?: React.ReactNode;
  language?: string;
}> = ({ title, content, icon, variant = 'gray', className = "", actions, language }) => {
  const [copied, setCopied] = React.useState(false);

  const variants = {
    blue: 'bg-blue-500/5 border-blue-500/10 text-blue-200 selection:bg-blue-500/30',
    emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-200 selection:bg-emerald-500/30',
    amber: 'bg-amber-500/5 border-amber-500/10 text-amber-200 selection:bg-amber-500/30',
    rose: 'bg-rose-500/5 border-rose-500/10 text-rose-200 selection:bg-rose-500/30',
    purple: 'bg-purple-500/5 border-purple-500/10 text-purple-200 selection:bg-purple-500/30',
    gray: 'bg-white/[0.02] border-white/5 text-gray-300 selection:bg-white/20',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-3 group/code ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-500 group-hover/code:text-gray-400 transition-colors">
          {icon || <Terminal size={14} />}
          <h5 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h5>
          {language && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-bold border border-white/5 opacity-50">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button 
            onClick={handleCopy}
            className={`p-1.5 rounded-lg transition-all transform active:scale-90 ${copied ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-gray-500 hover:text-white'}`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className={`relative p-5 rounded-2xl border font-mono text-[11px] leading-relaxed overflow-x-auto scrollbar-thin backdrop-blur-sm transition-all duration-500 group-hover/code:border-white/10 ${variants[variant]}`}>
        <pre className="whitespace-pre-wrap relative z-10">{content}</pre>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export const DocSection: React.FC<{ 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  id?: string;
  className?: string;
  accentColor?: 'blue' | 'emerald' | 'purple' | 'amber';
}> = ({ title, icon: Icon, children, id, className = "", accentColor = 'blue' }) => {
  const accents = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 bar:bg-blue-500/40',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 bar:bg-emerald-500/40',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 bar:bg-purple-500/40',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400 bar:bg-amber-500/40',
  };

  return (
    <section id={id} className={`space-y-8 scroll-mt-32 ${className}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${accents[accentColor].split(' bar:')[0]}`}>
          <Icon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <div className={`h-1 w-12 rounded-full mt-1.5 ${accents[accentColor].split('bar:')[1]}`} />
        </div>
      </div>
      {children}
    </section>
  );
};
