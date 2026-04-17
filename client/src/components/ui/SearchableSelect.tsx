import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "../../hooks/useDebounce.js";

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  accentColor?: "pink" | "blue" | "purple";
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = "Select Option",
  label,
  className = "",
  accentColor = "pink"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 600);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstOpen = useRef(true);

  const activeOption = options.find(o => o.id === value);
  const filteredOptions = onSearch 
    ? options 
    : options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  const colors = {
    pink: "focus:border-accent-pink group-hover:border-accent-pink/50",
    blue: "focus:border-accent-blue group-hover:border-accent-blue/50",
    purple: "focus:border-accent-purple group-hover:border-accent-purple/50"
  };

  const textColors = {
    pink: "text-accent-pink",
    blue: "text-accent-blue",
    purple: "text-accent-purple"
  };

  useEffect(() => {
    if (onSearch && isOpen) {
      if (debouncedSearch === "" && options.length > 0 && isFirstOpen.current) {
        isFirstOpen.current = false;
        return;
      }
      onSearch(debouncedSearch);
      isFirstOpen.current = false;
    }
  }, [debouncedSearch, onSearch, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative flex-1 group ${className}`}>
      {}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between outline-none transition-all group-hover:bg-white/[0.02] ${isOpen ? colors[accentColor] : "group-hover:border-white/20"}`}
      >
        <div className="flex flex-col items-start ">
           <span className={`font-black text-[10px] uppercase tracking-widest ${activeOption ? "text-white" : "text-gray-600"}`}>
            {activeOption ? activeOption.name : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""} ${activeOption ? "text-white" : "text-gray-500"}`} />
      </button>

      {}
      {label && (
        <label className="absolute -top-3 left-4 px-2 bg-[#080808] text-[8px] font-black text-gray-600 uppercase tracking-widest pointer-events-none">
          {label}
        </label>
      )}

      {}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute z-50 top-full left-0 right-0 mt-4 bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            {}
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
              {isLoading ? (
                <Loader2 size={18} className={`animate-spin ${textColors[accentColor]}`} />
              ) : (
                <Search size={18} className="text-gray-600" />
              )}
              <input 
                autoFocus
                type="text"
                placeholder={onSearch ? "Search records..." : "Filter list..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold placeholder:text-gray-700"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="p-1 hover:text-white text-gray-600 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>

            {}
            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
              {isLoading && filteredOptions.length === 0 ? (
                <div className="p-10 text-center animate-pulse">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Querying Cinematic Database...</p>
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((opt, index) => (
                  <button
                    type="button"
                    key={opt.id || `opt-${index}`}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-6 py-4 rounded-2xl flex items-center justify-between transition-all group/opt ${
                      value === opt.id ? "bg-white/10 text-white" : "hover:bg-white/5 text-gray-500 hover:text-white"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-widest">
                      {opt.name}
                    </span>
                    {value === opt.id && (
                      <motion.div layoutId="select-active" className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor] ${textColors[accentColor]} bg-current`} />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-10 text-center space-y-2">
                  <Search size={32} className="mx-auto text-gray-900" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-800">No matching records found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
