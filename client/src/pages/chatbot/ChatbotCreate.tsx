import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Workflow,
  Menu as MenuIcon,
  Layout,
  Check,
  Languages,
  RefreshCw,
} from 'lucide-react';
import { chatbotApi } from '../../services/api/chatbot.api.js';
import { toast } from '../../utils/toast.js';
import { clsx } from 'clsx';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi / हिन्दी' },
  { code: 'ta', name: 'Tamil / தமிழ்' },
  { code: 'te', name: 'Telugu / తెలుగు' },
  { code: 'ml', name: 'Malayalam / മലയാളം' },
  { code: 'kn', name: 'Kannada / ಕನ್ನಡ' },
  { code: 'es', name: 'Spanish / Español' },
  { code: 'fr', name: 'French / Français' },
  { code: 'de', name: 'German / Deutsch' },
  { code: 'ja', name: 'Japanese / 日本語' },
  { code: 'ko', name: 'Korean / 한국어' },
];

export const ChatbotCreate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'en',
    type: 'keyword-only' as 'keyword-only' | 'flow' | 'menu' | 'form',
    avatarUrl: '',
  });

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error('Please enter a chatbot name');
      return;
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await chatbotApi.create(formData);
      toast.success(`Chatbot ${formData.name} created successfully!`);
      // Navigate to detail page of the created chatbot
      navigate(`../${response.chatbot._id}`);
    } catch (error: any) {
      console.error('Failed to create chatbot:', error);
      toast.error(error.response?.data?.message || 'Failed to create chatbot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('../chatbots')}
          className="p-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Create Chatbot
          </h1>
          <p className="text-gray-500 text-xs font-semibold">WIZARD</p>
        </div>
      </div>

      {/* Wizard Steps indicator */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-accent-purple to-accent-blue -translate-y-1/2 transition-all duration-300 z-0"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        />
        <div className="relative flex justify-between z-10">
          {[
            { num: 1, label: 'Basics' },
            { num: 2, label: 'Type' },
            { num: 3, label: 'Review' },
          ].map(s => (
            <div key={s.num} className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300',
                  step > s.num
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : step === s.num
                    ? 'bg-accent-purple border-accent-purple text-white shadow-[0_0_15px_rgba(109,40,217,0.4)]'
                    : 'bg-slate-950 border-white/10 text-gray-500'
                )}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={clsx(
                  'text-[10px] uppercase font-bold tracking-wider mt-2 transition-colors duration-300',
                  step === s.num ? 'text-accent-purple' : 'text-gray-500'
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Body */}
      <div className="glass-card p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  General Information
                </h3>
                <p className="text-gray-400 text-xs">
                  Give your chatbot a name, a quick description, and pick its default communication language.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Chatbot Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HelpDesk AI"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input w-full font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Language
                  </label>
                  <div className="relative">
                    <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                      value={formData.language}
                      onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
                      className="glass-input pl-10 w-full appearance-none bg-slate-950 font-semibold"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.png"
                    value={formData.avatarUrl}
                    onChange={e => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                    className="glass-input w-full font-mono text-xs text-accent-blue"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what this chatbot is built to do..."
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="glass-input w-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Choose Chatbot Type</h3>
                <p className="text-gray-400 text-xs">
                  Pick the routing type that fits your conversation flow. You cannot change this later.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    value: 'keyword-only' as const,
                    label: 'Keyword-Only',
                    desc: 'Trigger responses strictly based on keyword matching. Non-interactive conversation.',
                    icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
                    borderClass: 'hover:border-blue-500/40 border-blue-500/20 bg-blue-950/5',
                    activeBorder: 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-blue-900/10',
                  },
                  {
                    value: 'flow' as const,
                    label: 'Conversation Flow',
                    desc: 'Multi-step dialogue state engine. Map next steps and trigger criteria in a visual tree layout.',
                    icon: <Workflow className="w-6 h-6 text-purple-400" />,
                    borderClass: 'hover:border-purple-500/40 border-purple-500/20 bg-purple-950/5',
                    activeBorder: 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-purple-900/10',
                  },
                  {
                    value: 'menu' as const,
                    label: 'Menu-Based',
                    desc: 'Offer interactive quick-reply buttons. Link options to templates or submenu branches.',
                    icon: <MenuIcon className="w-6 h-6 text-amber-400" />,
                    borderClass: 'hover:border-amber-500/40 border-amber-500/20 bg-amber-950/5',
                    activeBorder: 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-900/10',
                  },
                  {
                    value: 'form' as const,
                    label: 'Wizard Input Form',
                    desc: 'Step-by-step field validation (phone, email, date, etc.) to collect visitor registration data.',
                    icon: <Layout className="w-6 h-6 text-emerald-400" />,
                    borderClass: 'hover:border-emerald-500/40 border-emerald-500/20 bg-emerald-950/5',
                    activeBorder: 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-900/10',
                  },
                ].map(type => {
                  const isSelected = formData.type === type.value;
                  return (
                    <div
                      key={type.value}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={clsx(
                        'border rounded-2xl p-6 cursor-pointer flex flex-col justify-between transition-all duration-300',
                        isSelected ? type.activeBorder : 'border-white/5 bg-slate-950/30 hover:border-white/20'
                      )}
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                          {type.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{type.label}</h4>
                          <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{type.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Review Configurations</h3>
                <p className="text-gray-400 text-xs">
                  Confirm the details below. Once created, you can customize keywords, templates, variables, and flows.
                </p>
              </div>

              <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 space-y-4 font-semibold text-sm">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    Name
                  </span>
                  <span className="text-white font-bold">{formData.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    Language
                  </span>
                  <span className="text-white uppercase font-bold tracking-wider">
                    {formData.language}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    Type
                  </span>
                  <span className="text-accent-blue uppercase font-bold tracking-wider">
                    {formData.type}
                  </span>
                </div>
                {formData.description && (
                  <div className="py-2">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block mb-1">
                      Description
                    </span>
                    <p className="text-gray-400 text-xs font-normal leading-relaxed">
                      {formData.description}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Button Controls */}
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-semibold text-sm transition-all flex items-center space-x-2 border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            className="btn-primary flex items-center space-x-2"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all rounded-lg font-bold text-sm text-white flex items-center space-x-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Create Now</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
