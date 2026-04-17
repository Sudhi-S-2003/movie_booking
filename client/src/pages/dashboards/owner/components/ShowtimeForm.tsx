import React, { useState } from "react";
import { motion } from "framer-motion";
import { SearchableSelect } from "../../../../components/ui/SearchableSelect.js";
import { ShowFormat } from "../../../../constants/enums.js";
import { useOwner } from "../context/OwnerContext.js";

interface ShowtimeFormProps {
  initialData?: {
    _id?: string;
    movieId: any;
    startTime: string;
    format: ShowFormat;
  };
  mode: "add" | "edit";
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const ShowtimeForm: React.FC<ShowtimeFormProps> = ({
  initialData,
  mode,
  onSubmit,
  onCancel
}) => {
  const { movies, searchMovies, isSearchingMovies } = useOwner();
  const [formData, setFormData] = useState({
    movieId: initialData?.movieId?._id || initialData?.movieId || "",
    startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : "",
    format: initialData?.format || ShowFormat.TWO_D
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.movieId || !formData.startTime) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-surface border border-white/10 w-full max-w-lg rounded-[40px] p-10 shadow-2xl overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-blue to-transparent opacity-50" />
      
      <h2 className="text-2xl font-black uppercase tracking-tight mb-8">
        {mode === "edit" ? "Modify Performance" : "Register Performance"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <SearchableSelect 
            label="Select Movie"
            placeholder="Choose a movie..."
            options={movies.map((m: any) => ({ id: m._id, name: m.title }))}
            value={formData.movieId}
            onChange={(id) => setFormData({...formData, movieId: id})}
            onSearch={searchMovies}
            isLoading={isSearchingMovies}
            accentColor="blue"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Start Time</label>
            <input 
              type="datetime-local" 
              value={formData.startTime}
              onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all"
              required
            />
          </div>
          <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Format</label>
              <select 
                value={formData.format}
                onChange={(e) => setFormData({...formData, format: e.target.value as ShowFormat})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all appearance-none cursor-pointer"
              >
                {Object.values(ShowFormat).map(f => <option key={f} value={f} className="bg-black text-white">{f}</option>)}
              </select>
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`flex-1 px-8 py-4 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center ${isSubmitting ? "opacity-50" : ""}`}
          >
            {isSubmitting ? "Processing..." : mode === "edit" ? "Save Changes" : "Confirm Slot"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};
