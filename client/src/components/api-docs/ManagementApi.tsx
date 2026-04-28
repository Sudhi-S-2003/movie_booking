import React from 'react';
import { Key } from 'lucide-react';
import { EndpointCard } from './EndpointCard.js';
import { DocSection } from './DocComponents.js';

export const ManagementApi = () => {
  return (
    <DocSection title="Admin API" icon={Key} id="management-api">
      <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 md:p-8 rounded-[2.5rem] space-y-4 mb-12">
        <div className="flex items-center gap-3 text-emerald-400">
          <Key size={18} />
          <h4 className="text-sm font-black uppercase tracking-widest">Login</h4>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Use your keys for all requests. Put them in the request body.
        </p>
      </div>

      <div className="space-y-12">
        <EndpointCard
          method="POST"
          path="/public/chat/conversation"
          description="Start a chat. You get a link for your app."
          body={JSON.stringify({ 
            apiKey: "YOUR_KEY", 
            apiSecret: "YOUR_SECRET", 
            name: "Jane Cooper", 
            email: "jane@example.com", 
            expiryMinutes: 60 
          }, null, 2)}
          queryParams={[
            { name: 'apiKey', type: 'string', required: true, description: 'Your public key.' },
            { name: 'apiSecret', type: 'string', required: true, description: 'Your private key.' },
            { name: 'name', type: 'string', required: true, description: 'User name.' },
            { name: 'email', type: 'string', required: true, description: 'User email.' },
            { name: 'expiryMinutes', type: 'number', required: false, description: 'Link time (mins).', default: '5' },
          ]}
          response={JSON.stringify({
            success: true,
            data: {
              conversation: { _id: "662a...", name: "Jane Cooper" },
              signedUrl: "https://site.com/chat/662a...?sig=abc",
              expiresAt: 1714041600000
            }
          }, null, 2)}
        />

        <EndpointCard
          method="POST"
          path="/public/chat/conversation/signed-url"
          description="Get a new link for a chat."
          body={JSON.stringify({ 
            apiKey: "YOUR_KEY", 
            apiSecret: "YOUR_SECRET", 
            conversationId: "662a...", 
            expiryMinutes: 30 
          }, null, 2)}
          queryParams={[
            { name: 'apiKey', type: 'string', required: true, description: 'Your public key.' },
            { name: 'apiSecret', type: 'string', required: true, description: 'Your private key.' },
            { name: 'conversationId', type: 'string', required: true, description: 'The chat ID.' },
            { name: 'expiryMinutes', type: 'number', required: false, description: 'New link time.' },
          ]}
          response={JSON.stringify({
            success: true,
            data: {
              signedUrl: "https://site.com/chat/662a...?sig=xyz",
              expiresAt: 1714043400000
            }
          }, null, 2)}
        />
      </div>
    </DocSection>
  );
};
