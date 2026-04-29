// // // // import _React from '_React';
import { Book, Globe, Shield } from 'lucide-react';
import { API_URL } from '../../services/api/http.js';
import { DocSection, DocCodeBlock } from './DocComponents.js';

export const GettingStarted = () => {
  return (
    <DocSection title="Start Here" icon={Book} id="getting-started" accentColor="blue">
      <p className="text-gray-400 text-sm max-w-2xl">
        Integrate movie booking features into your apps easily.
      </p>

      <div className="grid md:grid-cols-2 gap-8 pt-4">
        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <Globe size={20} />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">URL</h3>
            <p className="text-gray-400 text-sm">Send all requests to this URL.</p>
          </div>
          <DocCodeBlock 
            title="API URL" 
            content={API_URL} 
            variant="amber" 
            icon={<Globe size={14} />} 
          />
        </div>

        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
            <Shield size={20} />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Authentication</h3>
            <p className="text-gray-400 text-sm">Send your API keys in the request body.</p>
          </div>
          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3 font-mono text-[10px]">
            <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg"><span className="text-gray-500">apiKey:</span> <span className="text-rose-400 font-black">YOUR_API_KEY</span></div>
            <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg"><span className="text-gray-500">apiSecret:</span> <span className="text-rose-400 font-black">YOUR_API_SECRET</span></div>
          </div>
        </div>
      </div>
    </DocSection>
  );
};
