import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { integrationApi, type IntegrationRecord } from '../services/api/integration.api.js';
import { clsx } from 'clsx';

export const Integrations = () => {
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const data = await integrationApi.list();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (type: string) => {
    setToggling(type);
    try {
      const updated = await integrationApi.toggle(type);
      setIntegrations(prev => {
        const index = prev.findIndex(i => i.type === type);
        if (index === -1) return [...prev, updated];
        const newArr = [...prev];
        newArr[index] = updated;
        return newArr;
      });
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setToggling(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const telinfyIntegration = integrations.find(i => i.type === 'telinfy');
  const isActive = telinfyIntegration?.isActive || false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-accent-purple/10 rounded-lg">
            <Puzzle className="w-6 h-6 text-accent-purple" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Integrations</h1>
        </div>
        <p className="text-gray-400 text-sm max-w-2xl">
          Connect your account with external services to automate workflows and enhance your experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telinfy Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            "relative overflow-hidden rounded-2xl border transition-all duration-300",
            isActive
              ? "bg-slate-900/50 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              : "bg-slate-950/50 border-white/5"
          )}
        >
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isActive ? (
              <span className="flex items-center px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </span>
            ) : (
              <span className="flex items-center px-2 py-1 bg-gray-500/10 text-gray-500 text-xs font-medium rounded-full border border-white/5">
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </span>
            )}
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                <ShieldCheck className={clsx("w-6 h-6 transition-colors", isActive ? "text-emerald-400" : "text-gray-600")} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Telinfy</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Secure messaging and event syndication via the Telinfy protocol.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => handleToggle('telinfy')}
                disabled={toggling === 'telinfy'}
                className={clsx(
                  "px-6 py-2 rounded-full font-semibold text-sm transition-all flex items-center space-x-2",
                  isActive
                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    : "bg-accent-purple text-white hover:bg-accent-purple/80 shadow-lg shadow-accent-purple/20"
                )}
              >
                {toggling === 'telinfy' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{isActive ? 'Disconnect' : 'Connect Now'}</span>
                )}
              </button>

              <a href="#" className="text-xs text-gray-500 hover:text-white flex items-center transition-colors">
                View Documentation <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          {/* Webhook Section */}
          <AnimatePresence>
            {isActive && telinfyIntegration?.webhookUrl && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/5 bg-black/20"
              >
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center">
                      <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                      Webhook Endpoint
                    </label>
                  </div>
                  <div className="relative group">
                    <div className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 pr-12 text-xs font-mono text-emerald-400 truncate break-all">
                      {telinfyIntegration.webhookUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(telinfyIntegration.webhookUrl!)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-md transition-colors text-gray-500 hover:text-white"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    All requests must be signed using the signature provided in the URL.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Coming Soon Placeholder */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-8 flex flex-col items-center justify-center space-y-4 border-dashed opacity-50 grayscale">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
            <Puzzle className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-gray-500 font-medium text-sm">More Integrations Coming Soon</p>
        </div>
      </div>
    </div>
  );
};
