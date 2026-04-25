import React from 'react';
import { MessageSquare, Shield } from 'lucide-react';
import { EndpointCard } from './EndpointCard.js';

export const GuestApi = () => {
  return (
    <section className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <MessageSquare size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Guest API</h2>
          <p className="text-gray-500 text-sm uppercase tracking-widest font-black text-[10px]">Authenticated via URL Signature</p>
        </div>
      </div>

      <div className="bg-purple-500/5 border border-purple-500/10 p-6 rounded-[32px] space-y-3">
         <div className="flex items-center gap-3 text-purple-400">
            <Shield size={16} />
            <h4 className="text-sm font-bold uppercase tracking-wider">Signature Verification</h4>
         </div>
         <p className="text-xs text-gray-400 leading-relaxed">
           The Guest API does not require an API key header. Instead, it relies on the <code className="text-purple-300">signature</code> and <code className="text-purple-300">expiresAt</code> query parameters provided in the signed URL. These are verified on every request to ensure the guest's session is valid and authorized.
         </p>
      </div>

      <div className="space-y-6">
        <EndpointCard
          method="GET"
          path="/public/chat/conversation/:id"
          description="Retrieve conversation metadata and peer info."
          params={[
            { name: 'signature', type: 'string', required: true, description: 'HMAC signature for authorization.' },
            { name: 'expiresAt', type: 'number', required: true, description: 'Expiration timestamp (ms).' },
          ]}
          response={JSON.stringify({
            success: true,
            conversation: {
              _id: "662a...",
              peer: { name: "Support Agent", username: "agent_01", avatar: "..." }
            }
          }, null, 2)}
        />

        <EndpointCard
          method="GET"
          path="/public/chat/conversation/:id/messages"
          description="List messages with pagination support."
          params={[
            { name: 'signature', type: 'string', required: true, description: 'HMAC signature for authorization.' },
            { name: 'expiresAt', type: 'number', required: true, description: 'Expiration timestamp (ms).' },
            { name: 'limit', type: 'number', required: false, description: 'Results per page. Max 100.' },
            { name: 'before', type: 'string', required: false, description: 'Message ID to fetch before.' },
            { name: 'after', type: 'string', required: false, description: 'Message ID to fetch after.' },
          ]}
          response={JSON.stringify({
            success: true,
            messages: [{ _id: "msg_01", text: "Hello!", senderName: "Support Agent", isYou: false }],
            hasOlder: false,
            hasNewer: false
          }, null, 2)}
        />

        <EndpointCard
          method="POST"
          path="/public/chat/conversation/:id/messages"
          description="Send a message to the conversation."
          params={[
            { name: 'signature', type: 'string', required: true, description: 'HMAC signature for authorization.' },
            { name: 'expiresAt', type: 'number', required: true, description: 'Expiration timestamp (ms).' },
            { name: 'text', type: 'string', required: false, description: 'Plain text content.' },
            { name: 'emoji', type: 'string', required: false, description: 'Emoji skin/code if standalone.' },
            { name: 'contentType', type: 'enum', required: true, description: '"text" | "emoji" | "image" | ...' },
          ]}
          payload={JSON.stringify({ text: "Thanks for the help!", contentType: "text" }, null, 2)}
          response={JSON.stringify({
            success: true,
            message: { _id: "msg_99", text: "Thanks for the help!", deliveryStatus: "sent", isYou: true }
          }, null, 2)}
        />
      </div>
    </section>
  );
};
