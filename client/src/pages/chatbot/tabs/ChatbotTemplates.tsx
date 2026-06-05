import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown, FileCode, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { chatbotApi, type ChatbotTemplate, type ChatbotFlow } from '../../../services/api/chatbot.api.js';
import { toast } from '../../../utils/toast.js';
import { useChatbotStore } from '../../../store/chatbotStore.js';
import { LANGUAGES, HEADER_KEY_OPTIONS, BODY_KEY_OPTIONS, FOOTER_KEY_OPTIONS } from '../../../constants/chatbot.constants.js';

export const ChatbotTemplates: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();
  const { currentChatbot: chatbot } = useChatbotStore();

  const [templates, setTemplates] = useState<any[]>([]);
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);

  // Template creation state
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    language: 'en',
  });

  // Accordion & detail state
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [templateDetail, setTemplateDetail] = useState<ChatbotTemplate | null>(null);

  // Per-template section forms state
  const [templateSectionState, setTemplateSectionState] = useState<
    Record<string, {
      selectedKeys: { header: string; body: string; footer: string };
      newForms: {
        header: { type: string; key: string; value: string; order: number };
        body:   { key: string; value: string; order: number };
        footer: { key: string; value: string; order: number };
      };
    }>
  >({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      chatbotApi.listTemplates(id, {}),
      chatbotApi.listFlows(id)
    ])
      .then(([tRes, fRes]) => {
        setTemplates(tRes.templates || []);
        setFlows(fRes.flows || []);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load templates data');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const ensureTemplateSectionState = useCallback((tplId: string) => {
    setTemplateSectionState(prev => {
      if (prev[tplId]) return prev;
      return {
        ...prev,
        [tplId]: {
          selectedKeys: { header: 'title', body: 'main_content', footer: 'disclaimer' },
          newForms: {
            header: { type: 'text', key: 'title', value: '', order: 0 },
            body:   { key: 'main_content', value: '', order: 0 },
            footer: { key: 'disclaimer', value: '', order: 0 },
          },
        },
      };
    });
  }, []);

  const handleCreateTemplate = useCallback(async () => {
    if (!id) return;
    if (!newTemplateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    try {
      const res = await chatbotApi.createTemplate(id, {
        ...newTemplateForm,
        headers: [],
        bodies: [],
        footers: [],
      });
      setTemplates(prev => [res.template, ...prev]);
      setNewTemplateForm({ name: '', description: '', language: 'en' });
      setExpandedTemplate(res.template._id);
      ensureTemplateSectionState(res.template._id);
      setTemplateDetail(res.template);
      toast.success('Template created');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create template');
    }
  }, [id, newTemplateForm, ensureTemplateSectionState]);

  const handleToggleTemplateAccordion = useCallback(async (tplId: string) => {
    if (expandedTemplate === tplId) {
      setExpandedTemplate(null);
      setTemplateDetail(null);
    } else {
      setExpandedTemplate(tplId);
      setTemplateDetail(null);
      ensureTemplateSectionState(tplId);
      if (!id) return;
      try {
        const res = await chatbotApi.getTemplate(id, tplId);
        setTemplateDetail(res.template);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load template data');
      }
    }
  }, [id, expandedTemplate, ensureTemplateSectionState]);

  const handleDeleteTemplate = useCallback(async (tplId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteTemplate(id, tplId);
      setTemplates(prev => prev.filter(t => t._id !== tplId));
      if (expandedTemplate === tplId) {
        setExpandedTemplate(null);
        setTemplateDetail(null);
      }
      toast.success('Template deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete template');
    }
  }, [id, expandedTemplate]);

  const handleUpdateTemplateGeneral = useCallback(async (tplId: string, payload: Partial<ChatbotTemplate>) => {
    if (!id) return;
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, payload);
      setTemplates(prev => prev.map(t => (t._id === tplId ? res.template : t)));
      setTemplateDetail(prev => (prev ? { ...prev, ...payload } : null));
      toast.success('Template settings updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update template settings');
    }
  }, [id]);

  const handleAddHeaderRow = useCallback(async (tplId: string) => {
    if (!id || !templateDetail) return;
    ensureTemplateSectionState(tplId);
    const st = templateSectionState[tplId];
    if (!st) return;
    const { type, key, value, order } = st.newForms.header;
    if (!key.trim() || !value.trim()) {
      toast.error('Header Key and Value are required');
      return;
    }
    const newHeaders = [...(templateDetail.headers || []), { type, key, value, order }].sort((a, b) => a.order - b.order);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { headers: newHeaders });
      setTemplateDetail(res.template);
      setTemplateSectionState(prev => ({
        ...prev,
        [tplId]: {
          ...prev[tplId]!,
          selectedKeys: { ...prev[tplId]!.selectedKeys, header: 'title' },
          newForms: { ...prev[tplId]!.newForms, header: { type: 'text', key: 'title', value: '', order: 0 } },
        },
      }));
      toast.success('Header row added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add header row');
    }
  }, [id, templateDetail, templateSectionState, ensureTemplateSectionState]);

  const handleDeleteHeaderRow = useCallback(async (tplId: string, idx: number) => {
    if (!id || !templateDetail) return;
    const newHeaders = (templateDetail.headers || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { headers: newHeaders });
      setTemplateDetail(res.template);
      toast.success('Header row deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete header row');
    }
  }, [id, templateDetail]);

  const handleAddBodyRow = useCallback(async (tplId: string) => {
    if (!id || !templateDetail) return;
    ensureTemplateSectionState(tplId);
    const st = templateSectionState[tplId];
    if (!st) return;
    const { key, value, order } = st.newForms.body;
    if (!key.trim() || !value.trim()) {
      toast.error('Body Key and Value are required');
      return;
    }
    const newBodies = [...(templateDetail.bodies || []), { key, value, order }].sort((a, b) => a.order - b.order);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { bodies: newBodies });
      setTemplateDetail(res.template);
      setTemplateSectionState(prev => ({
        ...prev,
        [tplId]: {
          ...prev[tplId]!,
          selectedKeys: { ...prev[tplId]!.selectedKeys, body: 'main_content' },
          newForms: { ...prev[tplId]!.newForms, body: { key: 'main_content', value: '', order: 0 } },
        },
      }));
      toast.success('Body row added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add body row');
    }
  }, [id, templateDetail, templateSectionState, ensureTemplateSectionState]);

  const handleDeleteBodyRow = useCallback(async (tplId: string, idx: number) => {
    if (!id || !templateDetail) return;
    const newBodies = (templateDetail.bodies || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { bodies: newBodies });
      setTemplateDetail(res.template);
      toast.success('Body row deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete body row');
    }
  }, [id, templateDetail]);

  const handleAddFooterRow = useCallback(async (tplId: string) => {
    if (!id || !templateDetail) return;
    ensureTemplateSectionState(tplId);
    const st = templateSectionState[tplId];
    if (!st) return;
    const { key, value, order } = st.newForms.footer;
    if (!key.trim() || !value.trim()) {
      toast.error('Footer Key and Value are required');
      return;
    }
    const newFooters = [...(templateDetail.footers || []), { key, value, order }].sort((a, b) => a.order - b.order);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { footers: newFooters });
      setTemplateDetail(res.template);
      setTemplateSectionState(prev => ({
        ...prev,
        [tplId]: {
          ...prev[tplId]!,
          selectedKeys: { ...prev[tplId]!.selectedKeys, footer: 'disclaimer' },
          newForms: { ...prev[tplId]!.newForms, footer: { key: 'disclaimer', value: '', order: 0 } },
        },
      }));
      toast.success('Footer row added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add footer row');
    }
  }, [id, templateDetail, templateSectionState, ensureTemplateSectionState]);

  const handleDeleteFooterRow = useCallback(async (tplId: string, idx: number) => {
    if (!id || !templateDetail) return;
    const newFooters = (templateDetail.footers || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { footers: newFooters });
      setTemplateDetail(res.template);
      toast.success('Footer row deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete footer row');
    }
  }, [id, templateDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      key="templates"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Creator Form */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent-purple" /> Add Response Template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Template Name
            </label>
            <input
              type="text"
              placeholder="e.g. Booking Confirmation"
              value={newTemplateForm.name}
              onChange={e => setNewTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              className="glass-input w-full font-semibold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Language
            </label>
            <select
              value={newTemplateForm.language}
              onChange={e => setNewTemplateForm(prev => ({ ...prev, language: e.target.value }))}
              className="glass-input w-full bg-slate-950 font-semibold"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Internal Note
            </label>
            <input
              type="text"
              placeholder="e.g. Sent when movie is booked"
              value={newTemplateForm.description}
              onChange={e => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              className="glass-input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={handleCreateTemplate}
            className="btn-primary flex items-center space-x-2 py-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Templates list with Accordions */}
      <div className="space-y-4">
        {templates.length > 0 ? (
          templates.map(tpl => {
            const isExpanded = expandedTemplate === tpl._id;
            return (
              <div
                key={tpl._id}
                className={clsx(
                  'glass-card overflow-hidden transition-all duration-300',
                  isExpanded ? 'border-accent-purple/30 bg-slate-900/10' : 'border-white/5'
                )}
              >
                {/* Header bar */}
                <div
                  onClick={() => handleToggleTemplateAccordion(tpl._id)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{tpl.name}</h4>
                      <p className="text-gray-500 text-[10px] uppercase font-semibold">
                        Lang: {tpl.language} | {tpl.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider', tpl.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-white/5')}>
                      {tpl.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* Accordion expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-white/5 overflow-hidden"
                    >
                      <div className="p-6 space-y-6">
                        {/* General template options (nextFlowStepId) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-white/5 items-end">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                              Status Mode
                            </label>
                            <select
                              value={tpl.status}
                              onChange={e => handleUpdateTemplateGeneral(tpl._id, { status: e.target.value as any })}
                              className="glass-input w-full bg-slate-950 text-xs font-bold"
                            >
                              <option value="draft">Draft (Inactive)</option>
                              <option value="published">Published (Live)</option>
                            </select>
                          </div>

                          {chatbot?.type === 'flow' && (
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                                Next Dialogue Flow Step
                              </label>
                              <select
                                value={tpl.nextFlowStepId || ''}
                                onChange={e => handleUpdateTemplateGeneral(tpl._id, { nextFlowStepId: e.target.value || null })}
                                className="glass-input w-full bg-slate-950 text-xs font-bold"
                              >
                                <option value="">(End conversation block)</option>
                                {flows.map(step => (
                                  <option key={step._id} value={step._id}>
                                    Step: {step.stepName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex justify-end self-end">
                            <button
                              onClick={() => handleDeleteTemplate(tpl._id)}
                              className="px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold uppercase flex items-center space-x-1.5 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Template</span>
                            </button>
                          </div>
                        </div>

                        {/* Section Rows Editors */}
                        {templateDetail ? (
                          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* HEADERS */}
                            <div className="space-y-4 glass-card p-5 bg-slate-950/20">
                              <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                Template Headers
                              </h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                {(templateDetail.headers || []).map((row, idx) => (
                                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex justify-between items-start text-[11px]">
                                    <div className="space-y-1 pr-4">
                                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold font-mono">
                                        {row.type}
                                      </span>
                                      <p className="font-bold text-white font-mono mt-1">{row.key}</p>
                                      <p className="text-gray-400 break-all font-mono">{row.value}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteHeaderRow(tpl._id, idx)}
                                      className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Add Header row form */}
                              {(() => {
                                const st = templateSectionState[tpl._id];
                                if (!st) return null;
                                return (
                                  <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                                    <div className="grid grid-cols-2 gap-2">
                                      <select
                                        value={st.newForms.header.type}
                                        onChange={e => setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, type: e.target.value } } }
                                        }))}
                                        className="glass-input py-1 text-[11px] bg-slate-950 w-full"
                                      >
                                        <option value="text">Text</option>
                                        <option value="image">Image URL</option>
                                        <option value="video">Video URL</option>
                                        <option value="document">Doc URL</option>
                                      </select>
                                      <input
                                        type="number"
                                        placeholder="Order"
                                        value={st.newForms.header.order}
                                        onChange={e => setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, order: Number(e.target.value) } } }
                                        }))}
                                        className="glass-input py-1 text-[11px] w-full"
                                      />
                                    </div>
                                    <select
                                      value={st.selectedKeys.header}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: {
                                            ...prev[tpl._id]!,
                                            selectedKeys: { ...prev[tpl._id]!.selectedKeys, header: val },
                                            newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, key: val === 'custom' ? '' : val } },
                                          }
                                        }));
                                      }}
                                      className="glass-input py-1 text-[11px] bg-slate-950 w-full font-semibold"
                                    >
                                      {HEADER_KEY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    {st.selectedKeys.header === 'custom' && (
                                      <input
                                        type="text"
                                        placeholder="Enter Custom Header Key"
                                        value={st.newForms.header.key}
                                        onChange={e => setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, key: e.target.value } } }
                                        }))}
                                        className="glass-input py-1 text-[11px] w-full"
                                      />
                                    )}
                                    <input
                                      type="text"
                                      placeholder="Header Value"
                                      value={st.newForms.header.value}
                                      onChange={e => setTemplateSectionState(prev => ({
                                        ...prev,
                                        [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, value: e.target.value } } }
                                      }))}
                                      className="glass-input py-1 text-[11px] w-full"
                                    />
                                    <button
                                      onClick={() => handleAddHeaderRow(tpl._id)}
                                      className="w-full py-1 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple hover:text-white transition-all rounded text-[10px] uppercase font-bold"
                                    >
                                      Add Header Item
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* BODY */}
                            <div className="space-y-4 glass-card p-5 bg-slate-950/20">
                              <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                Template Body
                              </h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                {(templateDetail.bodies || []).map((row, idx) => (
                                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex justify-between items-start text-[11px]">
                                    <div className="space-y-1 pr-4 w-full">
                                      <p className="font-bold text-white font-mono">{row.key}</p>
                                      <p className="text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">{row.value}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteBodyRow(tpl._id, idx)}
                                      className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Add Body row form */}
                              {(() => {
                                const st = templateSectionState[tpl._id];
                                if (!st) return null;
                                return (
                                  <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                                    <select
                                      value={st.selectedKeys.body}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: {
                                            ...prev[tpl._id]!,
                                            selectedKeys: { ...prev[tpl._id]!.selectedKeys, body: val },
                                            newForms: { ...prev[tpl._id]!.newForms, body: { ...prev[tpl._id]!.newForms.body, key: val === 'custom' ? '' : val } },
                                          }
                                        }));
                                      }}
                                      className="glass-input py-1 text-[11px] bg-slate-950 w-full font-semibold"
                                    >
                                      {BODY_KEY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    {st.selectedKeys.body === 'custom' && (
                                      <input
                                        type="text"
                                        placeholder="Enter Custom Body Key"
                                        value={st.newForms.body.key}
                                        onChange={e => setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, body: { ...prev[tpl._id]!.newForms.body, key: e.target.value } } }
                                        }))}
                                        className="glass-input py-1 text-[11px] w-full"
                                      />
                                    )}
                                    <textarea
                                      placeholder="Body content... supports {{var}}"
                                      rows={2}
                                      value={st.newForms.body.value}
                                      onChange={e => setTemplateSectionState(prev => ({
                                        ...prev,
                                        [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, body: { ...prev[tpl._id]!.newForms.body, value: e.target.value } } }
                                      }))}
                                      className="glass-input py-1 text-[11px] w-full font-mono"
                                    />
                                    <button
                                      onClick={() => handleAddBodyRow(tpl._id)}
                                      className="w-full py-1 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple hover:text-white transition-all rounded text-[10px] uppercase font-bold"
                                    >
                                      Add Body Item
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* FOOTERS */}
                            <div className="space-y-4 glass-card p-5 bg-slate-950/20">
                              <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                Template Footer
                              </h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                {(templateDetail.footers || []).map((row, idx) => (
                                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex justify-between items-start text-[11px]">
                                    <div className="space-y-1 pr-4">
                                      <p className="font-bold text-white font-mono">{row.key}</p>
                                      <p className="text-gray-400 break-all font-mono">{row.value}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteFooterRow(tpl._id, idx)}
                                      className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Add Footer row form */}
                              {(() => {
                                const st = templateSectionState[tpl._id];
                                if (!st) return null;
                                return (
                                  <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                                    <select
                                      value={st.selectedKeys.footer}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: {
                                            ...prev[tpl._id]!,
                                            selectedKeys: { ...prev[tpl._id]!.selectedKeys, footer: val },
                                            newForms: { ...prev[tpl._id]!.newForms, footer: { ...prev[tpl._id]!.newForms.footer, key: val === 'custom' ? '' : val } },
                                          }
                                        }));
                                      }}
                                      className="glass-input py-1 text-[11px] bg-slate-950 w-full font-semibold"
                                    >
                                      {FOOTER_KEY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    {st.selectedKeys.footer === 'custom' && (
                                      <input
                                        type="text"
                                        placeholder="Enter Custom Footer Key"
                                        value={st.newForms.footer.key}
                                        onChange={e => setTemplateSectionState(prev => ({
                                          ...prev,
                                          [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, footer: { ...prev[tpl._id]!.newForms.footer, key: e.target.value } } }
                                        }))}
                                        className="glass-input py-1 text-[11px] w-full"
                                      />
                                    )}
                                    <input
                                      type="text"
                                      placeholder="Footer value"
                                      value={st.newForms.footer.value}
                                      onChange={e => setTemplateSectionState(prev => ({
                                        ...prev,
                                        [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, footer: { ...prev[tpl._id]!.newForms.footer, value: e.target.value } } }
                                      }))}
                                      className="glass-input py-1 text-[11px] w-full"
                                    />
                                    <button
                                      onClick={() => handleAddFooterRow(tpl._id)}
                                      className="w-full py-1 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple hover:text-white transition-all rounded text-[10px] uppercase font-bold"
                                    >
                                      Add Footer Item
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center py-6 text-gray-500">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="py-12 border border-dashed border-white/5 rounded-2xl text-center text-gray-500 text-xs italic">
            No templates built. Create one using the form above.
          </div>
        )}
      </div>
    </motion.div>
  );
});
