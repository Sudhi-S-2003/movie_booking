import React from 'react';
import { Zap, Terminal } from 'lucide-react';

export const CodeShareLifecycle: React.FC = () => {
  return (
    <div className="space-y-24">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">2. Code Share Lifecycle</h2>
        </div>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          Use these actions to manage large code snippets via the <code className="text-accent-blue">POST /api/public/api-service</code> endpoint.
        </p>

        <div className="space-y-6">
          {/* Action: Start */}
          <div className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest bg-accent-blue/10 px-2 py-0.5 rounded">Action: start</span>
              <span className="text-[10px] text-white/20 tracking-tighter">Initiates a new upload session</span>
            </div>
            <pre className="font-mono text-[10px] text-white/60 bg-black/20 p-4 rounded-xl">
{`{
  "action": "start",
  "title": "Production Server Logic"
}`}
            </pre>
          </div>

          {/* Action: Chunk */}
          <div className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest bg-accent-blue/10 px-2 py-0.5 rounded">Action: chunk</span>
              <span className="text-[10px] text-white/20 tracking-tighter">Appends a content segment</span>
            </div>
            <pre className="font-mono text-[10px] text-white/60 bg-black/20 p-4 rounded-xl">
{`{
  "action": "chunk",
  "uploadId": "uuid-from-start-response",
  "content": "const x = 10;...",
  "afterChunkId": "previous-chunk-id" // Optional, for ordering
}`}
            </pre>
          </div>

          {/* Action: Complete */}
          <div className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest bg-accent-blue/10 px-2 py-0.5 rounded">Action: complete</span>
              <span className="text-[10px] text-white/20 tracking-tighter">Finalizes the resource</span>
            </div>
            <pre className="font-mono text-[10px] text-white/60 bg-black/20 p-4 rounded-xl">
{`{
  "action": "complete",
  "uploadId": "uuid-from-start-response",
  "targetId": "existing-code-share-id" // Optional, for updates
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Implementation Example */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">Implementation Example</h2>
        </div>
        <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-3xl p-8">
          <pre className="font-mono text-[11px] text-white/60 leading-5 overflow-x-auto">
{`const saveLargeCode = async (code) => {
  // 1. Start session
  const { uploadId } = await api.post('/api-service', { action: 'start', title: 'My Code' });

  // 2. Stream chunks
  const chunks = splitIntoChunks(code, 5000); // 5KB chunks
  let lastChunkId = null;

  for (const chunk of chunks) {
    const res = await api.post('/api-service', { 
      action: 'chunk', 
      uploadId, 
      content: chunk, 
      afterChunkId: lastChunkId 
    });
    lastChunkId = res.chunkId;
  }

  // 3. Complete
  await api.post('/api-service', { action: 'complete', uploadId });
};`}
          </pre>
        </div>
      </section>
    </div>
  );
};
