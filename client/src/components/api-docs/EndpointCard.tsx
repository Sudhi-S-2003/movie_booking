import React from 'react';
import { MethodBadge, ParamTable, DocCodeBlock } from './DocComponents.js';
import type { Param, Method } from './DocComponents.js';
import { Shield, Database, Send, Zap, Globe } from 'lucide-react';

interface EndpointProps {
  method: Method;
  path: string;
  description: string;
  headers?: Param[];
  pathParams?: Param[];
  queryParams?: Param[];
  body?: string;
  response?: string;
  status?: 'Stable' | 'Beta' | 'Deprecated';
  tag?: string;
  onTryItOut?: () => void;
}

export const EndpointCard: React.FC<EndpointProps> = ({ 
  method, 
  path, 
  description, 
  headers, 
  pathParams, 
  queryParams, 
  body, 
  response,
  status = 'Stable',
  tag,
  onTryItOut
}) => {
  const statusColors = {
    Stable: 'text-amber-500/50 bg-amber-500/5 border-amber-500/10',
    Beta: 'text-purple-500/50 bg-purple-500/5 border-purple-500/10',
    Deprecated: 'text-rose-500/50 bg-rose-500/5 border-rose-500/10',
  };

  return (
    <div className="group bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/10 hover:scale-[1.01] transition-all duration-500">
      <div className="p-6 md:p-10 space-y-10">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={method} />
              <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                <Globe size={12} className="text-gray-500" />
                <code className="text-sm font-mono text-white/90">
                  {path}
                </code>
              </div>
              {tag && (
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/5 border border-blue-400/10 px-2 py-0.5 rounded">
                  {tag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {onTryItOut && (
                <button 
                  onClick={onTryItOut}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-all"
                >
                  <Send size={12} className="text-emerald-400" />
                  Try it out
                </button>
              )}
              <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-lg border ${statusColors[status]}`}>
                <Zap size={14} className="opacity-50" />
                <span>{status.toUpperCase()} API</span>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">{description}</p>
        </div>

        {/* Parameters Sections */}
        {(headers || pathParams || queryParams) && (
          <div className="grid lg:grid-cols-1 gap-12 pt-4">
            {headers && (
              <ParamTable 
                title="Request Headers" 
                params={headers} 
                icon={<Shield size={14} className="text-blue-400/50" />} 
              />
            )}
            {pathParams && (
              <ParamTable 
                title="Path Parameters" 
                params={pathParams} 
                icon={<Database size={14} className="text-purple-400/50" />} 
              />
            )}
            {queryParams && (
              <ParamTable 
                title="Query Parameters" 
                params={queryParams} 
                icon={<Globe size={14} className="text-emerald-400/50" />} 
              />
            )}
          </div>
        )}

        {/* Code Examples Section */}
        <div className="grid md:grid-cols-2 gap-8 pt-4">
          {body && (
            <DocCodeBlock 
              title="Request Body" 
              content={body} 
              variant="blue" 
              language="JSON"
              icon={<Send size={14} className="text-blue-400/50" />}
            />
          )}
          {response && (
            <DocCodeBlock 
              title="Example Response" 
              content={response} 
              variant="emerald" 
              language="JSON"
              icon={<Zap size={14} className="text-emerald-400/50" />}
            />
          )}
        </div>
      </div>
    </div>
  );
};
