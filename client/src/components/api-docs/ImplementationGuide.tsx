import React from 'react';
import { ChevronRight, Copy, Shield, Check } from 'lucide-react';
import { API_URL } from '../../services/api/http.js';

export const ImplementationGuide = () => {
  const [copiedFetch, setCopiedFetch] = React.useState(false);
  const [copiedIframe, setCopiedIframe] = React.useState(false);

  const handleCopy = (text: string, type: 'fetch' | 'iframe') => {
    navigator.clipboard.writeText(text);
    if (type === 'fetch') {
      setCopiedFetch(true);
      setTimeout(() => setCopiedFetch(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
  };

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
    <section className="p-12 bg-gradient-to-br from-blue-500/10 via-transparent to-emerald-500/10 border border-white/5 rounded-[48px] space-y-8">
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <ChevronRight size={24} />
          </div>
          <h2 className="text-2xl font-black text-white">Client Side Implementation</h2>
       </div>

       <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
             <p className="text-gray-400 text-sm leading-relaxed">
               We recommend using <span className="text-white font-bold">Axios</span> or <span className="text-white font-bold">Fetch API</span> for most integrations. For real-time updates (typing indicators, new messages), you should connect to our Socket.io namespace.
             </p>
             <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Recommended Packages</h4>
                <div className="flex flex-wrap gap-2">
                   {['axios', 'socket.io-client', 'framer-motion', 'lucide-react'].map(pkg => (
                     <span key={pkg} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-blue-300">
                       npm install {pkg}
                     </span>
                   ))}
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Simple Fetch Example</span>
                <button 
                  onClick={() => handleCopy(fetchCode, 'fetch')} 
                  className={`transition-colors ${copiedFetch ? 'text-emerald-400' : 'text-gray-600 hover:text-white'}`}
                >
                  {copiedFetch ? <Check size={14} /> : <Copy size={14} />}
                </button>
             </div>
             <pre className="p-6 bg-slate-950 rounded-3xl border border-white/5 text-[11px] font-mono text-emerald-100/80 leading-6 overflow-x-auto">
               {fetchCode}
             </pre>
          </div>
       </div>

       <div className="grid md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
          <div className="space-y-4">
             <div className="flex items-center gap-3 text-blue-400">
                <Shield size={18} />
                <h3 className="text-lg font-bold">Embedding via Iframe</h3>
             </div>
             <p className="text-gray-400 text-sm leading-relaxed">
               The <code className="text-blue-300">signedUrl</code> returned by our API is a fully-featured frontend URL. You can embed it directly into your website or dashboard using a standard HTML <code className="text-white font-bold">iframe</code>. This provides a plug-and-play experience with zero custom UI effort.
             </p>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Iframe Example</span>
                <button 
                  onClick={() => handleCopy(iframeCode, 'iframe')} 
                  className={`transition-colors ${copiedIframe ? 'text-blue-400' : 'text-gray-600 hover:text-white'}`}
                >
                  {copiedIframe ? <Check size={14} /> : <Copy size={14} />}
                </button>
             </div>
             <pre className="p-6 bg-slate-950 rounded-3xl border border-white/5 text-[11px] font-mono text-blue-100/80 leading-6 overflow-x-auto">
               {iframeCode}
             </pre>
          </div>
       </div>
    </section>
  );
};
