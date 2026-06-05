import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate, Outlet, NavLink } from 'react-router-dom';
import { ArrowLeft, Settings, Code, Tag, FileCode, Workflow, Menu as MenuIcon, Layout, Power, PowerOff, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useChatbotStore } from '../../store/chatbotStore.js';
import { toast } from '../../utils/toast.js';
import { chatbotApi } from '../../services/api/chatbot.api.js';

export const ChatbotDetailLayout: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    currentChatbot: chatbot,
    loadingCurrent: loading,
    fetchCurrentChatbot,
    clearCurrentChatbot,
    updateCurrentChatbotLocally,
    updateChatbotState
  } = useChatbotStore();

  useEffect(() => {
    if (id) {
      fetchCurrentChatbot(id).catch(() => navigate('..', { relative: 'path' }));
    }
    return () => {
      clearCurrentChatbot();
    };
  }, [id, fetchCurrentChatbot, clearCurrentChatbot, navigate]);

  const toggleStatus = useCallback(async () => {
    if (!id || !chatbot) return;
    try {
      const res = await chatbotApi.update(id, { isActive: !chatbot.isActive });
      updateCurrentChatbotLocally({ isActive: res.chatbot.isActive });
      updateChatbotState(id, { isActive: res.chatbot.isActive });
      toast.success(res.chatbot.isActive ? 'Chatbot Activated' : 'Chatbot Deactivated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle status');
    }
  }, [id, chatbot, updateCurrentChatbotLocally, updateChatbotState]);

  const tabs = useMemo(() => {
    const defaultTabs = [
      { id: 'overview', label: 'Overview', icon: <Settings className="w-4 h-4" /> },
      { id: 'variables', label: 'Variables', icon: <Code className="w-4 h-4" /> },
      { id: 'keywords', label: 'Keywords', icon: <Tag className="w-4 h-4" /> },
      { id: 'templates', label: 'Templates', icon: <FileCode className="w-4 h-4" /> },
    ];

    if (chatbot?.type === 'flow') {
      defaultTabs.push({ id: 'flow-builder', label: 'Flow Builder', icon: <Workflow className="w-4 h-4" /> });
    } else if (chatbot?.type === 'menu') {
      defaultTabs.push({ id: 'menu-builder', label: 'Menu Builder', icon: <MenuIcon className="w-4 h-4" /> });
    } else if (chatbot?.type === 'form') {
      defaultTabs.push({ id: 'form-builder', label: 'Form Builder', icon: <Layout className="w-4 h-4" /> });
    }

    return defaultTabs;
  }, [chatbot?.type]);

  if (loading || !chatbot) {
    return (
      <div className="w-full min-h-[85vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-accent-blue/20 blur-xl rounded-full" />
            <Loader2 className="w-12 h-12 text-accent-blue animate-spin relative z-10" />
          </div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase animate-pulse">
            Loading Bot Architecture...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Profile Section */}
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => navigate('..', { relative: 'path' })}
            className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center border border-white/10 shadow-lg relative overflow-hidden">
              {chatbot.avatarUrl ? (
                <img src={chatbot.avatarUrl} alt="Bot Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center space-x-3">
                <span>{chatbot.name}</span>
                <span className={clsx(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  chatbot.isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {chatbot.isActive ? 'Active' : 'Offline'}
                </span>
              </h1>
              <p className="text-gray-400 mt-1 font-mono text-xs max-w-lg truncate">
                {chatbot.description || 'No description provided'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto">
          <button
            onClick={toggleStatus}
            className={clsx(
              "btn-primary flex items-center justify-center space-x-2 py-2 flex-1 md:flex-none",
              chatbot.isActive ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            )}
          >
            {chatbot.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            <span>{chatbot.isActive ? 'Deactivate Bot' : 'Activate Bot'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className={clsx(
          "flex overflow-x-auto hide-scrollbar lg:flex-col lg:space-y-2 space-x-2 lg:space-x-0 pb-2 lg:pb-0 transition-all duration-300 relative shrink-0",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}>
          {/* Collapse Toggle Button - Desktop Only */}
          <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="hidden lg:flex absolute -right-4 top-4 bg-slate-900 border border-white/10 rounded-full p-1 z-20 hover:bg-slate-800 transition-colors shadow-lg"
          >
             {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
          </button>

          {tabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.id}
              title={isCollapsed ? tab.label : undefined}
              className={({ isActive }) => clsx(
                "flex-none lg:w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative group overflow-hidden whitespace-nowrap",
                isActive ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20" : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent",
                isCollapsed && "lg:justify-center lg:px-0"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicatorLayout"
                      className="absolute inset-0 bg-gradient-to-r from-accent-blue/10 to-transparent"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10">{tab.icon}</div>
                  {!isCollapsed && <span className="font-bold text-sm tracking-wide relative z-10 hidden lg:block">{tab.label}</span>}
                  <span className="font-bold text-sm tracking-wide relative z-10 lg:hidden">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 relative min-h-[60vh] w-full">
          <div className="w-full h-full relative">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
});
