import React from 'react';
import { Book, Globe, Shield } from 'lucide-react';
import { API_URL } from '../../services/api/http.js';

export const GettingStarted = () => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Book size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Getting Started</h2>
          <p className="text-gray-500 text-sm">Welcome to the CinemaConnect API. Our API allows you to integrate chat and booking features into your own applications.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-4">
        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <Globe size={20} />
          </div>
          <h3 className="text-lg font-bold text-white">Base URL</h3>
          <p className="text-gray-400 text-sm">All API requests should be made to our primary endpoint:</p>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Internal Example</p>
              <code className="text-gray-400 text-[10px] font-mono break-all block px-3 py-2 bg-black/20 rounded-lg border border-white/5">
                const API_URL = '${API_URL}';
              </code>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Current Active Endpoint
              </p>
              <code className="text-emerald-400 text-xs font-black font-mono break-all block">
                {API_URL}
              </code>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-4">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
            <Shield size={20} />
          </div>
          <h3 className="text-lg font-bold text-white">Authentication</h3>
          <p className="text-gray-400 text-sm">Authenticate your requests by including your credentials in the <span className="text-white font-bold underline underline-offset-4 decoration-rose-500/50">Request Body</span>:</p>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2 font-mono text-[10px]">
            <div className="flex justify-between"><span className="text-gray-500">apiKey:</span> <span className="text-rose-400 font-bold">YOUR_API_KEY</span></div>
            <div className="flex justify-between"><span className="text-gray-500">apiSecret:</span> <span className="text-rose-400 font-bold">YOUR_API_SECRET</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};
