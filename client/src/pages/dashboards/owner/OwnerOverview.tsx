import React from "react";
import { motion } from "framer-motion";
import { Map, Clock, Users, BarChart3 } from "lucide-react";
import { useOwner } from "./context/OwnerContext.js";
import { ContextBar } from "./components/ContextBar.js";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";

export const OwnerOverview = () => {
  useDocumentTitle("Dashboard — OwnerHub");
  const { screens, loading } = useOwner();

  if (loading) return <div className="flex items-center justify-center min-h-[400px] font-black animate-pulse">SYNCHRONIZING CORE DATA...</div>;

  return (
    <DashboardPage
      title="Operational"
      accent="Insights"
      accentColor="text-accent-pink"
      badge="v2.0.4"
      subtitle="Managing your cinematic ecosystem with precision."
    >
      <ContextBar showScreenSelector={false} />

      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total Infrastructure', value: screens.length, unit: 'Screens', icon: Map, color: 'text-accent-blue' },
            { label: 'Scheduled Timeline', value: '35+', unit: 'Shows', icon: Clock, color: 'text-accent-purple' },
            { label: 'System Health', value: '100', unit: '% ONLINE', icon: Users, color: 'text-accent-pink' }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-10 rounded-[48px] flex flex-col gap-6 hover:bg-white/[0.08] transition-all group">
              <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shadow-xl`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">{stat.label}</p>
                <h3 className="text-5xl font-black text-white mt-1 flex items-baseline gap-2">
                  {stat.value}
                  <span className="text-sm text-gray-600 uppercase tracking-widest">{stat.unit}</span>
                </h3>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-[60px] p-16 flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-20 h-20 rounded-[28px] bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <BarChart3 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">Performance Analytics</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">Detailed revenue tracking and seat occupancy charts are currently being synchronized for your premium theatres.</p>
            </div>
        </div>
      </div>
    </DashboardPage>
  );
};
