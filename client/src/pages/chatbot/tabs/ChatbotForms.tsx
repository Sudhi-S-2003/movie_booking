import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, Layers, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatbotApi, type ChatbotFormField } from '../../../services/api/chatbot.api.js';
import { toast } from '../../../utils/toast.js';
import { AsyncSelect } from '../../../components/common/AsyncSelect.js';

export const ChatbotForms: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();

  const [formFields, setFormFields] = useState<ChatbotFormField[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFieldForm, setNewFieldForm] = useState({
    name: '',
    label: '',
    fieldType: 'text' as 'text' | 'number' | 'email' | 'phone' | 'date' | 'select',
    required: true,
    order: 0,
    optionsRaw: '',
    placeholder: '',
    validationRegex: '',
    validationMessage: '',
  });

  const [submissionTemplateId, setSubmissionTemplateId] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      chatbotApi.listFormFields(id),
      chatbotApi.listTemplates(id, {})
    ])
      .then(([fRes, tRes]) => {
        let loadedFields: any[] = [];
        if (Array.isArray(fRes)) loadedFields = fRes;
        else if (fRes && Array.isArray((fRes as any).formFields)) loadedFields = (fRes as any).formFields;
        else if (fRes && Array.isArray((fRes as any).fields)) loadedFields = (fRes as any).fields;
        else if (fRes && Array.isArray((fRes as any).data)) loadedFields = (fRes as any).data;
        else if (fRes && (fRes as any).data && Array.isArray((fRes as any).data.formFields)) loadedFields = (fRes as any).data.formFields;
        else if (fRes && (fRes as any).data && Array.isArray((fRes as any).data.fields)) loadedFields = (fRes as any).data.fields;

        setFormFields(loadedFields);
        setTemplates(tRes.templates || []);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load forms data');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Auto populate submission template from existing fields
  useEffect(() => {
    const firstField = formFields[0];
    if (firstField?.submissionTemplateId) {
      setSubmissionTemplateId(firstField.submissionTemplateId);
    }
  }, [formFields]);

  const searchTemplates = useCallback(async (q: string) => {
    if (!id) return [];
    try {
      const res = await chatbotApi.listTemplates(id, { q });
      return (res.templates || []).map(t => ({ value: t._id, label: t.name }));
    } catch {
      return [];
    }
  }, [id]);

  const handleAddFormField = useCallback(async () => {
    if (!id) return;
    if (!newFieldForm.name.trim() || !newFieldForm.label.trim()) {
      toast.error('Field code name and question label are required');
      return;
    }
    try {
      const options = newFieldForm.fieldType === 'select'
        ? newFieldForm.optionsRaw.split(',').map(o => o.trim()).filter(Boolean)
        : undefined;

      const payload: Partial<ChatbotFormField> = {
        name: newFieldForm.name,
        label: newFieldForm.label,
        fieldType: newFieldForm.fieldType,
        required: newFieldForm.required,
        order: newFieldForm.order,
        options,
        placeholder: newFieldForm.placeholder || undefined,
        validationRegex: newFieldForm.validationRegex || undefined,
        validationMessage: newFieldForm.validationMessage || undefined,
      };

      const res = await chatbotApi.addFormField(id, payload);
      setFormFields(prev => [...prev, res.field].sort((a, b) => a.order - b.order));
      setNewFieldForm({
        name: '',
        label: '',
        fieldType: 'text',
        required: true,
        order: formFields.length + 1,
        optionsRaw: '',
        placeholder: '',
        validationRegex: '',
        validationMessage: '',
      });
      toast.success('Form input field added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add form field');
    }
  }, [id, newFieldForm, formFields.length]);

  const handleDeleteFormField = useCallback(async (fieldId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteFormField(id, fieldId);
      setFormFields(prev => prev.filter(f => f._id !== fieldId));
      toast.success('Form field deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete form field');
    }
  }, [id]);

  const handleUpdateSubmissionTemplate = useCallback(async (templateId: string) => {
    if (!id || formFields.length === 0) return;
    setSubmissionTemplateId(templateId);
    try {
      // Fire all updates in parallel — one network round-trip per field
      await Promise.all(
        formFields.map(field =>
          chatbotApi.updateFormField(id, field._id, { submissionTemplateId: templateId || null })
        )
      );
      setFormFields(prev => prev.map(f => ({ ...f, submissionTemplateId: templateId || null })));
      toast.success('Submission response template updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update submission template');
    }
  }, [id, formFields]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      key="form-builder"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Creator Form */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent-purple" /> Add Wizard Form Field Input
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Variable Key Name *
            </label>
            <input
              type="text"
              placeholder="e.g. visitor_email"
              value={newFieldForm.name}
              onChange={e => setNewFieldForm(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
              className="glass-input w-full font-mono text-xs font-bold"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Prompt Question Label *
            </label>
            <input
              type="text"
              placeholder="e.g. Please enter your email address"
              value={newFieldForm.label}
              onChange={e => setNewFieldForm(prev => ({ ...prev, label: e.target.value }))}
              className="glass-input w-full text-xs font-semibold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Field Input Type
            </label>
            <select
              value={newFieldForm.fieldType}
              onChange={e => setNewFieldForm(prev => ({ ...prev, fieldType: e.target.value as any }))}
              className="glass-input w-full bg-slate-950 text-xs font-semibold"
            >
              <option value="text">Plain Text</option>
              <option value="number">Numeric Number</option>
              <option value="email">Email Address</option>
              <option value="phone">Phone Number</option>
              <option value="date">Calendar Date</option>
              <option value="select">Dropdown Select</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Input Placeholder
            </label>
            <input
              type="text"
              placeholder="e.g. name@domain.com"
              value={newFieldForm.placeholder}
              onChange={e => setNewFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
              className="glass-input w-full text-xs"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Validation Regular Expression
            </label>
            <input
              type="text"
              placeholder="e.g. ^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$"
              value={newFieldForm.validationRegex}
              onChange={e => setNewFieldForm(prev => ({ ...prev, validationRegex: e.target.value }))}
              className="glass-input w-full font-mono text-[11px] text-accent-purple"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Validation Error message
            </label>
            <input
              type="text"
              placeholder="e.g. Email syntax is invalid"
              value={newFieldForm.validationMessage}
              onChange={e => setNewFieldForm(prev => ({ ...prev, validationMessage: e.target.value }))}
              className="glass-input w-full text-xs"
            />
          </div>
        </div>

        {newFieldForm.fieldType === 'select' && (
          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
              Select options (comma-separated list) *
            </label>
            <input
              type="text"
              placeholder="e.g. Support Request, Sales Query, Custom Issue"
              value={newFieldForm.optionsRaw}
              onChange={e => setNewFieldForm(prev => ({ ...prev, optionsRaw: e.target.value }))}
              className="glass-input w-full text-xs"
            />
          </div>
        )}

        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          <div className="flex gap-6 items-center">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newFieldForm.required}
                onChange={e => setNewFieldForm(prev => ({ ...prev, required: e.target.checked }))}
                className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Field input is required
              </span>
            </label>

            <div className="flex items-center space-x-2">
              <span className="text-[9px] uppercase font-bold text-gray-400">Order:</span>
              <input
                type="number"
                value={newFieldForm.order}
                onChange={e => setNewFieldForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                className="glass-input py-1 text-center w-12 font-mono text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleAddFormField}
            className="btn-primary flex items-center space-x-2 py-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add input field</span>
          </button>
        </div>
      </div>

      {/* Form fields visual list */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-accent-purple" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Registration Wizard Form Inputs
          </h4>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          {formFields.length > 0 ? (
            formFields.map(field => {
              if (!field) return null;
              return (
              <div key={field._id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex items-start justify-between text-xs font-semibold">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple flex items-center justify-center font-mono rounded font-bold">
                      {field.order}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[9px] uppercase font-bold border border-rose-500/20">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="pl-9 space-y-1.5 text-[11px] text-gray-400 leading-normal font-normal">
                    <p>
                      Variable Placeholder Code: <code className="text-accent-blue font-mono font-bold">{"{{"}{field.name}{"}}"}</code>
                    </p>
                    <p>
                      Input field Type: <span className="font-bold uppercase text-white font-mono">{field.fieldType}</span>
                    </p>
                    {field.placeholder && <p>Hint Placeholder: <span className="italic">"{field.placeholder}"</span></p>}
                    {field.options && field.options.length > 0 && (
                      <p>Dropdown choices: <span className="font-mono text-emerald-400">{field.options.join(' | ')}</span></p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteFormField(field._id)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              );
            })
          ) : (
            <div className="py-12 border border-dashed border-white/5 rounded-2xl text-center text-gray-500 text-xs italic">
              No form fields configured. Add one using the form card.
            </div>
          )}

          {/* Submission response template setup */}
          {formFields.length > 0 && (
            <div className="glass-card p-6 bg-slate-950/20 space-y-4 border-emerald-500/10 mt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
                <h5 className="text-sm font-bold text-white uppercase tracking-wider">
                  Form Submission Action
                </h5>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Select the template response sent to the user immediately after filling in the final field.
              </p>

              <div className="space-y-2">
                <AsyncSelect
                  value={submissionTemplateId || ''}
                  onChange={val => handleUpdateSubmissionTemplate(val)}
                  onSearch={searchTemplates}
                  defaultLabel={templates.find(t => t._id === submissionTemplateId)?.name}
                  placeholder="(Select response template)"
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
