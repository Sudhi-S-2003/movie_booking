// // // // import _React from '_React';
import { Shield } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/index.js';
import { SessionManager } from './components/SessionManager.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const SessionsPage = () => {
  useDocumentTitle('Security & Sessions — CinemaConnect');

  return (
    <DashboardPage
      title="Security"
      accent="Sessions"
      headerActions={
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">End-to-End Encrypted</span>
        </div>
      }
    >
      <div className="max-w-4xl">
        <SessionManager />
      </div>
    </DashboardPage>
  );
};

export default SessionsPage;
