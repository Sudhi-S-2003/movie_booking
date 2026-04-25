import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Key, KeyRound, Plus, Book } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';
import { MembersPagination } from '../chat-members/MembersPagination.js';
import { useApiKeys } from './hooks/useApiKeys.js';
import { ApiKeyRow } from './ApiKeyRow.js';
import { CreateApiKeyModal } from './CreateApiKeyModal.js';
import { RevealSecretModal } from './RevealSecretModal.js';

/**
 * `/{role}/api-keys` — key management screen.
 *
 * Any authenticated user can mint, view, and revoke their own keys. The
 * raw secret is shown once via `RevealSecretModal` right after creation;
 * the list view only ever stores `keyId` + metadata.
 */
export const ApiKeysPage = () => {
  useDocumentTitle('API Keys — CinemaConnect');

  const {
    keys, pagination, loading, error,
    lastCreated, clearLastCreated,
    goToPage, create, revoke,
  } = useApiKeys();

  const [createOpen, setCreateOpen] = useState(false);
  const location = useLocation();
  const docsPath = location.pathname.replace('/api-keys', '/api-docs');

  return (
    <>
      <DashboardPage
        title="API"
        accent="Keys"
        accentColor="text-emerald-400"
        subtitle="Credentials for programmatic access"
        headerActions={
          <div className="flex items-center gap-3">
            <Link
              to={docsPath}
              className="px-6 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 hover:text-white transition-all underline underline-offset-4 decoration-white/20"
            >
              <Book size={14} /> View API Docs
            </Link>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-6 py-3 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-accent-blue/15 transition-all"
            >
              <Plus size={14} /> New Key
            </button>
          </div>
        }
      >
        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <KeyRound size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Total</p>
                <p className="text-2xl font-black tracking-tight text-white">{pagination.total}</p>
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 max-w-[48%] text-right hidden sm:block">
              Secrets are stored as hashes — they're shown once on creation and
              are never retrievable afterward.
            </p>
          </div>

          {error && (
            <div className="px-8 py-3 border-b border-rose-500/20 bg-rose-500/5 text-[11px] font-bold text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-16 text-center">
              <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto" />
            </div>
          ) : keys.length === 0 ? (
            <div className="p-20 text-center space-y-3">
              <Key size={40} className="mx-auto text-gray-800" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
                No API keys yet
              </p>
              <p className="text-[11px] text-gray-600 max-w-xs mx-auto">
                Create one to authenticate programmatic access to your account.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {keys.map((k) => <ApiKeyRow key={k._id} apiKey={k} onRevoke={revoke} />)}
            </ul>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-8 py-5 border-t border-white/5 flex-wrap">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                Showing {keys.length} of {pagination.total}
              </p>
              <MembersPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                disabled={loading}
                onChange={goToPage}
                size="lg"
              />
            </div>
          )}
        </div>
      </DashboardPage>

      <CreateApiKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (body) => { await create(body); }}
      />

      <RevealSecretModal
        created={lastCreated}
        onClose={clearLastCreated}
      />
    </>
  );
};
