import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Shield, Database, Send, Zap, Globe, Copy, Check, Terminal, Play, Loader2, RefreshCw } from 'lucide-react';
import { MethodBadge, ParamTable, DocCodeBlock, type Param, type Method } from './DocComponents.js';

interface EndpointProps {
  method: Method;
  path: string;
  title?: string;
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
  title,
  description,
  headers = [],
  pathParams = [],
  queryParams = [],
  body = '',
  response = '',
  status = 'Stable',
  tag
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'curl' | 'fetch' | 'test'>('docs');
  const [copied, setCopied] = useState<'curl' | 'fetch' | 'none'>('none');

  // Input states for the interactive client
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState(body);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Response execution states
  const [responseState, setResponseState] = useState<{
    status?: number;
    statusText?: string;
    time?: number;
    size?: string;
    data?: any;
    loading: boolean;
    error?: string;
  }>({ loading: false });


  // Initialize defaults for parameter values when endpoint changes
  useEffect(() => {
    const defaults: Record<string, string> = {};
    
    // Default headers
    headers.forEach(h => {
      if (h.name === 'x-api-key') {
        defaults[h.name] = localStorage.getItem('apiDocs_apiKey') || '';
      } else if (h.name === 'x-api-secret') {
        defaults[h.name] = localStorage.getItem('apiDocs_apiSecret') || '';
      } else if (h.default) {
        defaults[h.name] = h.default;
      }
    });

    // Default query parameters
    queryParams.forEach(q => {
      if (q.default) {
        defaults[q.name] = q.default;
      }
    });

    // Default path parameters (e.g. resource IDs, category)
    pathParams.forEach(p => {
      if (p.name === 'category') {
        defaults[p.name] = tag === 'chat' ? 'chat' : tag === 'code-share-v2' ? 'code-share-v2' : 'code-share';
      } else if (p.default) {
        defaults[p.name] = p.default;
      }
    });

    // Detect path parameters that might not be in pathParams prop
    const pathMatches = path.match(/:[a-zA-Z0-9_]+/g);
    if (pathMatches) {
      pathMatches.forEach(match => {
        const name = match.substring(1);
        if (!defaults[name]) {
          defaults[name] = '';
        }
      });
    }

    setParamValues(defaults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, method, tag]);

  // Persist typed keys in localStorage to save user input across cards
  const handleParamChange = useCallback((name: string, value: string) => {
    setParamValues(prev => ({ ...prev, [name]: value }));
    if (name === 'x-api-key') {
      localStorage.setItem('apiDocs_apiKey', value);
    } else if (name === 'x-api-secret') {
      localStorage.setItem('apiDocs_apiSecret', value);
    }
  }, []);

  const handleBodyChange = useCallback((val: string) => {
    setRequestBody(val);
    if (!val.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON syntax');
    }
  }, []);

  // Scanned path params list
  const scannedPathParams = useMemo(() => {
    const matches = path.match(/:[a-zA-Z0-9_]+/g);
    return matches ? matches.map(m => m.substring(1)) : [];
  }, [path]);

  // Computes the dynamic URL based on path params & query params
  const computedUrlDetails = useMemo(() => {
    let resolvedPath = path;
    scannedPathParams.forEach(paramName => {
      const val = paramValues[paramName] || `:${paramName}`;
      resolvedPath = resolvedPath.replace(`:${paramName}`, val);
    });

    const qParams = new URLSearchParams();
    queryParams.forEach(q => {
      const val = paramValues[q.name];
      if (val !== undefined && val !== '') {
        qParams.append(q.name, val);
      }
    });
    
    // Add additional action if V2 action is query param
    const queryString = qParams.toString();
    const fullRelativeUrl = `${resolvedPath}${queryString ? '?' + queryString : ''}`;
    const fullAbsoluteUrl = `${window.location.origin}${fullRelativeUrl}`;
    
    return { relative: fullRelativeUrl, absolute: fullAbsoluteUrl };
  }, [path, scannedPathParams, queryParams, paramValues]);

  // Compute cURL command
  const curlCommand = useMemo(() => {
    let cmd = `curl -X ${method} "${computedUrlDetails.absolute}"`;
    
    headers.forEach(h => {
      const val = paramValues[h.name] || h.default || `YOUR_${h.name.toUpperCase().replace(/-/g, '_')}`;
      cmd += ` \\\n  -H "${h.name}: ${val}"`;
    });
    
    if (method !== 'GET' && requestBody) {
      cmd += ` \\\n  -H "Content-Type: application/json"`;
      const escapedBody = requestBody.replace(/"/g, '\\"').replace(/\n/g, ' ');
      cmd += ` \\\n  -d "${escapedBody}"`;
    }
    
    return cmd;
  }, [method, computedUrlDetails, headers, paramValues, requestBody]);

  // Compute Fetch Javascript code
  const fetchSnippet = useMemo(() => {
    const headersObj: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    headers.forEach(h => {
      headersObj[h.name] = paramValues[h.name] || h.default || `YOUR_${h.name.toUpperCase().replace(/-/g, '_')}`;
    });

    let code = `fetch("${computedUrlDetails.absolute}", {\n`;
    code += `  method: "${method}",\n`;
    code += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`;
    
    if (method !== 'GET' && requestBody) {
      code += `,\n  body: JSON.stringify(${requestBody.replace(/\n/g, '\n  ')})`;
    }
    
    code += `\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(err => console.error(err));`;
    return code;
  }, [method, computedUrlDetails, headers, paramValues, requestBody]);

  // Execute live API call
  const handleSendRequest = useCallback(async () => {
    setResponseState({ loading: true });
    const startTime = performance.now();

    // Headers
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    headers.forEach(h => {
      const val = paramValues[h.name];
      if (val) {
        reqHeaders[h.name] = val;
      }
    });

    try {
      const options: RequestInit = {
        method,
        headers: reqHeaders,
      };

      if (method !== 'GET' && requestBody) {
        options.body = requestBody;
      }

      const response = await fetch(computedUrlDetails.relative, options);
      const endTime = performance.now();
      const resTime = Math.round(endTime - startTime);

      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch {
        resData = resText;
      }

      const byteLength = new Blob([resText]).size;
      const resSize = byteLength < 1024 ? `${byteLength} B` : `${(byteLength / 1024).toFixed(2)} KB`;

      setResponseState({
        status: response.status,
        statusText: response.statusText,
        time: resTime,
        size: resSize,
        data: resData,
        loading: false
      });
    } catch (err: any) {
      setResponseState({
        loading: false,
        error: err.message || 'Network request failed'
      });
    }
  }, [computedUrlDetails, method, headers, paramValues, requestBody]);

  const handleCopy = useCallback((type: 'curl' | 'fetch', content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(type);
    setTimeout(() => setCopied('none'), 2000);
  }, []);

  const statusColors = {
    Stable: 'text-amber-500/50 bg-amber-500/5 border-amber-500/10',
    Beta: 'text-purple-500/50 bg-purple-500/5 border-purple-500/10',
    Deprecated: 'text-rose-500/50 bg-rose-500/5 border-rose-500/10',
  };

  return (
    <div className="group bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-white/10 hover:bg-white/[0.02] transition-all duration-500 shadow-2xl backdrop-blur-2xl">
      <div className="p-6 md:p-10 space-y-8">
        
        {/* Header Route/Method Information */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={method} />
              <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                <Globe size={12} className="text-gray-500" />
                <code className="text-xs font-mono text-white/90">
                  {path}
                </code>
              </div>
              {tag && (
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/5 border border-blue-400/10 px-2.5 py-0.5 rounded-lg">
                  {tag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 text-[10px] font-black tracking-widest px-3 py-1 rounded-xl border ${statusColors[status]}`}>
                <Zap size={10} className="opacity-50" />
                <span>{status.toUpperCase()} API</span>
              </div>
            </div>
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight text-white">{title || path}</h3>
          <p className="text-white/40 text-sm leading-relaxed max-w-2xl">{description}</p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/[0.06] pb-px overflow-x-auto gap-4 scrollbar-none shrink-0">
          {[
            { id: 'docs', label: 'Docs & Schema' },
            { id: 'curl', label: 'cURL Command' },
            { id: 'fetch', label: 'JavaScript' },
            { id: 'test', label: 'Test Console' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          {activeTab === 'docs' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Parameters Tables */}
              {(headers.length > 0 || pathParams.length > 0 || queryParams.length > 0) && (
                <div className="space-y-6 pt-2">
                  {headers.length > 0 && (
                    <ParamTable 
                      title="Request Headers" 
                      params={headers} 
                      icon={<Shield size={14} className="text-blue-400" />} 
                    />
                  )}
                  {pathParams.length > 0 && (
                    <ParamTable 
                      title="Path Parameters" 
                      params={pathParams} 
                      icon={<Database size={14} className="text-purple-400" />} 
                    />
                  )}
                  {queryParams.length > 0 && (
                    <ParamTable 
                      title="Query Parameters" 
                      params={queryParams} 
                      icon={<Globe size={14} className="text-emerald-400" />} 
                    />
                  )}
                </div>
              )}

              {/* Code Blocks */}
              <div className="grid md:grid-cols-2 gap-8">
                {body && (
                  <DocCodeBlock 
                    title="Request Body Schema" 
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
          )}

          {activeTab === 'curl' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Dynamic Shell Command</p>
                <button
                  onClick={() => handleCopy('curl', curlCommand)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border transition-all ${
                    copied === 'curl'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {copied === 'curl' ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'curl' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <div className="relative p-6 rounded-2xl border border-white/5 bg-black/40 font-mono text-[11px] leading-relaxed overflow-x-auto">
                <pre className="text-white/70 whitespace-pre-wrap">{curlCommand}</pre>
              </div>
            </div>
          )}

          {activeTab === 'fetch' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Vanilla JS Fetch Snippet</p>
                <button
                  onClick={() => handleCopy('fetch', fetchSnippet)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border transition-all ${
                    copied === 'fetch'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {copied === 'fetch' ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'fetch' ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <div className="relative p-6 rounded-2xl border border-white/5 bg-black/40 font-mono text-[11px] leading-relaxed overflow-x-auto">
                <pre className="text-white/70 whitespace-pre-wrap">{fetchSnippet}</pre>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="grid lg:grid-cols-2 gap-8 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Form parameters */}
              <div className="space-y-6 bg-white/[0.01] border border-white/5 p-6 rounded-3xl">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Parameters Console</h4>
                  <p className="text-[10px] text-white/30 mt-1">Configure parameters to customize and run the API request</p>
                </div>
                
                {/* Dynamically build Path parameter fields */}
                {scannedPathParams.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-400">Path Parameters</p>
                    <div className="space-y-3">
                      {scannedPathParams.map(name => (
                        <div key={name} className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-white/60 font-mono">{name}*</label>
                          <input
                            type="text"
                            value={paramValues[name] || ''}
                            onChange={(e) => handleParamChange(name, e.target.value)}
                            placeholder={`Enter ${name}`}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamically build Query parameter fields */}
                {queryParams.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Query Parameters</p>
                    <div className="space-y-3">
                      {queryParams.map(q => (
                        <div key={q.name} className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-white/60 font-mono">
                            {q.name}
                            {q.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          <input
                            type="text"
                            value={paramValues[q.name] || ''}
                            onChange={(e) => handleParamChange(q.name, e.target.value)}
                            placeholder={`Value (Type: ${q.type})`}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Authentication / Headers */}
                {headers.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">API Authentication Headers</p>
                    <div className="space-y-3">
                      {headers.map(h => (
                        <div key={h.name} className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-white/60 font-mono">
                            {h.name}
                            {h.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          <input
                            type={h.name.includes('secret') ? 'password' : 'text'}
                            value={paramValues[h.name] || ''}
                            onChange={(e) => handleParamChange(h.name, e.target.value)}
                            placeholder={`Enter ${h.name}`}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {method !== 'GET' && body && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">JSON Request Body</p>
                      {jsonError && (
                        <span className="text-[8px] font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-1.5 py-0.5 rounded">
                          Invalid JSON
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      value={requestBody}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      className={`w-full bg-black/40 border rounded-2xl p-4 text-[11px] font-mono text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all ${
                        jsonError ? 'border-rose-500/40 focus:border-rose-500/50' : 'border-white/10'
                      }`}
                    />
                  </div>
                )}

                {/* Run Button */}
                <button
                  onClick={handleSendRequest}
                  disabled={responseState.loading || !!jsonError}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-accent-blue/15 hover:bg-accent-blue/20 text-accent-blue font-black uppercase text-[10px] tracking-widest border border-accent-blue/30 disabled:opacity-50 transition-all duration-300 cursor-pointer"
                >
                  {responseState.loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Play size={10} className="fill-accent-blue" />
                  )}
                  {responseState.loading ? 'Sending Request' : 'Send Live Request'}
                </button>
              </div>

              {/* Response console */}
              <div className="flex flex-col border border-white/5 bg-black/30 rounded-3xl overflow-hidden min-h-[300px]">
                {/* Panel Header */}
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Response console</p>
                  
                  {/* Status displays */}
                  {!responseState.loading && responseState.status && (
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <span className={`font-black ${responseState.status >= 200 && responseState.status < 300 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {responseState.status} {responseState.statusText}
                      </span>
                      {responseState.time && (
                        <span className="text-white/40">{responseState.time} ms</span>
                      )}
                      {responseState.size && (
                        <span className="text-white/40">{responseState.size}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Console Content */}
                <div className="flex-1 p-6 font-mono text-[11px] overflow-auto max-h-[480px]">
                  {responseState.loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-white/40 py-20">
                      <RefreshCw size={24} className="animate-spin text-accent-blue" />
                      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Running query...</p>
                    </div>
                  ) : responseState.error ? (
                    <div className="text-rose-400 bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl">
                      <p className="font-bold">Error: Connection Failed</p>
                      <p className="text-[10px] mt-2 opacity-80">{responseState.error}</p>
                    </div>
                  ) : responseState.data ? (
                    <pre className="text-emerald-300 leading-relaxed">
                      {JSON.stringify(responseState.data, null, 2)}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 py-20 text-center space-y-2">
                      <Terminal size={32} className="opacity-40" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Response Data</p>
                      <p className="text-[10px] max-w-xs leading-relaxed opacity-60">Configure parameters on the left and execute to inspect response buffers.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
