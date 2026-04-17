import React, { useEffect, useState } from "react";
import { moviesApi } from "../../../services/api/index.js";
import { Plus, Film, Search, Filter, Edit3, Trash2, Calendar, Globe, Clock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";
import { PAGE_SIZE } from "../../../constants/pagination.js";

export const AdminMovies = () => {
  useDocumentTitle("Movies — OpsCenter");
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const res = await moviesApi.list({ q: searchQuery, limit: PAGE_SIZE.MOVIES });
      setMovies(res.movies);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [searchQuery]);

  const [newMovie, setNewMovie] = useState({
    title: "",
    duration: 120,
    language: "English",
    posterUrl: "",
    showStatus: "UPCOMING",
    certification: "UA",
    genres: ["Action"]
  });

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await moviesApi.create(newMovie as any); 
      setShowAddModal(false);
      fetchMovies();
      setNewMovie({
        title: "",
        duration: 120,
        language: "English",
        posterUrl: "",
        showStatus: "UPCOMING",
        certification: "UA",
        genres: ["Action"]
      });
    } catch (err) {
      alert("Failed to register movie");
    }
  };

  return (
    <DashboardPage
      title="Movie"
      accent="Catalogue"
      accentColor="text-accent-pink"
      subtitle="Curation & Distribution Control"
      headerActions={
        <div className="flex flex-wrap gap-4">
          <div className="relative group max-w-xs w-full lg:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Filter catalogue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 py-3 pl-14 pr-6 rounded-2xl outline-none focus:border-accent-pink/50 transition-all font-bold text-[10px] uppercase tracking-widest"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-8 py-3 bg-accent-pink text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-accent-pink/20 hover:scale-105 transition-all"
          >
            <Plus size={18} /> Add New Entry
          </button>
        </div>
      }
    >

      {}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
            <Film size={80} className="text-white/5 animate-spin duration-[4s]" />
            <p className="text-[10px] font-black uppercase tracking-[1em] text-gray-800">Deciphering Catalogue Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {movies.map((movie) => (
                <div key={movie._id} className="relative group bg-white/5 border border-white/10 rounded-[48px] overflow-hidden hover:bg-white/[0.08] transition-all flex flex-col shadow-2xl backdrop-blur-3xl">
                    <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={movie.posterUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                        
                        <div className="absolute top-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-2xl">
                            {movie.certification}
                        </div>

                        <div className="absolute bottom-6 left-8 right-8">
                             <h3 className="text-2xl font-black text-white tracking-tight line-clamp-1">{movie.title}</h3>
                             <div className="flex gap-4 mt-2">
                                 <span className="text-[9px] font-black text-accent-pink uppercase tracking-widest">{movie.showStatus}</span>
                                 <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest underline underline-offset-4 decoration-accent-pink/40">{movie.language}</span>
                             </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 flex-1 flex flex-col">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: Clock, label: "Runtime", value: `${movie.duration}m` },
                                { icon: Calendar, label: "Release", value: new Date(movie.releaseDate).getFullYear() },
                                { icon: Globe, label: "Format", value: "2D/3D" },
                            ].map((spec, i) => (
                                <div key={i} className="flex flex-col gap-1.5 p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <spec.icon size={12} className="text-gray-600" />
                                    <span className="text-[9px] font-black text-white">{spec.value}</span>
                                    <span className="text-[7px] font-bold text-gray-700 uppercase">{spec.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-white/5">
                            <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl flex items-center justify-center gap-2 transition-all group/btn">
                                <Edit3 size={14} className="text-gray-500 group-hover/btn:text-accent-blue" />
                                <span className="text-[9px] font-black uppercase text-gray-400 group-hover/btn:text-white">Edit Meta</span>
                            </button>
                            <button className="p-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500 transition-all group/trash rounded-xl text-red-500 hover:text-white shadow-xl shadow-red-500/0 hover:shadow-red-500/20">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-surface border border-white/10 w-full max-w-4xl rounded-[60px] p-16 shadow-2xl overflow-hidden relative"
             >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-pink to-transparent opacity-50" />
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-4 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                
                <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Register Cinematic Work</h2>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-12">Universal Distribution Schema Entry</p>

                <form onSubmit={handleAddMovie} className="grid grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Movie Identity</label>
                         <input 
                            required
                            placeholder="Official Title..." 
                            value={newMovie.title}
                            onChange={(e) => setNewMovie({...newMovie, title: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-pink/50 transition-all font-bold text-[11px]" 
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Duration (min)</label>
                            <input 
                                required
                                type="number" 
                                placeholder="120" 
                                value={newMovie.duration}
                                onChange={(e) => setNewMovie({...newMovie, duration: parseInt(e.target.value)})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-pink/50 transition-all font-bold text-[11px]" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Language</label>
                            <input 
                                required
                                placeholder="English" 
                                value={newMovie.language}
                                onChange={(e) => setNewMovie({...newMovie, language: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-pink/50 transition-all font-bold text-[11px]" 
                            />
                         </div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Poster Hyperlink</label>
                         <input 
                            required
                            placeholder="https://..." 
                            value={newMovie.posterUrl}
                            onChange={(e) => setNewMovie({...newMovie, posterUrl: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-pink/50 transition-all font-bold text-[11px]" 
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Show Status</label>
                         <select 
                            value={newMovie.showStatus}
                            onChange={(e) => setNewMovie({...newMovie, showStatus: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-pink/50 transition-all font-bold text-[11px] appearance-none cursor-pointer"
                         >
                             <option value="NOW_SHOWING" className="bg-black">NOW SHOWING</option>
                             <option value="UPCOMING" className="bg-black">UPCOMING</option>
                             <option value="RE-RELEASE" className="bg-black">RE-RELEASE</option>
                         </select>
                      </div>
                   </div>

                   <div className="col-span-2 mt-16 flex gap-6">
                      <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white/10 shadow-2xl">Cancel Injection</button>
                      <button type="submit" className="flex-[2] py-5 bg-accent-pink text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-accent-pink/40 hover:scale-[1.02] active:scale-[0.98] transition-all">Finalize Global Registration</button>
                   </div>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardPage>
  );
};
