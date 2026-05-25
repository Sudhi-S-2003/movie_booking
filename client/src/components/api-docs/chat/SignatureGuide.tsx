import React from 'react';
import { Key, Terminal } from 'lucide-react';

export const SignatureGuide: React.FC = () => {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <Key className="text-accent-blue" size={18} />
        <h2 className="text-xl font-black uppercase tracking-tight">1. Generating Signed URLs</h2>
      </div>
      <p className="text-sm text-white/50 mb-8 leading-relaxed">
        Before redirecting a user to a protected resource, you must generate a signature. 
        Use your API Key and Secret to call the signing endpoint for the <code className="text-accent-blue">chat</code> category.
      </p>
      
      <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl mb-8">
        <div className="px-6 py-4 border-b border-white/[0.05] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-accent-blue text-[9px] font-black uppercase rounded">POST</span>
            <span className="text-[10px] font-mono text-white/60">/api/public/api-service/signed-url</span>
          </div>
        </div>
        <div className="p-8">
          <pre className="font-mono text-xs text-white/80 overflow-x-auto leading-6">
{`// Request Body
{
  "resourceId": "conversation_uuid_here",
  "expiryMinutes": 60
}

// Response
{
  "success": true,
  "data": {
    "signedUrl": "https://yourapp.com/chat/conversation_uuid?signature=...",
    "expiresAt": 1715527800000,
    "signature": "8a2f..."
  }
}`}
          </pre>
        </div>
      </div>

      <div className="bg-accent-blue/[0.02] border border-accent-blue/10 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Terminal size={40} className="text-accent-blue" />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue mb-4">Quick Test (cURL)</h4>
        <pre className="font-mono text-[10px] text-white/40 leading-5 whitespace-pre-wrap">
{`curl -X POST http://localhost:5000/api/public/api-service/signed-url \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-api-secret: YOUR_API_SECRET" \\
  -d '{
    "resourceId": "YOUR_CONVERSATION_ID",
    "expiryMinutes": 60
  }'`}
        </pre>
      </div>
    </section>
  );
};
