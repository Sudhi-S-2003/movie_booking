import React from 'react';
import { Terminal, Copy, Code, Zap, Check } from 'lucide-react';

interface EndpointProps {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  payload?: string;
  response?: string;
}

export const EndpointCard = ({ method, path, description, params, payload, response }: EndpointProps) => {
  const methodColors = {
    GET: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    POST: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  };

  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${methodColors[method]}`}>
              {method}
            </span>
            <code className="text-sm font-mono text-white/90 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
              {path}
            </code>
          </div>
          <p className="text-xs font-medium text-gray-400">{description}</p>
        </div>

        {params && params.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
              <Code size={12} /> Parameters
            </h5>
            <div className="overflow-x-auto">
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
                    <tr key={p.name}>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        {p.name} {p.required && <span className="text-rose-500">*</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-400">{p.type}</td>
                      <td className="py-3 px-4 text-gray-300">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {payload && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                  <Terminal size={12} /> Request Body
                </h5>
                <button 
                  onClick={() => handleCopy(payload)} 
                  className={`transition-colors ${copied ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <pre className="p-4 bg-black/40 rounded-2xl border border-white/5 text-[11px] font-mono text-blue-200 overflow-x-auto scrollbar-thin">
                {payload}
              </pre>
            </div>
          )}

          {response && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                  <Zap size={12} /> Example Response
                </h5>
              </div>
              <pre className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-[11px] font-mono text-emerald-200 overflow-x-auto scrollbar-thin">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
