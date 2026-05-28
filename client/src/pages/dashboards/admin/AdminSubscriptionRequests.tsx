import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, ChevronDown, Building2 } from 'lucide-react';

import { adminApi, type SubscriptionRequest } from '../../../services/api/admin.api.js';

type RequestStatus = 'pending' | 'approved' | 'rejected';

const statusConfig: Record<RequestStatus, { label: string; icon: React.ReactNode; classes: string }> = {
  pending:  { label: 'Pending',  icon: <Clock size={12} />,       classes: 'bg-amber-400/10 text-amber-300 border-amber-400/30' },
  approved: { label: 'Approved', icon: <CheckCircle2 size={12} />, classes: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' },
  rejected: { label: 'Rejected', icon: <XCircle size={12} />,    classes: 'bg-red-400/10 text-red-300 border-red-400/30' },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1_000).toFixed(0)}K`;

export const AdminSubscriptionRequests = () => {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [filter, setFilter]     = useState<RequestStatus | 'all'>('all');
  const [modal, setModal]       = useState<{ req: SubscriptionRequest; action: 'approve' | 'reject' } | null>(null);
  const [note, setNote]         = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSubscriptionRequests({ status: filter === 'all' ? undefined : filter });
      setRequests(res.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!modal) return;
    try {
      await adminApi.updateSubscriptionRequest(
        modal.req._id, 
        modal.action === 'approve' ? 'approved' : 'rejected', 
        note, 
        modal.action === 'approve' ? discountPct : undefined
      );
      await fetchRequests();
    } catch (err) {
      console.error(err);
    }
    setModal(null);
    setNote('');
    setDiscountPct(0);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Admin</span>
          <h1 className="mt-1 text-3xl font-black text-white tracking-tight">Enterprise Requests</h1>
          <p className="mt-1 text-[12px] text-white/40 font-bold">
            Review and action custom subscription requests from users.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-widest">
            <Clock size={12} /> {pendingCount} pending
          </span>
        )}
      </div>

      {/* Note: mock data removed */}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === f
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-white/[0.06] text-white/40 hover:text-white/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm font-bold">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm font-bold">No requests found.</div>
        ) : (
          requests.map((req) => {
          const s = statusConfig[req.status];
          const isExpanded = expanded === req._id;
          return (
            <div
              key={req._id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            >
              {/* Row */}
              <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-400/10 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-black text-white truncate">{req.userId?.name || 'Unknown'}</div>
                    <div className="text-[10px] text-white/40 font-bold truncate">{req.userId?.email || ''}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap shrink-0">
                  <div className="text-center">
                    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">Tokens/mo</div>
                    <div className="text-[13px] font-black text-white">{fmtK(req.monthlyLimit)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">Duration</div>
                    <div className="text-[13px] font-black text-white">{req.durationMonths}mo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">Price</div>
                    <div className="text-[13px] font-black text-white">₹{req.priceDisplay.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">Date</div>
                    <div className="text-[11px] font-bold text-white/60">{fmtDate(req.createdAt)}</div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${s.classes}`}>
                    {s.icon} {s.label}
                  </span>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => { setModal({ req, action: 'approve' }); setNote(''); setDiscountPct(0); }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => { setModal({ req, action: 'reject' }); setNote(''); }}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : req._id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] text-white/40 hover:text-white transition-all"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded: notes */}
              {isExpanded && (req.userNote || req.adminNote) && (
                <div className="border-t border-white/[0.06] px-5 py-3 bg-white/[0.01] space-y-2">
                  {req.userNote && (
                    <div>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">User Note: </span>
                      <span className="text-[12px] text-white/60 font-bold">{req.userNote}</span>
                    </div>
                  )}
                  {req.adminNote && (
                    <div>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Admin Note: </span>
                      <span className="text-[12px] text-white/60 font-bold">{req.adminNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }))}
      </div>

      {/* Action modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0c0c0c] border border-white/[0.1] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-[3px] w-full ${modal.action === 'approve' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className="p-5 sm:p-6">
              <h2 className="text-xl font-black text-white">
                {modal.action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h2>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                {modal.req.userId?.name} · {fmtK(modal.req.monthlyLimit)} tokens/mo · {modal.req.durationMonths}mo
              </p>
              <div className="mt-5">
                <label className="block mt-4">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    {modal.action === 'approve' ? 'Note (optional)' : 'Rejection reason (required)'}
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={modal.action === 'approve' ? 'e.g. Priority support enabled for Q3' : 'e.g. Volume too low — redirect to Pro plan'}
                    className="w-full mt-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                  />
                </label>
                {modal.action === 'approve' && (
                  <label className="block mt-4">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                      Discount Percentage
                    </span>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(Number(e.target.value))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-4 pr-8 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-white/20"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">%</span>
                    </div>
                  </label>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 font-black text-[11px] uppercase tracking-widest hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={modal.action === 'reject' && !note.trim()}
                  className={`flex-1 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    modal.action === 'approve'
                      ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                      : 'bg-red-500/80 text-white hover:bg-red-500'
                  }`}
                >
                  {modal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
