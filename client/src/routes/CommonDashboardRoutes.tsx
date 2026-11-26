import { Route, Navigate } from 'react-router-dom';
import { Chat } from '../pages/Chat.js';
import { ChatMembers } from '../pages/ChatMembers.js';
import { ChatJoinRequests } from '../pages/ChatJoinRequests.js';
import { ApiKeys } from '../pages/ApiKeys.js';
import { Integrations } from '../pages/Integrations.js';
import { ChatbotList } from '../pages/chatbot/ChatbotList.js';
import { ChatbotCreate } from '../pages/chatbot/ChatbotCreate.js';
import { ChatbotDetailLayout } from '../pages/chatbot/ChatbotDetailLayout.js';
import { ChatbotOverview } from '../pages/chatbot/tabs/ChatbotOverview.js';
import { ChatbotVariables } from '../pages/chatbot/tabs/ChatbotVariables.js';
import { ChatbotKeywords } from '../pages/chatbot/tabs/ChatbotKeywords.js';
import { ChatbotTemplates } from '../pages/chatbot/tabs/ChatbotTemplates.js';
import { ChatbotFlows } from '../pages/chatbot/tabs/ChatbotFlows.js';
import { ChatbotMenus } from '../pages/chatbot/tabs/ChatbotMenus.js';
import { ChatbotForms } from '../pages/chatbot/tabs/ChatbotForms.js';
import { SecurityLayout } from '../components/layout/SecurityLayout.js';
import { TwoFactorManager } from '../components/auth/TwoFactorManager.js';
import { PasskeyManager } from '../components/auth/PasskeyManager.js';
import SessionsPage from '../pages/dashboards/SessionsPage.js';
import { ServicesPage } from '../features/services/ServicesPage.js';
import { BillingPage } from '../features/billing/BillingPage.js';
import { CustomersPage } from '../features/customers/CustomersPage.js';
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage.js';
import { PricingPage } from '../features/pricing/PricingPage.js';
import { PlatformOverviewPage } from '../features/admin/PlatformOverviewPage.js';
import { ApplicationsPage } from '../features/admin/ApplicationsPage.js';
import { AuditPage } from '../features/admin/AuditPage.js';
import { AccountPage } from '../features/account/AccountPage.js';
import { ApiDocsPage } from '../features/developer/ApiDocsPage.js';

export const CommonDashboardRoutes = () => {
  return (
    <>
      {/* Platform core — available in every dashboard area; the server enforces permissions. */}
      <Route path="services" element={<ServicesPage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="customers/:id" element={<CustomerDetailPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="platform" element={<PlatformOverviewPage />} />
      <Route path="applications" element={<ApplicationsPage />} />
      <Route path="audit" element={<AuditPage />} />
      <Route path="chat" element={<Chat />} />
      <Route path="chat/:conversationId" element={<Chat />} />
      <Route path="chat/:conversationId/members" element={<ChatMembers />} />
      <Route path="chat/:conversationId/join-requests" element={<ChatJoinRequests />} />
      <Route path="api-keys" element={<ApiKeys />} />
      <Route path="api-docs" element={<ApiDocsPage />} />
      <Route path="api-docs/:section" element={<ApiDocsPage />} />
      <Route path="integrations" element={<Integrations />} />
      <Route path="chatbots" element={<ChatbotList />} />
      <Route path="chatbots/new" element={<ChatbotCreate />} />
      <Route path="chatbots/:id" element={<ChatbotDetailLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ChatbotOverview />} />
        <Route path="variables" element={<ChatbotVariables />} />
        <Route path="keywords" element={<ChatbotKeywords />} />
        <Route path="templates" element={<ChatbotTemplates />} />
        <Route path="flow-builder" element={<ChatbotFlows />} />
        <Route path="menu-builder" element={<ChatbotMenus />} />
        <Route path="form-builder" element={<ChatbotForms />} />
      </Route>
      <Route path="security" element={<SecurityLayout />}>
        <Route index element={<Navigate to="2fa" replace />} />
        <Route path="2fa" element={<TwoFactorManager />} />
        <Route path="pass-key" element={<PasskeyManager />} />
        <Route path="sessions" element={<SessionsPage />} />
      </Route>
    </>
  );
};
