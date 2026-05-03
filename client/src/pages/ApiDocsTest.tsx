// // // // import _React from '_React';
import { SEO } from '../components/common/SEO.js';
import { DashboardPage } from '../components/dashboard/DashboardPage.js';
import { EndpointCard } from '../components/api-docs/EndpointCard.js';
import { DocSection, DocCodeBlock, ParamTable } from '../components/api-docs/DocComponents.js';
import { Beaker, Globe, Shield, Terminal } from 'lucide-react';
import { SITE_CONFIG } from '../config/site.config.js';

export const ApiDocsTest = () => {

  return (
    <DashboardPage
      title="Component"
      accent="Playground"
      subtitle="Testing the reusability of our documentation atoms."
      accentColor="text-purple-400"
    >
      <SEO title="API Component Test" description="Internal tool for testing documentation components." />
      <div className="max-w-5xl mx-auto space-y-24 pb-32">
        
        {/* Test Section 1: EndpointCard */}
        <DocSection title="EndpointCard Test" icon={Beaker} id="endpoints">
          <p className="text-gray-400 text-sm italic">
            This card is being used outside of the main ApiDocsPage to verify style encapsulation.
          </p>
          <EndpointCard 
            method="PATCH"
            path="/v1/test/reusability/:id"
            description="A test endpoint to see how the card looks in a different layout context."
            status="Beta"
            tag="INTERNAL"
            onTryItOut={() => alert('Component action triggered!')}
            pathParams={[
              { name: 'id', type: 'uuid', required: true, description: 'The unique identifier for the test resource.' }
            ]}
            headers={[
              { name: 'X-Test-Header', type: 'string', required: false, description: 'Optional header for debugging.', default: 'play-store' }
            ]}
            body={JSON.stringify({ status: "active", metadata: { key: "value" } }, null, 2)}
            response={JSON.stringify({ success: true, message: "Modular components are working!" }, null, 2)}
          />
        </DocSection>

        {/* Test Section 2: Direct Atom Usage */}
        <DocSection title="Direct Atom Usage" icon={Globe} id="atoms" accentColor="purple">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <h4 className="text-white font-bold text-lg">Collapsible ParamTable</h4>
              <ParamTable 
                title="Config Options"
                defaultOpen={false}
                params={[
                  { name: 'debug', type: 'boolean', required: false, description: 'Enable verbose logging.', default: 'false' },
                  { name: 'retries', type: 'number', required: false, description: 'Count of retry attempts.', default: '3' }
                ]}
                icon={<Shield size={14} className="text-amber-400" />}
              />
            </div>
            
            <div className="space-y-8">
              <h4 className="text-white font-bold text-lg">Independent CodeBlock</h4>
              <DocCodeBlock 
                title="CLI Example"
                content={`curl -X GET https://api.${SITE_CONFIG.domain}/v1/health \\\n  -H 'Authorization: Bearer YOUR_TOKEN'`}
                variant="blue"
                icon={<Terminal size={14} />}
              />
            </div>
          </div>
        </DocSection>

      </div>
    </DashboardPage>
  );
};
