import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatbotApi, type ChatbotVariable } from '../../../services/api/chatbot.api.js';
import { toast } from '../../../utils/toast.js';

export const ChatbotVariables: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();
  const [variables, setVariables] = useState<ChatbotVariable[]>([]);
  const [loading, setLoading] = useState(true);

  const [newVarForm, setNewVarForm] = useState({
    name: '',
    description: '',
    defaultValue: '',
    required: false,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    chatbotApi.listVariables(id)
      .then(res => setVariables(res.variables || []))
      .catch(err => {
        console.error(err);
        toast.error('Failed to load variables');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddVariable = useCallback(async () => {
    if (!id) return;
    if (!newVarForm.name.trim()) {
      toast.error('Variable name is required');
      return;
    }
    try {
      const res = await chatbotApi.addVariable(id, newVarForm);
      setVariables(prev => [...prev, res.variable].sort((a, b) => a.name.localeCompare(b.name)));
      setNewVarForm({ name: '', description: '', defaultValue: '', required: false });
      toast.success('Variable added');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add variable');
    }
  }, [id, newVarForm]);

  const handleDeleteVariable = useCallback(async (vId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteVariable(id, vId);
      setVariables(prev => prev.filter(v => v._id !== vId));
      toast.success('Variable deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete variable');
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
      key="variables"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="glass-card p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
            Variables Config
          </h3>
          <p className="text-gray-500 text-xs">
            Define placeholders that can be injected into templates, like <code className="text-accent-blue font-mono font-bold">{"{{user_name}}"}</code>.
          </p>
        </div>

        {/* Variables list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[10px]">
                <th className="py-3 px-4">Placeholder</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Default Value</th>
                <th className="py-3 px-4 text-center">Required</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variables.length > 0 ? (
                variables.map(v => (
                  <tr key={v._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-accent-purple">
                      {"{{"}
                      {v.name}
                      {"}}"}
                    </td>
                    <td className="py-4 px-4 text-gray-400">{v.description || '—'}</td>
                    <td className="py-4 px-4 font-mono text-gray-400">{v.defaultValue || '—'}</td>
                    <td className="py-4 px-4 text-center">
                      {v.required ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] uppercase font-bold rounded-full">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-500/10 border border-white/5 text-gray-500 text-[9px] uppercase font-bold rounded-full">
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDeleteVariable(v._id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                    No custom variables configured. Add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Variable inline form */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-xs uppercase font-bold tracking-widest text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent-purple" /> Add Custom Variable
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Variable Key
              </label>
              <input
                type="text"
                placeholder="e.g. user_name"
                value={newVarForm.name}
                onChange={e => setNewVarForm(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                className="glass-input w-full font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Full name of the visitor"
                value={newVarForm.description}
                onChange={e => setNewVarForm(prev => ({ ...prev, description: e.target.value }))}
                className="glass-input w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Default Fallback Value
              </label>
              <input
                type="text"
                placeholder="e.g. Customer"
                value={newVarForm.defaultValue}
                onChange={e => setNewVarForm(prev => ({ ...prev, defaultValue: e.target.value }))}
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newVarForm.required}
                onChange={e => setNewVarForm(prev => ({ ...prev, required: e.target.checked }))}
                className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Mark field as required inputs
              </span>
            </label>

            <button
              onClick={handleAddVariable}
              className="btn-primary flex items-center space-x-2 py-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Variable</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
