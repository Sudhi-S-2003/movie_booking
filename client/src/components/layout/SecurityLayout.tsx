import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Shield, Fingerprint, Activity } from 'lucide-react';
import { SEO } from '../common/SEO.js';

export const SecurityLayout: React.FC = () => {
  // Helper to determine active tab class names
  const getTabClass = (isActive: boolean) => {
    const base = "flex items-center justify-center gap-2.5 px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex-1 sm:flex-none ";
    if (isActive) {
      return base + "bg-gradient-to-r from-accent-purple/20 to-accent-blue/20 border-accent-purple/40 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] scale-[1.02]";
    }
    return base + "bg-white/[0.01] border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300 hover:scale-[1.01]";
  };

  return (
    <div className="space-y-8 w-full max-w-full py-2">
      <SEO 
        title="Dashboard Security Settings" 
        description="Configure two-factor authentication and register biometric passkeys." 
      />

      <div className="flex flex-col gap-8 w-full">
        {/* Sleek Header & Glowing Tabs at the top */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Account Protection</h1>
            <p className="text-xs text-gray-500 mt-1">Strengthen your dashboard and credentials with enterprise MFA and passkeys.</p>
          </div>

          {/* TOP TAB NAV PILLS */}
          <div className="flex items-center gap-3 bg-[#141416]/40 p-1.5 rounded-full border border-white/5 w-full sm:w-auto self-stretch sm:self-auto">
            <NavLink 
              to="2fa" 
              className={({ isActive }) => getTabClass(isActive)}
            >
              <Shield size={14} className="text-accent-purple" />
              <span>Two-Factor</span>
            </NavLink>

            <NavLink 
              to="pass-key" 
              className={({ isActive }) => getTabClass(isActive)}
            >
              <Fingerprint size={14} className="text-accent-blue" />
              <span>Passkeys</span>
            </NavLink>

            <NavLink 
              to="sessions" 
              className={({ isActive }) => getTabClass(isActive)}
            >
              <Activity size={14} className="text-accent-pink" />
              <span>Sessions</span>
            </NavLink>
          </div>
        </div>

        {/* FULL WIDTH RESPONSIVE PAGES VIEWPORT */}
        <div className="w-full">
          <div className="bg-white/[0.01] border border-white/5 p-6 sm:p-10 md:p-12 rounded-[32px] sm:rounded-[48px] backdrop-blur-md shadow-2xl w-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
export default SecurityLayout;
