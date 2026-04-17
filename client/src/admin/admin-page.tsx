import { useEffect, useState } from "react";
import { adminApi, moviesApi } from "../services/api/index.js";
import { ChevronDown, Save, Map, Trash2, Plus, Info, Clock, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


import {
  PRICE_GROUPS,
  PRICE_GROUP_BADGE_COLORS as COLOR_MAP,
} from "../constants/priceGroups.js";
import type { PriceGroup as PriceGroupType } from "../constants/priceGroups.js";
import { MAX_PAGE_SIZE } from "../constants/pagination.js";

type ViewMode = "LAYOUT" | "SHOWTIME";

type Column =
  | {
      type: "seat";
      name: string;
      priceGroup: PriceGroupType;
    }
  | { type: "space" };

type Row =
  | { type: "row"; name: string; columns: Column[] }
  | { type: "space" };


const getNextRow = (row: string): string => {
  const chars = row.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    const ch = chars[i];
    if (ch && ch !== "Z") {
      chars[i] = String.fromCharCode(ch.charCodeAt(0) + 1);
      return chars.join("");
    }
    chars[i] = "A";
    i--;
  }
  return "A" + chars.join("");
};


export const AdminPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("LAYOUT");
  const [theatres, setTheatres] = useState<any[]>([]);
  const [screens, setScreens] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [selectedTheatreId, setSelectedTheatreId] = useState("");
  const [selectedScreenId, setSelectedScreenId] = useState("");
  
  const [rows, setRows] = useState<Row[]>([]);
  
  const [showtimes, setShowtimes] = useState<any[]>([]);
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useEffect(() => {
    adminApi.listTheatres().then(res => setTheatres(res.theatres));
    moviesApi.list({ limit: MAX_PAGE_SIZE }).then(res => setMovies(res.movies));
  }, []);

  useEffect(() => {
    if (selectedTheatreId) {
      adminApi.listScreens(selectedTheatreId).then(res => setScreens(res.screens));
    } else {
      setScreens([]);
    }
    setSelectedScreenId("");
  }, [selectedTheatreId]);

  useEffect(() => {
    if (!selectedScreenId) {
      setRows([]);
      setShowtimes([]);
      return;
    }

    const screen = screens.find(s => s._id === selectedScreenId);
    if (screen?.layout) setRows(screen.layout);

    if (viewMode === "SHOWTIME") {
      adminApi.listShowtimesByScreen(selectedScreenId).then(res => setShowtimes(res.showtimes));
    }
  }, [selectedScreenId, screens, viewMode]);


  const handleUpdateShowtimeMovie = async (showtimeId: string, movieId: string) => {
    try {
      await adminApi.updateShowtime(showtimeId, { movieId });
      setShowtimes(prev => prev.map(st => st._id === showtimeId ? { ...st, movieId: movies.find(m => m._id === movieId) } : st));
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
       setSaveStatus("error");
    }
  };

  const handleDeleteShowtime = async (id: string) => {
    if(!confirm("Delete this showtime?")) return;
    try {
      await adminApi.deleteShowtime(id);
      setShowtimes(prev => prev.filter(st => st._id !== id));
    } catch (error) {
      alert("Failed to delete showtime");
    }
  };


  const addRow = (type: "row" | "space") => {
    setRows((prev) => {
      if (type === "space") return [...prev, { type: "space" }];
      const lastRowName = [...prev].reverse().find((r): r is Extract<Row, { type: "row" }> => r.type === "row")?.name ?? "";
      const next = lastRowName === "" ? "A" : getNextRow(lastRowName);
      return [...prev, { type: "row", name: next, columns: [] }];
    });
  };

  const addSeat = (rowIndex: number) => {
    setRows((prev) => prev.map((row, i) => {
      if (i !== rowIndex || row.type !== "row") return row;
      const seats = row.columns.filter((c) => c.type === "seat");
      const seatCount = seats.length;
      const defaultPriceGroup = seatCount > 0 ? (seats[seatCount - 1] as any).priceGroup : "STANDARD";
      return { ...row, columns: [...row.columns, { type: "seat", name: String(seatCount + 1), priceGroup: defaultPriceGroup }] };
    }));
  };

  const calculateCapacity = (layout: Row[]) => {
    return layout.reduce((total, row) => {
      if (row.type === 'row') {
        const seats = row.columns.filter(col => col.type === 'seat');
        return total + seats.length;
      }
      return total;
    }, 0);
  };

  const handleSaveLayout = async () => {
    if (!selectedScreenId) return;
    setSaveStatus("saving");
    try {
      await adminApi.updateScreenLayout(
        selectedScreenId,
        rows as unknown as import('../types/models.js').LayoutRow[],
        calculateCapacity(rows),
      );
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };


  const formatTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8 space-y-8 bg-[#0a0a0c] min-h-screen font-sans text-white">
      
      {}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 shadow-2xl">
        <div className="space-y-6 w-full lg:w-auto">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4">
                {viewMode === "LAYOUT" ? <Map className="text-accent-pink" /> : <Clock className="text-accent-blue" />}
                {viewMode === "LAYOUT" ? "Layout Master" : "Showtime Master"}
              </h1>
              <p className="text-[10px] text-gray-500 font-black mt-2 uppercase tracking-[0.3em]">Cinematic Orchestration Suite</p>
            </div>
            
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
              <button 
                onClick={() => setViewMode("LAYOUT")}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === "LAYOUT" ? 'bg-accent-pink text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Layout
              </button>
              <button 
                onClick={() => setViewMode("SHOWTIME")}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === "SHOWTIME" ? 'bg-accent-blue text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Schedules
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <select 
                value={selectedTheatreId}
                onChange={(e) => setSelectedTheatreId(e.target.value)}
                className="w-full sm:w-64 appearance-none bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 focus:border-accent-purple/50 outline-none transition-all font-black text-xs uppercase"
              >
                <option value="" className="bg-slate-900">Select Theatre</option>
                {theatres.map(t => <option key={t._id} value={t._id} className="bg-slate-900">{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
            </div>

            <div className="relative">
              <select 
                disabled={!selectedTheatreId}
                value={selectedScreenId}
                onChange={(e) => setSelectedScreenId(e.target.value)}
                className="w-full sm:w-64 appearance-none bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 focus:border-accent-purple/50 outline-none transition-all font-black text-xs uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-slate-900">Select Screen</option>
                {screens.map(s => <option key={s._id} value={s._id} className="bg-slate-900">{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
            </div>
          </div>
        </div>
        
        {viewMode === "LAYOUT" && (
          <div className="flex flex-col items-end gap-4">
            <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 gap-2">
              {PRICE_GROUPS.map(group => (
                <div key={group} className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${COLOR_MAP[group]}`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{group}</span>
                </div>
              ))}
            </div>

            <button
              disabled={!selectedScreenId || saveStatus === 'saving'}
              onClick={handleSaveLayout}
              className={`w-full lg:w-auto px-12 py-5 rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all ${
                saveStatus === 'success' ? 'bg-green-500 shadow-green-500/20' : 
                saveStatus === 'error' ? 'bg-red-500 shadow-red-500/20' : 
                'bg-accent-pink hover:scale-105 active:scale-95 shadow-2xl shadow-accent-pink/20 disabled:opacity-20'
              }`}
            >
              {saveStatus === 'saving' ? 'Architecting...' : saveStatus === 'success' ? 'Persisted' : saveStatus === 'error' ? 'Failed' : <><Save size={18} /> Deploy Layout</>}
            </button>
          </div>
        )}
      </div>

      {}
      <AnimatePresence mode="wait">
        {viewMode === "LAYOUT" ? (
          <motion.div 
            key="layout-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {}
            <div className="flex gap-4">
              <button onClick={() => addRow("row")} className="px-10 h-16 bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center gap-3"><Plus size={18} className="text-accent-pink" /> Add Seating Row</button>
              <button onClick={() => addRow("space")} className="px-10 h-16 bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center gap-3"><Plus size={18} /> Walkway Gap</button>
              <div className="ml-auto flex items-center gap-4 px-8 bg-accent-purple/10 border border-accent-purple/20 rounded-2xl"><Info size={20} className="text-accent-purple" /><span className="text-xs font-black uppercase text-accent-purple tracking-widest">Master capacity: {calculateCapacity(rows)} Seats</span></div>
            </div>

            {}
            <div className="bg-white/5 backdrop-blur-3xl p-16 rounded-[60px] border border-white/10 overflow-x-auto min-h-[700px] flex flex-col items-center">
              {!selectedScreenId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-6 mt-32">
                  <Map size={80} strokeWidth={1} />
                  <p className="font-black uppercase tracking-[0.5em] text-sm italic">Initialize a Screen to start construction</p>
                </div>
              ) : (
                <div className="space-y-6 min-w-max w-full flex flex-col items-center">
                  {[...rows].slice().reverse().map((row, reversedIndex) => {
                    const rowIndex = rows.length - 1 - reversedIndex;
                    if (row.type === "space") return (
                      <div key={`row-${rowIndex}`} className="group relative flex items-center justify-center w-full h-16 bg-white/[0.02] border border-dashed border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all">
                        <span className="text-[10px] font-black text-gray-700 tracking-[1em] uppercase">Walkway Corridor</span>
                        <button onClick={() => setRows(prev => prev.filter((_, i) => i !== rowIndex))} className="absolute right-10 p-3 text-red-500/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20} /></button>
                      </div>
                    );

                    return (
                      <div key={`row-${rowIndex}`} className="flex items-center gap-8 group/row p-3 rounded-2xl hover:bg-white/[0.03] transition-all">
                        <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl font-black text-gray-500 text-sm">{row.name}</div>
                        <div className="flex items-center gap-2.5 px-10 py-5 border-l border-r border-white/5 min-h-[70px]">
                          {row.columns.map((col, colIndex) => col.type === "space" ? <div key={`col-${colIndex}`} className="w-12 h-12" /> : (
                            <div key={`col-${colIndex}`} className="relative group/seat">
                              <div className={`w-11 h-14 border-2 ${COLOR_MAP[col.priceGroup]} flex items-center justify-center rounded-t-xl cursor-pointer shadow-xl font-black text-[10px]`}>{col.name}</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addSeat(rowIndex)} className="p-3 bg-green-500/10 text-green-500 rounded-xl"><Plus size={20} /></button>
                        <button onClick={() => setRows(prev => prev.filter((_, i) => i !== rowIndex))} className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={18} /></button>
                      </div>
                    );
                  })}
                  <div className="mt-32 w-full max-w-2xl opacity-20"><div className="w-full h-12 rounded-t-[100%] border-t-[10px] border-white/20 bg-gradient-to-t from-transparent to-white/10" /><p className="mt-8 text-center text-[10px] tracking-[2em] text-gray-700 font-black uppercase">Silver Screen</p></div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="showtime-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 backdrop-blur-3xl p-12 rounded-[50px] border border-white/10 min-h-[600px]"
          >
             {!selectedScreenId ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-gray-700 gap-8">
                  <Clock size={80} strokeWidth={1} />
                  <p className="font-black uppercase tracking-[0.5em] text-sm italic text-center">Select a screen to manage its timeline</p>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="flex items-center justify-between border-b border-white/5 pb-8">
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                      Screen Timeline <span className="text-xs bg-accent-blue/20 text-accent-blue px-3 py-1 rounded-lg uppercase">Real-time</span>
                    </h2>
                    <button className="px-8 py-3 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all outline-none">Add Time Slot</button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {showtimes.length > 0 ? showtimes.map((st) => (
                      <div key={st._id} className="group relative bg-black/40 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-black/60 transition-all border-l-4 border-l-accent-blue">
                        <div className="flex items-center gap-8">
                          <div className="text-center bg-white/5 px-6 py-4 rounded-2xl border border-white/10 min-w-[120px]">
                            <p className="text-2xl font-black text-white">{formatTime(st.startTime)}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mt-1">Start Time</p>
                          </div>
                          <div className="h-10 w-px bg-white/10" />
                          <div className="space-y-3">
                             <div className="flex items-center gap-3">
                               <Film size={16} className="text-accent-blue" />
                               <select 
                                 value={st.movieId?._id}
                                 onChange={(e) => handleUpdateShowtimeMovie(st._id, e.target.value)}
                                 className="bg-transparent text-lg font-black text-white focus:text-accent-blue outline-none cursor-pointer transition-colors max-w-md truncate"
                               >
                                 {movies.map(m => <option key={m._id} value={m._id} className="bg-slate-900">{m.title}</option>)}
                               </select>
                             </div>
                             <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                               <span className="text-accent-pink">●</span> {st.format} Format
                               <span className="text-gray-700 mx-1">|</span>
                               Ends at {formatTime(st.endTime)}
                             </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => handleDeleteShowtime(st._id)} className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl transition-all" title="Remove Slot">
                             <Trash2 size={20} />
                           </button>
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                        <p className="text-gray-500 font-black text-sm italic opacity-40 uppercase tracking-[0.3em]">No showtimes scheduled for this screen</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};