import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Save, AlertTriangle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatbotStore } from '../../../store/chatbotStore.js';
import { chatbotApi, type Chatbot } from '../../../services/api/chatbot.api.js';
import { LANGUAGES } from '../../../constants/chatbot.constants.js';
import { toast } from '../../../utils/toast.js';
import { AsyncSelect } from '../../../components/common/AsyncSelect.js';

export const ChatbotOverview: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();
  const { currentChatbot: chatbot, updateCurrentChatbotLocally, updateChatbotState } = useChatbotStore();

  const [overviewForm, setOverviewForm] = useState({
    name: '',
    description: '',
    language: 'en',
    avatarUrl: '',
    isActive: true,
    welcomeTemplateId: '',
    fallbackTemplateId: '',
  });

  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (chatbot) {
      setOverviewForm({
        name: chatbot.name,
        description: chatbot.description || '',
        language: chatbot.language,
        avatarUrl: chatbot.avatarUrl || '',
        isActive: chatbot.isActive,
        welcomeTemplateId: chatbot.welcomeTemplateId || '',
        fallbackTemplateId: chatbot.fallbackTemplateId || '',
      });
    }
  }, [chatbot]);

  useEffect(() => {
    if (id) {
      chatbotApi.listTemplates(id, {}).then(res => setTemplates(res.templates || [])).catch(() => {});
    }
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

  const handleUpdateOverview = useCallback(async () => {
    if (!id || !chatbot) return;
    try {
      const payload: Partial<Chatbot> = {
        name: overviewForm.name,
        description: overviewForm.description,
        language: overviewForm.language,
        avatarUrl: overviewForm.avatarUrl || undefined,
        isActive: overviewForm.isActive,
        welcomeTemplateId: overviewForm.welcomeTemplateId || null,
        fallbackTemplateId: overviewForm.fallbackTemplateId || null,
      };
      const res = await chatbotApi.update(id, payload);
      updateCurrentChatbotLocally(payload);
      updateChatbotState(id, res.chatbot);
      toast.success('Overview details saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update chatbot');
    }
  }, [id, chatbot, overviewForm, updateCurrentChatbotLocally, updateChatbotState]);

  if (!chatbot) return null;

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Edit Details */}
      <div className="lg:col-span-2 glass-card p-6 space-y-6">
        <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
          General Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Chatbot Name *
            </label>
            <input
              type="text"
              value={overviewForm.name}
              onChange={e => setOverviewForm(prev => ({ ...prev, name: e.target.value }))}
              className="glass-input w-full font-semibold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Language
            </label>
            <select
              value={overviewForm.language}
              onChange={e => setOverviewForm(prev => ({ ...prev, language: e.target.value }))}
              className="glass-input w-full bg-slate-950 font-semibold"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Avatar URL
            </label>
            <input
              type="text"
              value={overviewForm.avatarUrl}
              onChange={e => setOverviewForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
              className="glass-input w-full font-mono text-xs text-accent-blue"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Description
            </label>
            <textarea
              value={overviewForm.description}
              onChange={e => setOverviewForm(prev => ({ ...prev, description: e.target.value }))}
              className="glass-input w-full text-sm"
              rows={3}
            />
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex items-center justify-between">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={overviewForm.isActive}
              onChange={e => setOverviewForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">
              Activate Chatbot Routing
            </span>
          </label>

          <button
            onClick={handleUpdateOverview}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Welcome/Fallback Settings & Danger Zone */}
      <div className="space-y-6">
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
            Behavior Settings
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                Welcome Response Template
              </label>
              <AsyncSelect
                value={overviewForm.welcomeTemplateId}
                onChange={(val) => setOverviewForm(prev => ({ ...prev, welcomeTemplateId: val }))}
                onSearch={searchTemplates}
                defaultLabel={templates.find(t => t._id === overviewForm.welcomeTemplateId)?.name}
                placeholder="(None - Disabled)"
                className="w-full"
              />
              <span className="text-[9px] text-gray-500 font-bold block mt-1 leading-normal uppercase">
                Sent automatically when a user opens a new chat session.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                Fallback Response Template
              </label>
              <AsyncSelect
                value={overviewForm.fallbackTemplateId}
                onChange={(val) => setOverviewForm(prev => ({ ...prev, fallbackTemplateId: val }))}
                onSearch={searchTemplates}
                defaultLabel={templates.find(t => t._id === overviewForm.fallbackTemplateId)?.name}
                placeholder="(None - Disabled)"
                className="w-full"
              />
              <span className="text-[9px] text-gray-500 font-bold block mt-1 leading-normal uppercase">
                Sent when keywords do not match and router falls back.
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-red-500/10 space-y-4">
          <h3 className="text-base font-bold text-red-400 uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Permanently delete this chatbot and all of its associated triggers, flows, and templates.
          </p>
          <button
            onClick={() => toast.error('Delete flow requires confirmation dialog')}
            className="w-full px-4 py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Chatbot</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
});
