import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, Film, Trash2, Edit3, AlertCircle } from "lucide-react";
import { useOwner } from "./context/OwnerContext.js";
import { ContextBar } from "./components/ContextBar.js";
import { adminApi } from "../../../services/api/index.js";
import { ShowtimeForm } from "./components/ShowtimeForm.js";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";

export const OwnerTimeline = () => {
  useDocumentTitle("Timeline — OwnerHub");
  const { selectedTheatreId, selectedScreenId, loading } = useOwner();
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingShow, setEditingShow] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchShowtimes = async () => {
    if (!selectedScreenId) return setShowtimes([]);
    try {
      const res = await adminApi.listShowtimesByScreen(selectedScreenId);
      setShowtimes(res.showtimes);
    } catch (err) {
      console.error("Failed to fetch showtimes", err);
    }
  };

  useEffect(() => {
    fetchShowtimes();
  }, [selectedScreenId]);

  const handleCreateShowtime = async (data: any) => {
    try {
      setError(null);
      await adminApi.createShowtime({
        ...data,
        theatreId: selectedTheatreId,
        screenId: selectedScreenId
      });
      setShowAddForm(false);
      fetchShowtimes();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create showtime");
    }
  };

  const handleUpdateShowtime = async (data: any) => {
    if (!editingShow) return;
    try {
      setError(null);
      await adminApi.updateShowtime(editingShow._id, data);
      setEditingShow(null);
      fetchShowtimes();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update showtime");
    }
  };

  const handleDeleteShowtime = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this performance? This cannot be undone.")) return;
    try {
      await adminApi.deleteShowtime(id);
      fetchShowtimes();
    } catch (err) {
      alert("Failed to delete showtime");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] font-black animate-pulse text-accent-blue">SYNCHRONIZING CORE DATA...</div>;

  return (
    <DashboardPage
      title="Timeline"
      accent="Suite"
      accentColor="text-accent-purple"
      badge="Pro v2.1"
      subtitle="Advanced conflict-aware cinematic scheduling."
      headerActions={
        <button
          onClick={() => setShowAddForm(true)}
          className="px-8 py-4 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={18} /> Schedule New Performance
        </button>
      }
    >
      <ContextBar />
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-600">Active Screen Schedule</h3>
        </div>

        {}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
            >
              <AlertCircle size={16} /> {error}
              <button onClick={() => setError(null)} className="ml-auto hover:text-white">DISMISS</button>
            </motion.div>
          )}
        </AnimatePresence>

        {}
        <AnimatePresence mode="wait">
          {(showAddForm || editingShow) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <ShowtimeForm 
                mode={editingShow ? "edit" : "add"}
                initialData={editingShow}
                onSubmit={editingShow ? handleUpdateShowtime : handleCreateShowtime}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingShow(null);
                  setError(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-4">
          {showtimes.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-24 flex flex-col items-center gap-8 text-white/5 group">
               <Clock size={80} strokeWidth={1} className="group-hover:text-accent-blue/20 transition-colors" />
               <p className="font-black uppercase tracking-[1em] text-[10px]">No Performances Slotted</p>
            </div>
          ) : (
            showtimes.map((show) => {
              const isPast = new Date(show.endTime) < new Date();
              const isCurrent = new Date(show.startTime) <= new Date() && new Date(show.endTime) >= new Date();

              return (
                <div key={show._id} className={`bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between group transition-all relative overflow-hidden ${isPast ? 'opacity-40' : 'hover:bg-white/[0.08] hover:border-white/20'}`}>
                  {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-blue animate-pulse shadow-[0_0_15px_rgba(0,186,255,0.8)]" />}
                  
                  <div className="flex items-center gap-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isCurrent ? 'bg-accent-blue/10 text-accent-blue' : 'bg-accent-purple/10 text-accent-purple'}`}>
                      <Film size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black flex items-center gap-3">
                        {show.movieId.title}
                        {isCurrent && <span className="text-[8px] px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded-full">LIVE</span>}
                      </h4>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2">
                          <Clock size={12} className="text-accent-pink" /> 
                          {new Date(show.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(show.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest px-2 bg-accent-blue/10 rounded-md border border-accent-blue/20">{show.format}</span>
                        <span className="text-[10px] font-black text-gray-600 uppercase">Dur: {show.movieId.duration}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingShow(show)}
                      className="p-4 text-gray-600 hover:text-white transition-all hover:bg-white/5 rounded-2xl"
                      title="Edit Performance"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteShowtime(show._id)}
                      className="p-4 text-gray-800 group-hover:text-red-500/40 hover:text-red-500 transition-all hover:bg-red-500/5 rounded-2xl"
                      title="Cancel Performance"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </DashboardPage>
  );
};
