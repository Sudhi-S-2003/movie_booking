import React from "react";
import { Save, Clock, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useOwner } from "../context/OwnerContext.js";
import { SearchableSelect } from "../../../../components/ui/SearchableSelect.js";

interface ContextBarProps {
  showScreenSelector?: boolean;
  onSaveLayout?: () => void;
  saveStatus?: "idle" | "saving" | "success" | "error";
}

export const ContextBar: React.FC<ContextBarProps> = ({ 
  showScreenSelector = true, 
  onSaveLayout, 
  saveStatus = "idle" 
}) => {
  const { theatres, screens, selectedTheatreId, selectedScreenId, setSelectedTheatreId, setSelectedScreenId, searchTheatres, isSearchingTheatres } = useOwner();

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 mb-12 bg-white/5 p-6 rounded-[32px] border border-white/10 backdrop-blur-xl">
      <div className="flex-1 flex flex-col md:flex-row gap-4">
        <SearchableSelect 
          label="Active Theatre"
          options={theatres.map(t => ({ id: t._id, name: t.name }))}
          value={selectedTheatreId}
          onChange={setSelectedTheatreId}
          onSearch={searchTheatres}
          isLoading={isSearchingTheatres}
          accentColor="pink"
        />

        {showScreenSelector && (
          <SearchableSelect 
            label="Active Screen"
            placeholder="No Screen Selected"
            options={screens.map(s => ({ id: s._id, name: s.name }))}
            value={selectedScreenId}
            onChange={setSelectedScreenId}
            accentColor="blue"
          />
        )}
      </div>

      {onSaveLayout && (
        <motion.button 
          layout
          onClick={onSaveLayout}
          disabled={!selectedScreenId || saveStatus === 'saving'}
          className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-3 ${
            saveStatus === 'success' ? 'bg-green-500 text-white' : 
            saveStatus === 'error' ? 'bg-red-500 text-white' : 
            'bg-accent-pink text-white shadow-accent-pink/20 hover:scale-105 active:scale-95 disabled:opacity-30'
          }`}
        >
          {saveStatus === 'saving' ? <><Clock size={16} className="animate-spin" /> Saving...</> : 
          saveStatus === 'success' ? <><CheckCircle2 size={16} /> Layout Saved</> :
          saveStatus === 'error' ? <><XCircle size={16} /> Error Saving</> :
          <><Save size={16} /> Persist Changes</>}
        </motion.button>
      )}
    </div>
  );
};
