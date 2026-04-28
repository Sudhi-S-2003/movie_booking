import React, { useState } from "react";
import { adminApi } from "../../../services/api/index.js";
import { Plus, MapPin, Search, Building2, Users, ShieldCheck, ChevronRight, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";
import { Pagination } from "../../../components/common/Pagination.js";
import { PAGE_SIZE } from "../../../constants/pagination.js";

import { useQuery } from "@tanstack/react-query";

export const AdminTheatres = () => {
  useDocumentTitle("Theatres");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['admin', 'theatres', searchQuery, page],
    queryFn: () => adminApi.listTheatres({ 
      q: searchQuery,
      page,
      limit: PAGE_SIZE.THEATRES
    }),
  });

  const theatres = data?.theatres || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const [newTheatre, setNewTheatre] = useState({
    name: "",
    city: "",
    address: "",
    ownerId: ""
  });

  const handleAddTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createTheatre(newTheatre);
      setShowAddModal(false);
      refetch();
      setNewTheatre({ name: "", city: "", address: "", ownerId: "" });
    } catch (err) {
      alert("Failed to add theatre");
    }
  };

  return (
    <DashboardPage
      title="Theatres"
      accent="List"
      accentColor="text-accent-purple"
      subtitle="Manage theatres and owners."
      headerActions={
        <div className="flex flex-wrap gap-4">
          <div className="relative group max-w-xs w-full lg:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search theatres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 py-3 pl-14 pr-6 rounded-2xl outline-none focus:border-accent-purple/50 transition-all font-bold text-[10px] uppercase tracking-widest"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-8 py-3 bg-accent-purple text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-accent-purple/20 hover:scale-105 transition-all"
          >
            <Plus size={18} /> Add Theatre
          </button>
        </div>
      }
    >

      {}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
            <Building2 size={80} className="text-white/5 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[1em] text-gray-800">Loading...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
              {theatres.map((theatre) => (
                  <div key={theatre._id} className="group bg-white/5 border border-white/10 p-8 rounded-[40px] flex flex-col lg:flex-row items-stretch lg:items-center justify-between hover:bg-white/[0.08] transition-all gap-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent-purple/40 opacity-0 group-hover:opacity-100 transition-all" />
                      
                      <div className="flex items-center gap-8 flex-1">
                          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-accent-purple group-hover:scale-110 transition-transform shadow-3xl border border-white/5">
                              <Building2 size={36} />
                          </div>
                          <div className="space-y-1">
                              <h3 className="text-2xl font-black tracking-tight">{theatre.name}</h3>
                              <div className="flex flex-wrap items-center gap-4">
                                  <span className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                      <MapPin size={12} className="text-accent-purple" /> {theatre.city}
                                  </span>
                                  <div className="w-1 h-1 rounded-full bg-white/10" />
                                  <span className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                      <ShieldCheck size={12} className="text-green-500" /> Active
                                  </span>
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-12 lg:px-12 border-l border-white/5 lg:border-white/5 border-t lg:border-t-0 pt-8 lg:pt-0">
                          <div className="flex flex-col items-start gap-1">
                              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Owner</span>
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue"><Users size={12} /></div>
                                  <span className="text-[11px] font-black text-white">
                                    {theatre.ownerId && typeof theatre.ownerId === 'object' ? (theatre.ownerId as any).name : 'Verified Owner'}
                                  </span>
                              </div>
                          </div>
                          <div className="flex flex-col items-start gap-1">
                              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Screens</span>
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-accent-pink/10 flex items-center justify-center text-accent-pink"><Layout size={12} /></div>
                                  <span className="text-[11px] font-black text-white">{theatre.screenCount || 0} Screens</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all order-last lg:order-none">Manage</button>
                          <button className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all group-hover:bg-accent-purple group-hover:border-accent-purple group-hover:text-white">
                              <ChevronRight size={20} />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            isLoading={loading}
            accentColor="accent-purple"
          />
        </>
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
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-purple to-transparent opacity-50" />
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-4 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                
                <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Add New Theatre</h2>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-12">Add a new cinema location.</p>

                <form onSubmit={handleAddTheatre} className="grid grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Name</label>
                         <input 
                            required
                            placeholder="Theatre name..." 
                            value={newTheatre.name}
                            onChange={(e) => setNewTheatre({...newTheatre, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-purple/50 transition-all font-bold text-[11px]" 
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">City</label>
                         <input 
                            required
                            placeholder="New York" 
                            value={newTheatre.city}
                            onChange={(e) => setNewTheatre({...newTheatre, city: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-purple/50 transition-all font-bold text-[11px]" 
                         />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Address</label>
                         <input 
                            required
                            placeholder="Street, Plaza, Wing..." 
                            value={newTheatre.address}
                            onChange={(e) => setNewTheatre({...newTheatre, address: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-purple/50 transition-all font-bold text-[11px]" 
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Owner ID or Email</label>
                         <input 
                            required
                            placeholder="Owner ID..." 
                            value={newTheatre.ownerId}
                            onChange={(e) => setNewTheatre({...newTheatre, ownerId: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:border-accent-purple/50 transition-all font-bold text-[11px]" 
                         />
                      </div>
                   </div>

                   <div className="col-span-2 mt-16 flex gap-6">
                      <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white/10 shadow-2xl">Cancel</button>
                      <button type="submit" className="flex-[2] py-5 bg-accent-purple text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-accent-purple/40 hover:scale-[1.02] active:scale-[0.98] transition-all">Add Theatre</button>
                   </div>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardPage>
  );
};
