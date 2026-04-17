import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Filter, Hammer } from "lucide-react";
import { SearchableSelect } from "../../ui/SearchableSelect.js";
import { moviesApi, adminApi, supportApi } from "../../../services/api/index.js";
import { CATEGORIES } from "../constants.js";
import type { User } from "../../../store/authStore.js";
import { PAGE_SIZE } from "../../../constants/pagination.js";

interface NewTicketModalProps {
  show: boolean;
  onClose: () => void;
  onCreated: () => void;
  user: User | null;
  userRole: "User" | "TheatreOwner" | "Guest";
  contextMetadata: any;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  show,
  onClose,
  onCreated,
  user,
  userRole,
  contextMetadata = {},
}) => {
  const [loading, setLoading] = useState(false);
  const [linkedTheatreId, setLinkedTheatreId] = useState("");
  const [linkedMovieId, setLinkedMovieId] = useState("");
  const [manualTheatres, setManualTheatres] = useState<any[]>([]);
  const [manualMovies, setManualMovies] = useState<any[]>([]);
  const [isSearchingResources, setIsSearchingResources] = useState(false);

  const myCategories = userRole === "Guest" ? CATEGORIES["User"] : CATEGORIES[userRole as "User" | "TheatreOwner"] || CATEGORIES["User"];

  const searchTheatres = useCallback(async (q: string) => {
    if (userRole !== "TheatreOwner") return;
    try {
      setIsSearchingResources(true);
      const res = await adminApi.listTheatres({ q });
      setManualTheatres(res.theatres);
    } finally {
      setIsSearchingResources(false);
    }
  }, [userRole]);

  const searchMovies = useCallback(async (q: string) => {
    try {
      setIsSearchingResources(true);
      const res = await moviesApi.list({ q, minimal: true, limit: PAGE_SIZE.DEFAULT });
      setManualMovies(res.movies);
    } finally {
      setIsSearchingResources(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const form = e.currentTarget;
    try {
      const mergedMetadata = {
        ...contextMetadata,
        ...(linkedTheatreId && { linkedTheatreId }),
        ...(linkedMovieId && { linkedMovieId }),
        timestamp: new Date().toISOString(),
      };

      const payload: any = {
        category: (form.elements.namedItem("category") as HTMLSelectElement).value,
        title: (form.elements.namedItem("title") as HTMLInputElement).value,
        description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
        priority: (form.elements.namedItem("priority") as HTMLSelectElement).value,
        metadata: mergedMetadata,
      };

      if (!user) {
        const guestName = (form.elements.namedItem("guestName") as HTMLInputElement).value;
        const guestEmail = (form.elements.namedItem("guestEmail") as HTMLInputElement).value;
        payload.guestInfo = { name: guestName, email: guestEmail };
        
        localStorage.setItem("guest_name", guestName);
        localStorage.setItem("guest_email", guestEmail);
      }

      const res = await supportApi.create(payload);
      const newIssue = res.issue;

      if (!user) {
        const guestTickets = localStorage.getItem("myGuestTickets");
        const updatedTickets = guestTickets ? `${guestTickets},${newIssue._id}` : newIssue._id;
        localStorage.setItem("myGuestTickets", updatedTickets);
        localStorage.setItem(`guest_session_${newIssue._id}`, "true");
      }

      onCreated();
      onClose();
    } catch (err) {
      alert("Failed to submit ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-surface border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-blue to-transparent opacity-50" />
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">Deploy Support Request</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!user && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Name</label>
                    <input
                      name="guestName"
                      required
                      placeholder="Cyber Entity"
                      defaultValue={localStorage.getItem("guest_name") || ""}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Email</label>
                    <input
                      name="guestEmail"
                      required
                      type="email"
                      placeholder="entity@net.com"
                      defaultValue={localStorage.getItem("guest_email") || ""}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</label>
                  <select
                    name="category"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all appearance-none cursor-pointer text-xs font-bold"
                  >
                    {myCategories.map((c) => (
                      <option key={c} value={c} className="bg-black text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Priority</label>
                  <select
                    name="priority"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all appearance-none cursor-pointer text-xs font-bold"
                  >
                    <option value="LOW" className="bg-black text-white">LOW</option>
                    <option value="MEDIUM" className="bg-black text-white" selected>MEDIUM</option>
                    <option value="HIGH" className="bg-black text-white">HIGH</option>
                    <option value="CRITICAL" className="bg-black text-white text-red-500">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Headline</label>
                <input
                  name="title"
                  required
                  placeholder="Subject of the anomaly..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Description</label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="Describe the behavior in detail..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all text-xs resize-none"
                />
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Filter size={12} className="text-accent-blue" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Link Related Resources</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userRole === "TheatreOwner" && (
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Target Theatre</label>
                      <SearchableSelect
                        options={manualTheatres.map((t) => ({ id: t._id, name: t.name }))}
                        onSearch={searchTheatres}
                        value={linkedTheatreId}
                        onChange={(id) => setLinkedTheatreId(id)}
                        isLoading={isSearchingResources}
                        placeholder="Find Theatre..."
                        className="text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Related Movie</label>
                    <SearchableSelect
                      options={manualMovies.map((m) => ({ id: m._id, name: m.title }))}
                      onSearch={searchMovies}
                      value={linkedMovieId}
                      onChange={(id) => setLinkedMovieId(id)}
                      isLoading={isSearchingResources}
                      placeholder="Find Movie..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {Object.keys(contextMetadata).length > 0 && (
                <div className="p-4 bg-accent-blue/5 border border-accent-blue/10 rounded-2xl">
                  <span className="text-[8px] font-black text-accent-blue uppercase block mb-2 tracking-widest flex items-center gap-2 underline underline-offset-4">
                    <Hammer size={10} /> Auto-Context Detected
                  </span>
                  <div className="flex flex-wrap gap-4 opacity-50">
                    {Object.entries(contextMetadata).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[8px] font-black uppercase text-gray-400">
                        <span className="text-gray-600">{k}:</span> {String(v).slice(-8)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-8 py-4 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent-blue/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Transmitting..." : "Submit Entry"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
