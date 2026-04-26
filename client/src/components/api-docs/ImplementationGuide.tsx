import React from 'react';
import { ChevronRight, Shield, Code } from 'lucide-react';
import { API_URL } from '../../services/api/http.js';
import { DocSection, DocCodeBlock } from './DocComponents.js';

export const ImplementationGuide = () => {
  const fetchCode = `const API_URL = '${API_URL}';

async function createChat() {
  const res = await fetch(\`\${API_URL}/public/chat/conversation\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      apiKey: 'YOUR_API_KEY',
      apiSecret: 'YOUR_API_SECRET',
      name: 'Jane', 
      email: 'jane@example.com' 
    })
  });
  
  const { data } = await res.json();
  window.location.href = data.signedUrl;
}`;

  const iframeCode = `<iframe
  src="PASTE_SIGNED_URL_HERE"
  width="100%"
  height="600"
  frameBorder="0"
  allow="clipboard-read; clipboard-write; geolocation"
/>`;

  return (
    <DocSection title="Implementation Guide" icon={Code} id="implementation" accentColor="emerald">
       <div className="grid md:grid-cols-2 gap-12 pt-4">
          <div className="space-y-8">
             <div className="space-y-4">
               <h3 className="text-xl font-bold text-white">Client Side Integration</h3>
               <p className="text-gray-400 text-sm leading-relaxed">
                 We recommend using <span className="text-white font-bold">Axios</span> or <span className="text-white font-bold">Fetch API</span> for most integrations. For real-time updates (typing indicators, new messages), you should connect to our Socket.io namespace.
               </p>
             </div>
             
             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  Recommended Packages
                </h4>
                <div className="flex flex-wrap gap-3">
                   {['axios', 'socket.io-client', 'framer-motion'].map(pkg => (
                     <code key={pkg} className="px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] font-mono text-emerald-300">
                       npm install {pkg}
                     </code>
                   ))}
                </div>
             </div>
          </div>

          <DocCodeBlock 
            title="Fetch Implementation" 
            content={fetchCode} 
            variant="emerald" 
            language="JavaScript"
            icon={<Code size={14} />} 
          />
       </div>

       <div className="grid md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
          <div className="space-y-4">
             <div className="flex items-center gap-3 text-blue-400">
                <Shield size={18} />
                <h3 className="text-xl font-bold text-white">Embedding via Iframe</h3>
             </div>
             <p className="text-gray-400 text-sm leading-relaxed">
               The <code className="text-blue-300">signedUrl</code> returned by our API is a fully-featured frontend URL. You can embed it directly into your website or dashboard using a standard HTML <code className="text-white font-bold">iframe</code>.
             </p>
          </div>

          <DocCodeBlock 
            title="Iframe Embed Code" 
            content={iframeCode} 
            variant="blue" 
            language="HTML"
            icon={<ChevronRight size={14} />} 
          />
       </div>
    </DocSection>
  );
};
