import React from 'react';
import { Terminal } from 'lucide-react';

export const BackendApiReference: React.FC = () => {
  const endpoints = [
    {
      method: 'POST',
      path: '/api/public/api-service',
      title: 'Create & Sign (One-step)',
      desc: 'Creates a new resource and returns its signed URL immediately.',
      headers: [
        { key: 'x-api-key', value: 'YOUR_API_KEY' },
        { key: 'x-api-secret', value: 'YOUR_API_SECRET' }
      ],
      body: {
        title: "My Code Snippet",
        code: "const x = 10;",
        expiryMinutes: 60
      },
      response: {
        success: true,
        data: {
          resourceId: "65f...",
          signedUrl: "...",
          signature: "...",
          expiresAt: 1715527800000
        }
      }
    },
    {
      method: 'POST',
      path: '/api/public/api-service/signed-url',
      title: 'Generate Signed URL',
      desc: 'Generates a temporary access URL for an existing resource.',
      headers: [
        { key: 'x-api-key', value: 'YOUR_API_KEY' },
        { key: 'x-api-secret', value: 'YOUR_API_SECRET' }
      ],
      body: {
        resourceId: "65f...",
        expiryMinutes: 120
      },
      response: {
        success: true,
        data: {
          signedUrl: "...",
          signature: "...",
          expiresAt: 1715527800000
        }
      }
    },
    {
      method: 'GET',
      path: '/api/public/api-service/:category/:id',
      title: 'Guest Resource Access',
      desc: 'Access a resource using a valid signature. No API keys required.',
      headers: [],
      query: [
        { key: 'signature', value: 'hmac_sha256_hash' },
        { key: 'expiresAt', value: 'timestamp' }
      ],
      response: {
        success: true,
        data: {
          _id: "...",
          title: "...",
          code: "..."
        }
      }
    }
  ];

  return (
    <section className="space-y-16">
      <div className="flex items-center gap-3 mb-8">
        <Terminal className="text-accent-blue" size={20} />
        <h2 className="text-2xl font-black uppercase tracking-tight">API Endpoint Reference</h2>
      </div>

      <div className="space-y-12">
        {endpoints.map((ep, i) => (
          <div key={i} className="group relative">
            {/* Method Badge & Path */}
            <div className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                ep.method === 'POST' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono text-white/80">{ep.path}</code>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{ep.title}</h3>
            <p className="text-sm text-white/40 mb-6">{ep.desc}</p>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Request Details */}
              <div className="space-y-4">
                <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Headers</p>
                  <div className="space-y-2">
                    {ep.headers.length > 0 ? ep.headers.map((h, j) => (
                      <div key={j} className="flex justify-between text-[11px] font-mono">
                        <span className="text-accent-blue">{h.key}</span>
                        <span className="text-white/40">{h.value}</span>
                      </div>
                    )) : <p className="text-[11px] text-white/20 italic">No authentication headers required</p>}
                  </div>
                  
                  {ep.body && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-6 mb-4">JSON Body</p>
                      <pre className="text-[10px] font-mono text-white/60 bg-black/40 p-4 rounded-xl overflow-x-auto">
                        {JSON.stringify(ep.body, null, 2)}
                      </pre>
                    </>
                  )}

                  {ep.query && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-6 mb-4">Query Parameters</p>
                      <div className="space-y-2">
                        {ep.query.map((q, j) => (
                          <div key={j} className="flex justify-between text-[11px] font-mono">
                            <span className="text-emerald-400">{q.key}</span>
                            <span className="text-white/40">{q.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Response Details */}
              <div className="space-y-4">
                <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl h-full">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Success Response (200/201)</p>
                  <pre className="text-[10px] font-mono text-white/60 bg-black/40 p-4 rounded-xl h-[calc(100%-2rem)] overflow-x-auto">
                    {JSON.stringify(ep.response, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
