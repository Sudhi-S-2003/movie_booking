import { Route, Navigate } from 'react-router-dom';
import { Chat } from '../pages/Chat.js';
import { ChatMembers } from '../pages/ChatMembers.js';
import { ChatJoinRequests } from '../pages/ChatJoinRequests.js';
import { ApiKeys } from '../pages/ApiKeys.js';
import { ApiDocs } from '../pages/ApiDocs.js';
import { CodeShareDocsPage } from '../pages/CodeShareDocsPage.js';
import { CodeShareV2DocsPage } from '../pages/CodeShareV2DocsPage.js';
import { ChatDocsPage } from '../pages/ChatDocsPage.js';
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

export const CommonDashboardRoutes = () => {
  return (
    <>
      <Route path="chat" element={<Chat />} />
      <Route path="chat/:conversationId" element={<Chat />} />
      <Route path="chat/:conversationId/members" element={<ChatMembers />} />
      <Route path="chat/:conversationId/join-requests" element={<ChatJoinRequests />} />
      <Route path="api-keys" element={<ApiKeys />} />
      <Route path="api-docs" element={<ApiDocs />} />
      <Route path="api-docs/code-share" element={<CodeShareDocsPage />} />
      <Route path="api-docs/code-share-v2" element={<CodeShareV2DocsPage />} />
      <Route path="api-docs/chat" element={<ChatDocsPage />} />
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
