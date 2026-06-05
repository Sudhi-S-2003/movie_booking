import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { chatbotApi, type ChatbotKeyword } from '../../../services/api/chatbot.api.js';
import { toast } from '../../../utils/toast.js';
import { AsyncSelect } from '../../../components/common/AsyncSelect.js';

export const ChatbotKeywords: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();
  const [keywords, setKeywords] = useState<ChatbotKeyword[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newKwForm, setNewKwForm] = useState({
    keyword: '',
    matchType: 'contains' as 'exact' | 'contains' | 'startsWith' | 'regex',
    priority: 0,
    sessionId: 'default',
    templateId: '',
    isActive: true,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      chatbotApi.listKeywords(id, {}),
      chatbotApi.listTemplates(id, {})
    ])
      .then(([kRes, tRes]) => {
        setKeywords(kRes.keywords || []);
        setTemplates(tRes.templates || []);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load keywords data');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const searchTemplates = useCallback(async (q: string) => {
    if (!id) return [];
    try {
      const res = await chatbotApi.listTemplates(id, { q });
      return (res.templates || []).map(t => ({ value: t._id, label: t.name }));
    } catch {
      return [];
    }
  }, [id]);

  const handleAddKeyword = useCallback(async () => {
    if (!id) return;
    if (!newKwForm.keyword.trim()) {
      toast.error('Keyword triggers are required');
      return;
    }
    if (!newKwForm.templateId) {
      toast.error('Please link a response template');
      return;
    }
    try {
      const res = await chatbotApi.addKeyword(id, newKwForm);
      setKeywords(prev => [...prev, res.keyword].sort((a, b) => b.priority - a.priority));
      setNewKwForm({
        keyword: '',
        matchType: 'contains',
        priority: 0,
        sessionId: 'default',
        templateId: '',
        isActive: true,
      });
      toast.success('Keyword trigger added');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add keyword');
    }
  }, [id, newKwForm]);

  const handleDeleteKeyword = useCallback(async (kwId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteKeyword(id, kwId);
      setKeywords(prev => prev.filter(k => k._id !== kwId));
      toast.success('Keyword trigger deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete keyword');
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      key="keywords"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="glass-card p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
            Keywords Routing
          </h3>
          <p className="text-gray-500 text-xs">
            Assign keyword matching rules that direct users to specific response templates.
          </p>
        </div>

        {/* Keywords list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[10px]">
                <th className="py-3 px-4">Keyword Match</th>
                <th className="py-3 px-4">Match Method</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Group/Session</th>
                <th className="py-3 px-4">Target Template</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.length > 0 ? (
                keywords.map(kw => {
                  const linkedTpl = templates.find(t => t._id === kw.templateId);
                  return (
                    <tr key={kw._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 font-bold text-white font-mono">{kw.keyword}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-md">
                          {kw.matchType}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-400">{kw.priority}</td>
                      <td className="py-4 px-4 text-gray-400">{kw.sessionId}</td>
                      <td className="py-4 px-4 text-accent-blue font-bold">
                        {linkedTpl ? linkedTpl.name : '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={clsx('w-2 h-2 rounded-full inline-block', kw.isActive ? 'bg-emerald-400' : 'bg-gray-600')} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteKeyword(kw._id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                    No keyword routing configured. Add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Keyword inline form */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-xs uppercase font-bold tracking-widest text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent-purple" /> Add Keyword Route
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Keyword / Regex Trigger
              </label>
              <input
                type="text"
                placeholder="e.g. ticket, support, reset"
                value={newKwForm.keyword}
                onChange={e => setNewKwForm(prev => ({ ...prev, keyword: e.target.value }))}
                className="glass-input w-full font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Match Strategy
              </label>
              <select
                value={newKwForm.matchType}
                onChange={e => setNewKwForm(prev => ({ ...prev, matchType: e.target.value as any }))}
                className="glass-input w-full bg-slate-950 font-semibold"
              >
                <option value="contains">Contains Word</option>
                <option value="exact">Exact Match</option>
                <option value="startsWith">Starts With</option>
                <option value="regex">Regular Expression</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Route Priority
              </label>
              <input
                type="number"
                value={newKwForm.priority}
                onChange={e => setNewKwForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                className="glass-input w-full font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Session Group ID
              </label>
              <input
                type="text"
                value={newKwForm.sessionId}
                onChange={e => setNewKwForm(prev => ({ ...prev, sessionId: e.target.value }))}
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-2 w-full md:max-w-md">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                Linked Response Template
              </label>
              <AsyncSelect
                value={newKwForm.templateId}
                onChange={val => setNewKwForm(prev => ({ ...prev, templateId: val }))}
                onSearch={searchTemplates}
                defaultLabel={templates.find(t => t._id === newKwForm.templateId)?.name}
                placeholder="(Select a Template)"
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-6 self-end w-full md:w-auto justify-between md:justify-start">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newKwForm.isActive}
                  onChange={e => setNewKwForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Trigger is Active
                </span>
              </label>

              <button
                onClick={handleAddKeyword}
                className="btn-primary flex items-center space-x-2 py-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trigger</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
