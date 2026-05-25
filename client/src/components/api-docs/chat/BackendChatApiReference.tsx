import React, { memo } from 'react';
import { Terminal } from 'lucide-react';
import { EndpointCard } from '../EndpointCard.js';
import { CHAT_ENDPOINTS } from '../constants/index.js';

export const BackendChatApiReference: React.FC = memo(() => {
  return (
    <section className="space-y-16 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <Terminal className="text-accent-blue" size={20} />
        <h2 className="text-2xl font-black uppercase tracking-tight">API Endpoint Reference (Chat)</h2>
      </div>

      <div className="space-y-16">
        {CHAT_ENDPOINTS.map((ep, i) => (
          <EndpointCard
            key={i}
            method={ep.method}
            path={ep.path}
            title={ep.title}
            description={ep.description}
            headers={ep.headers}
            pathParams={ep.pathParams}
            queryParams={ep.queryParams}
            body={ep.body}
            response={ep.response}
            status={ep.status}
            tag={ep.tag}
          />
        ))}
      </div>
    </section>
  );
});

export default BackendChatApiReference;
