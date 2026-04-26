import React from 'react';
import { Key } from 'lucide-react';
import { EndpointCard } from './EndpointCard.js';
import { DocSection } from './DocComponents.js';

export const ManagementApi = () => {
  return (
    <DocSection title="Management API" icon={Key} id="management-api">
      <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 md:p-8 rounded-[2.5rem] space-y-4 mb-12">
        <div className="flex items-center gap-3 text-emerald-400">
          <Key size={18} />
          <h4 className="text-sm font-black uppercase tracking-widest">Authentication</h4>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          The Management API requires authentication for every request. Currently, this is handled by including your 
          <code className="text-emerald-300 font-mono mx-1">apiKey</code> and 
          <code className="text-emerald-300 font-mono mx-1">apiSecret</code> directly in the request body. 
          Keep these credentials secure and never expose them in client-side code.
        </p>
      </div>

      <div className="space-y-12">
        <EndpointCard
          method="POST"
          path="/public/chat/conversation"
          description="Create a new chat session for a guest user. This generates a signed URL that you can provide to your frontend for direct embedding."
          body={JSON.stringify({ 
            apiKey: "YOUR_KEY", 
            apiSecret: "YOUR_SECRET", 
            name: "Jane Cooper", 
            email: "jane@example.com", 
            expiryMinutes: 60 
          }, null, 2)}
          queryParams={[
            { name: 'apiKey', type: 'string', required: true, description: 'Your public API Key.' },
            { name: 'apiSecret', type: 'string', required: true, description: 'Your secret API Key.' },
            { name: 'name', type: 'string', required: true, description: 'Guest\'s full name for the conversation.' },
            { name: 'email', type: 'string', required: true, description: 'Guest\'s email address for notifications.' },
            { name: 'expiryMinutes', type: 'number', required: false, description: 'Session duration in minutes.', default: '5' },
          ]}
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
          description="Refresh or generate a new signed URL for an existing conversation ID. Useful for restoring sessions."
          body={JSON.stringify({ 
            apiKey: "YOUR_KEY", 
            apiSecret: "YOUR_SECRET", 
            conversationId: "662a...", 
            expiryMinutes: 30 
          }, null, 2)}
          queryParams={[
            { name: 'apiKey', type: 'string', required: true, description: 'Your public API Key.' },
            { name: 'apiSecret', type: 'string', required: true, description: 'Your secret API Key.' },
            { name: 'conversationId', type: 'string', required: true, description: 'The unique ID of the conversation.' },
            { name: 'expiryMinutes', type: 'number', required: false, description: 'New expiry duration for the URL.' },
          ]}
          response={JSON.stringify({
            success: true,
            data: {
              signedUrl: "https://cinemaconnect.app/chat/662a...?signature=xyz&expiresAt=456",
              expiresAt: 1714043400000
            }
          }, null, 2)}
        />
      </div>
    </DocSection>
  );
};
