// // // // import _React from '_React';
import { Terminal,  CheckCircle2 } from 'lucide-react';
import { DocSection, DocCodeBlock } from './DocComponents.js';

export const ImplementationGuide = () => {
  return (
    <DocSection title="Guide" icon={Terminal} id="implementation-guide" accentColor="purple">
      <p className="text-gray-400 text-sm max-w-2xl mb-12">
        Follow these steps to add movie booking to your site.
      </p>

      <div className="space-y-16">
        <div className="relative pl-12 border-l border-white/5 space-y-8">
          <div className="absolute left-[-17px] top-0 w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center text-blue-400 font-black text-xs">1</div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              Step 1: Get Your Link
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
              Ask the Admin API for a chat link. You'll need your keys.
            </p>
            <DocCodeBlock 
              title="Request Link" 
              content={`const res = await fetch('/public/chat/conversation', {
  method: 'POST',
  body: JSON.stringify({ apiKey: '...', apiSecret: '...' })
});`} 
            />
          </div>
        </div>

        <div className="relative pl-12 border-l border-white/5 space-y-8">
          <div className="absolute left-[-17px] top-0 w-8 h-8 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center justify-center text-purple-400 font-black text-xs">2</div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              Step 2: Show the Chat
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
              Put the link in an iframe on your page.
            </p>
            <DocCodeBlock 
              title="Add Iframe" 
              content={`<iframe 
  src={signedUrl} 
  style={{ width: '100%', height: '600px', border: 'none' }} 
/>`} 
            />
          </div>
        </div>

        <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] flex items-start gap-6">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 mt-1">
            <CheckCircle2 size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Done!</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your users can now book movies directly from your app.
            </p>
          </div>
        </div>
      </div>
    </DocSection>
  );
};
