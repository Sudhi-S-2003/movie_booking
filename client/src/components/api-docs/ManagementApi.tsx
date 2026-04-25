import React from 'react';
import { Lock } from 'lucide-react';
import { EndpointCard } from './EndpointCard.js';

export const ManagementApi = () => {
  return (
    <section className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Lock size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Management API</h2>
          <p className="text-gray-500 text-sm uppercase tracking-widest font-black text-[10px]">Authenticated via Request Body (apiKey & apiSecret)</p>
        </div>
      </div>

      <div className="space-y-6">
        <EndpointCard
          method="POST"
          path="/public/chat/conversation"
          description="Create a new chat session for a guest user."
          params={[
            { name: 'apiKey', type: 'string', required: true, description: 'Your public API Key.' },
            { name: 'apiSecret', type: 'string', required: true, description: 'Your secret API Key.' },
            { name: 'name', type: 'string', required: true, description: 'Guest\'s full name.' },
            { name: 'email', type: 'string', required: true, description: 'Guest\'s email address.' },
            { name: 'expiryMinutes', type: 'number', required: false, description: 'Session duration in minutes. Default: 5' },
          ]}
          payload={JSON.stringify({ apiKey: "YOUR_KEY", apiSecret: "YOUR_SECRET", name: "Jane Cooper", email: "jane@example.com", expiryMinutes: 60 }, null, 2)}
          response={JSON.stringify({
            success: true,
            data: {
              conversation: { _id: "662a...", name: "Jane Cooper" },
              signedUrl: "https://cinemaconnect.app/chat/662a...?signature=abc&expiresAt=123",
              expiresAt: 1714041600000
            }
          }, null, 2)}
        />

        <EndpointCard
          method="POST"
          path="/public/chat/conversation/signed-url"
          description="Generate a fresh signed URL for an existing conversation."
          params={[
            { name: 'apiKey', type: 'string', required: true, description: 'Your public API Key.' },
            { name: 'apiSecret', type: 'string', required: true, description: 'Your secret API Key.' },
            { name: 'conversationId', type: 'string', required: true, description: 'ID of the existing conversation.' },
            { name: 'expiryMinutes', type: 'number', required: false, description: 'New expiry duration.' },
          ]}
          payload={JSON.stringify({ apiKey: "YOUR_KEY", apiSecret: "YOUR_SECRET", conversationId: "662a...", expiryMinutes: 30 }, null, 2)}
          response={JSON.stringify({
            success: true,
            data: {
              signedUrl: "https://cinemaconnect.app/chat/662a...?signature=xyz&expiresAt=456",
              expiresAt: 1714043400000
            }
          }, null, 2)}
        />
      </div>
    </section>
  );
};
