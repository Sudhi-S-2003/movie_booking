import React from 'react';
import { User } from 'lucide-react';
import { EndpointCard } from './EndpointCard.js';
import { DocSection } from './DocComponents.js';

export const GuestApi = () => {
  return (
    <DocSection title="Guest API" icon={User} id="guest-api">
      <div className="bg-blue-500/5 border border-blue-500/10 p-6 md:p-8 rounded-[2.5rem] space-y-4 mb-12">
        <div className="flex items-center gap-3 text-blue-400">
          <User size={18} />
          <h4 className="text-sm font-black uppercase tracking-widest">Guest Access</h4>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Use these to get movie and theatre info for your users.
        </p>
      </div>

      <div className="space-y-12">
        <EndpointCard
          method="GET"
          path="/movies"
          description="Get all movies."
          queryParams={[
            { name: 'limit', type: 'number', required: false, description: 'Number of movies.', default: '10' },
            { name: 'city', type: 'string', required: false, description: 'Filter by city.' },
          ]}
          response={JSON.stringify({
            success: true,
            data: [
              { id: "1", title: "Interstellar", rating: 8.7 },
              { id: "2", title: "Inception", rating: 8.8 }
            ]
          }, null, 2)}
        />

        <EndpointCard
          method="GET"
          path="/theatres"
          description="Get all theatres."
          queryParams={[
            { name: 'city', type: 'string', required: true, description: 'City name.' },
          ]}
          response={JSON.stringify({
            success: true,
            data: [
              { id: "101", name: "Grand Cinema", city: "New York" },
              { id: "102", name: "Star IMAX", city: "New York" }
            ]
          }, null, 2)}
        />
      </div>
    </DocSection>
  );
};
