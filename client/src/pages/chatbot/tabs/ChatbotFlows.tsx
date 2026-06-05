import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, Layers, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatbotApi, type ChatbotFlow } from '../../../services/api/chatbot.api.js';
import { toast } from '../../../utils/toast.js';
import { AsyncSelect } from '../../../components/common/AsyncSelect.js';

export const ChatbotFlows: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();

  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFlowForm, setNewFlowForm] = useState({
    stepName: '',
    description: '',
    templateId: '',
    previousStepId: '',
    previousStepType: 'chatbot-trigger' as 'chatbot-trigger' | 'chatbot-flow',
    condition: '',
    order: 0,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      chatbotApi.listFlows(id),
      chatbotApi.listTemplates(id, {})
    ])
      .then(([fRes, tRes]) => {
        let loadedFlows: any[] = [];
        if (Array.isArray(fRes)) loadedFlows = fRes;
        else if (fRes && Array.isArray((fRes as any).flowSteps)) loadedFlows = (fRes as any).flowSteps;
        else if (fRes && Array.isArray((fRes as any).flows)) loadedFlows = (fRes as any).flows;
        else if (fRes && Array.isArray((fRes as any).data)) loadedFlows = (fRes as any).data;
        else if (fRes && (fRes as any).data && Array.isArray((fRes as any).data.flowSteps)) loadedFlows = (fRes as any).data.flowSteps;
        else if (fRes && (fRes as any).data && Array.isArray((fRes as any).data.flows)) loadedFlows = (fRes as any).data.flows;

        setFlows(loadedFlows);
        setTemplates(tRes.templates || []);
        
        if (loadedFlows.length > 0) {
          const lastFlow = loadedFlows[loadedFlows.length - 1];
          setNewFlowForm(prev => ({
            ...prev,
            previousStepId: lastFlow._id,
            previousStepType: 'chatbot-flow',
            order: (lastFlow.order || 0) + 1,
          }));
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load flows data');
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

  const handleAddFlowStep = useCallback(async () => {
    if (!id) return;
    if (!newFlowForm.stepName.trim()) {
      toast.error('Step name is required');
      return;
    }
    if (!newFlowForm.templateId) {
      toast.error('Linking response template is required');
      return;
    }
    try {
      const payload: Partial<ChatbotFlow> = {
        stepName: newFlowForm.stepName,
        description: newFlowForm.description,
        templateId: newFlowForm.templateId,
        previousStep: {
          stepId: newFlowForm.previousStepId || null,
          type: newFlowForm.previousStepType,
        },
        condition: newFlowForm.condition || undefined,
        order: newFlowForm.order,
      };
      const res = await chatbotApi.createFlow(id, payload);
      const newStep = (res as any).flowStep || (res as any).flow || (res as any).data || res;
      
      setFlows(prev => [...prev, newStep].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setNewFlowForm(prev => ({
        stepName: '',
        description: '',
        templateId: '',
        previousStepId: newStep._id,
        previousStepType: 'chatbot-flow',
        condition: '',
        order: (prev.order || 0) + 1,
      }));
      toast.success('Flow step created');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create flow step');
    }
  }, [id, newFlowForm]);

  const handleDeleteFlowStep = useCallback(async (stepId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteFlow(id, stepId);
      setFlows(prev => prev.filter(f => f._id !== stepId));
      toast.success('Flow step deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete flow step');
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
      key="flow-builder"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Creator Form */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent-purple" /> Add Flow Step
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Step Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ask Movie Genre"
              value={newFlowForm.stepName}
              onChange={e => setNewFlowForm(prev => ({ ...prev, stepName: e.target.value }))}
              className="glass-input w-full font-semibold"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Step Description
            </label>
            <input
              type="text"
              placeholder="Explain what this node prompts"
              value={newFlowForm.description}
              onChange={e => setNewFlowForm(prev => ({ ...prev, description: e.target.value }))}
              className="glass-input w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Response Template
            </label>
            <AsyncSelect
              value={newFlowForm.templateId}
              onChange={val => setNewFlowForm(prev => ({ ...prev, templateId: val }))}
              onSearch={searchTemplates}
              defaultLabel={templates.find(t => t._id === newFlowForm.templateId)?.name}
              placeholder="(Select template)"
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
              Previous Step Node
            </label>
            <select
              value={newFlowForm.previousStepId}
              onChange={e => setNewFlowForm(prev => ({ ...prev, previousStepId: e.target.value }))}
              className="glass-input w-full bg-slate-950 font-semibold"
            >
              <option value="">(Entry Point - Trigger Only)</option>
              {(flows || []).map(step => {
                if (!step) return null;
                return (
                  <option key={step._id} value={step._id}>
                    {step.stepName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
              Previous Link Type
            </label>
            <select
              value={newFlowForm.previousStepType}
              onChange={e => setNewFlowForm(prev => ({ ...prev, previousStepType: e.target.value as any }))}
              className="glass-input w-full bg-slate-950 font-semibold"
            >
              <option value="chatbot-trigger">Trigger Match (Entry)</option>
              <option value="chatbot-flow">Dialog Step (Intermediate)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Enter Condition (Keyword/Regex)
            </label>
            <input
              type="text"
              placeholder="e.g. confirm|yes"
              value={newFlowForm.condition}
              onChange={e => setNewFlowForm(prev => ({ ...prev, condition: e.target.value }))}
              className="glass-input w-full font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Order Value
            </label>
            <input
              type="number"
              value={newFlowForm.order}
              onChange={e => setNewFlowForm(prev => ({ ...prev, order: Number(e.target.value) }))}
              className="glass-input w-full font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={handleAddFlowStep}
            className="btn-primary flex items-center space-x-2 py-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Node Step</span>
          </button>
        </div>
      </div>

      {/* Vertical Step Chain Visualization */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-accent-purple" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Conversation Path
          </h4>
        </div>

        <div className="flex flex-col items-center max-w-lg mx-auto space-y-4">
          <div className="bg-slate-950 border border-dashed border-white/10 rounded-xl p-4 text-center w-full text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>🔑 User Keyword Match Trigger</span>
          </div>

          {flows && flows.length > 0 ? (
            flows.map((step, idx) => {
              if (!step) return null;
              const linkedTpl = templates.find(t => t._id === step.templateId);
              return (
                <div key={step._id} className="w-full flex flex-col items-center">
                  {/* Arrow spacer */}
                  <div className="w-0.5 h-6 bg-gradient-to-b from-accent-purple to-accent-blue" />

                  {/* Node card */}
                  <div className="glass-card p-5 w-full relative group border-accent-purple/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple border border-accent-purple/20 rounded mr-2">
                          Node #{idx + 1}
                        </span>
                        <h4 className="text-white font-bold inline-block text-sm">{step.stepName}</h4>
                        <p className="text-gray-400 text-xs mt-1">{step.description || 'No description node.'}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFlowStep(step._id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Node Metadata indicators */}
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5 text-[11px] font-semibold text-gray-400">
                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] block">
                          Linked Response
                        </span>
                        <span className="text-accent-blue font-bold">
                          {linkedTpl ? linkedTpl.name : 'Missing!'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] block">
                          Criteria Condition
                        </span>
                        <span className="font-mono text-emerald-400">
                          {step.condition || '(None - Auto)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-gray-500 italic text-xs w-full border border-dashed border-white/5 rounded-2xl">
              No dialog steps configured yet.
            </div>
          )}

          <div className="w-0.5 h-6 bg-white/5" />
          <div className="bg-slate-950 border border-white/5 rounded-xl p-3 text-center w-full text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            🏁 Dialogue Session Ends / Repeats
          </div>
        </div>
      </div>
    </motion.div>
  );
});
