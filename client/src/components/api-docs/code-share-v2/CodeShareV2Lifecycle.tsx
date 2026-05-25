import React from 'react';
import { Zap, GitCommit, RefreshCw, FolderOpen, Edit, FileCode } from 'lucide-react';

export const CodeShareV2Lifecycle: React.FC = () => {
  return (
    <div className="space-y-24">
      {/* 1. Initialization */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">2. Initializing V2 Workspace</h2>
        </div>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          Create a Git-like, multi-file code share project using your Management API Key. Send the initial project files and nested paths:
        </p>
        <div className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest bg-accent-blue/10 px-2 py-0.5 rounded">Endpoint</span>
            <span className="text-[10px] text-white/20 tracking-tighter">POST /api/public/api-service/code-share-v2</span>
          </div>
          <pre className="font-mono text-[10px] text-white/60 bg-black/20 p-4 rounded-xl overflow-x-auto">
{`{
  "title": "Production Server Layout",
  "files": [
    { "path": "package.json", "content": "{\\n  \\\"name\\\": \\\"server\\\"\\n}" },
    { "path": "src/index.ts", "content": "console.log('App running');" }
  ],
  "expiryMinutes": 1440
}`}
          </pre>
        </div>
      </section>

      {/* 2. Reading & Staging */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <FolderOpen className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">3. Reading & Lazy Loading</h2>
        </div>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          When loading the guest workspace, request the project structure with <code className="text-accent-blue">action: "v2-read"</code>. Small files (&lt;30KB) are preloaded inline. Large files are lazily streamed in 30KB chunks using <code className="text-accent-blue">action: "v2-get-file"</code> as the user views them.
        </p>
      </section>

      {/* 3. Staging and Committing */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <GitCommit className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">4. Committing Delta Changes</h2>
        </div>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          When edits occur, record changes locally as a set of file/folder modifications, creations, or deletions. Deliver only the delta changes in a single commit body to shift the project's HEAD:
        </p>
        <div className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest bg-accent-blue/10 px-2 py-0.5 rounded">Endpoint</span>
            <span className="text-[10px] text-white/20 tracking-tighter">POST /api/public/api-service/code-share-v2/:id</span>
          </div>
          <pre className="font-mono text-[10px] text-white/60 bg-black/20 p-4 rounded-xl overflow-x-auto">
{`{
  "action": "v2-commit",
  "message": "Implement database logging middleware",
  "changes": [
    { "path": "src/middleware/logger.ts", "type": "add", "content": "export const logger = ..." },
    { "path": "src/index.ts", "type": "modify", "content": "import { logger } from './middleware/logger';..." },
    { "path": "old-config.json", "type": "delete" }
  ]
}`}
          </pre>
        </div>
      </section>

      {/* 4. Renaming support */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Edit className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">5. File & Folder Renaming</h2>
        </div>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          Renaming is fully handled via smart staging:
          <br />
          - **File Rename**: Stages a <code className="text-accent-blue">delete</code> on the old path and an <code className="text-accent-blue">add</code> on the new path containing the same content.
          <br />
          - **Folder Rename**: Stages a <code className="text-accent-blue">delete-folder</code> on the old path, a <code className="text-accent-blue">create-folder</code> on the new path, and recursively stages cascade deletions and additions for all child files and subfolders.
        </p>
      </section>

      {/* 5. Downloading */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <RefreshCw className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">6. Bulk ZIP Downloads</h2>
        </div>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          Avoid sequentially requesting files. Fetch all file content strings and nested paths in a single bulk request with <code className="text-accent-blue">action: "v2-download-all"</code>. Combine this with Axios progress monitoring to show a download percentage.
        </p>
      </section>

      {/* Implementation Example */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <FileCode className="text-accent-blue" size={18} />
          <h2 className="text-xl font-black uppercase tracking-tight">Integration Example (TypeScript)</h2>
        </div>
        <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-3xl p-8 overflow-x-auto shadow-2xl">
          <pre className="font-mono text-[11px] text-white/60 leading-5 whitespace-pre">
{`import axios from 'axios';

// 1. Fetch entire workspace in one go for downloading
const downloadWorkspaceAsZip = async (projectTitle: string, resourceId: string, signature: string, expiresAt: number) => {
  const { data } = await axios.get(\`/api/public/api-service/code-share-v2/\${resourceId}\`, {
    params: {
      signature,
      expiresAt,
      action: 'v2-download-all'
    },
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(\`Downloading: \${percentCompleted}%\`);
      }
    }
  });

  const files = data.data.files;
  // Initialize JSZip and append files...
};`}
          </pre>
        </div>
      </section>
    </div>
  );
};
