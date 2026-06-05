import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  MessageSquare,
  ArrowRight,
  Workflow,
  Menu as MenuIcon,
  Layout,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { chatbotApi, type Chatbot } from '../../services/api/chatbot.api.js';
import { toast } from '../../utils/toast.js';
import { clsx } from 'clsx';

const PAGE_SIZE = 9;

const TYPE_FILTERS = [
  { value: 'all',          label: 'All Types' },
  { value: 'keyword-only', label: 'Keyword-Only', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { value: 'flow',         label: 'Flow',         icon: <Workflow className="w-3.5 h-3.5" /> },
  { value: 'menu',         label: 'Menu',         icon: <MenuIcon className="w-3.5 h-3.5" /> },
  { value: 'form',         label: 'Form',         icon: <Layout className="w-3.5 h-3.5" /> },
];

const STATUS_FILTERS = ['all', 'active', 'inactive'];

function getTypeBadgeStyles(type: string) {
  switch (type) {
    case 'keyword-only': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'flow':         return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'menu':         return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'form':         return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    default:             return 'bg-gray-500/10 text-gray-400 border border-white/5';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'keyword-only': return <MessageSquare className="w-4 h-4" />;
    case 'flow':         return <Workflow className="w-4 h-4" />;
    case 'menu':         return <MenuIcon className="w-4 h-4" />;
    case 'form':         return <Layout className="w-4 h-4" />;
    default:             return <MessageSquare className="w-4 h-4" />;
  }
}

function getTypeMetric(bot: Chatbot) {
  switch (bot.type) {
    case 'flow': return { count: bot.flowStepCount ?? 0, label: 'Steps' };
    case 'menu': return { count: bot.menuCount ?? 0,     label: 'Menus' };
    case 'form': return { count: bot.formFieldCount ?? 0, label: 'Fields' };
    default:     return { count: 0,                      label: '—' };
  }
}

export const ChatbotList = () => {
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedType, setSelectedType]   = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [chatbots, setChatbots]   = useState<Chatbot[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]     = useState(true);

  // Debounce search so we don't fire on every keystroke
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchQuery]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedType, selectedStatus]);

  const fetchChatbots = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
      if (debouncedQuery)               params.q        = debouncedQuery;
      if (selectedType !== 'all')       params.type     = selectedType;
      if (selectedStatus === 'active')  params.isActive = true;
      if (selectedStatus === 'inactive') params.isActive = false;

      const response = await chatbotApi.list(params as any);
      setChatbots(response.chatbots || []);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch chatbots:', error);
      toast.error('Failed to load chatbots');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, selectedType, selectedStatus]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleToggleActive = async (id: string, currentStatus: boolean, name: string) => {
    try {
      await chatbotApi.update(id, { isActive: !currentStatus });
      setChatbots(prev =>
        prev.map(bot => (bot._id === id ? { ...bot, isActive: !currentStatus } : bot))
      );
      toast.success(`${name} has been ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Failed to update chatbot status');
    }
  };

  // ── Pagination helpers ─────────────────────────────────────────────────────
  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const pageNumbers = () => {
    const pages: (number | '…')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 w-full space-y-8 animate-fade-in">

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Chatbot Hub</h1>
            <Sparkles className="w-5 h-5 text-accent-purple animate-pulse" />
          </div>
          <p className="text-gray-400 text-sm max-w-xl">
            Configure automated response templates, flows, menus, and data forms for your chat channels.
          </p>
        </div>
        <button
          onClick={() => navigate('new')}
          className="btn-primary flex items-center space-x-2 self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>New Chatbot</span>
        </button>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search chatbots by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="glass-input pl-10 w-full"
            />
          </div>

          {/* Status toggle */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 space-x-1 w-full md:w-auto justify-center">
            {STATUS_FILTERS.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={clsx(
                  'px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all',
                  selectedStatus === status
                    ? 'bg-accent-purple text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
          {TYPE_FILTERS.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={clsx(
                'flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                selectedType === type.value
                  ? 'bg-accent-purple/20 border-accent-purple text-white shadow-md'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              )}
            >
              {type.icon}
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            {totalCount > 0
              ? `${totalCount} chatbot${totalCount !== 1 ? 's' : ''} found`
              : 'No results'}
            {totalPages > 1 && ` — Page ${page} of ${totalPages}`}
          </p>
        )}
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-accent-purple animate-spin" />
        </div>
      ) : chatbots.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {chatbots.map((bot, idx) => {
                const metric = getTypeMetric(bot);
                return (
                  <motion.div
                    key={bot._id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: idx * 0.04 }}
                    className={clsx(
                      'glass-card group overflow-hidden transition-all duration-300 relative flex flex-col',
                      bot.isActive
                        ? 'border-accent-purple/20 hover:border-accent-purple/40 hover:shadow-[0_0_20px_rgba(109,40,217,0.15)]'
                        : 'border-white/5 opacity-75'
                    )}
                  >
                    {/* Active indicator stripe */}
                    {bot.isActive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-purple via-accent-blue to-transparent" />
                    )}

                    {/* Card Body */}
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {bot.avatarUrl ? (
                            <img
                              src={bot.avatarUrl}
                              alt={bot.name}
                              className="w-12 h-12 rounded-xl object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-purple/20 to-accent-blue/20 border border-white/10 flex items-center justify-center text-white font-bold text-lg">
                              {bot.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-white group-hover:text-glow transition-all">
                              {bot.name}
                            </h3>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <Globe className="w-3 h-3 text-gray-500" />
                              <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                {bot.language}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5', getTypeBadgeStyles(bot.type))}>
                          {getTypeIcon(bot.type)}
                          <span>{bot.type.replace('-', ' ')}</span>
                        </span>
                      </div>

                      <p className="text-gray-400 text-xs line-clamp-2 h-8">
                        {bot.description || 'No description provided.'}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5 text-center">
                        <div className="bg-white/5 rounded-lg py-2 border border-white/5">
                          <p className="text-white font-black text-sm">{bot.keywordCount ?? 0}</p>
                          <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5 flex items-center justify-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Keywords
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg py-2 border border-white/5">
                          <p className="text-white font-black text-sm">{bot.templateCount ?? 0}</p>
                          <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">Templates</p>
                        </div>
                        <div className="bg-white/5 rounded-lg py-2 border border-white/5">
                          <p className="text-white font-black text-sm">{metric.count}</p>
                          <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">{metric.label}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-4 bg-slate-950/40 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleActive(bot._id, bot.isActive, bot.name)}
                        className="flex items-center space-x-2 text-xs font-semibold transition-all hover:text-white"
                      >
                        {bot.isActive ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500">Inactive</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => navigate(`${bot._id}`)}
                        className="text-xs text-accent-blue group-hover:text-white font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
                      >
                        <span>Configure</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ── Pagination Controls ───────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {/* Prev */}
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {pageNumbers().map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-600 font-bold text-sm select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    className={clsx(
                      'w-9 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border',
                      page === p
                        ? 'bg-accent-purple border-accent-purple text-white shadow-[0_0_12px_rgba(109,40,217,0.4)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    )}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* ── Empty State ──────────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card py-20 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-white/10"
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
            <MessageSquare className="w-8 h-8 text-gray-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No chatbots found</h3>
            <p className="text-gray-500 text-xs max-w-sm">
              {debouncedQuery || selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search filters.'
                : 'Create a custom configuration to trigger automated responses based on keyword input.'}
            </p>
          </div>
          {!debouncedQuery && selectedType === 'all' && selectedStatus === 'all' && (
            <button onClick={() => navigate('new')} className="btn-primary mt-2">
              Create Chatbot
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};
