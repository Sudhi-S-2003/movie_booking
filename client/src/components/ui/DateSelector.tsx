import React from 'react';
import { Calendar } from 'lucide-react';

interface DateOption {
  iso: string;
  day: string;
  date: string;
}

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (iso: string) => void;
  daysCount?: number;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ 
  selectedDate, 
  onDateChange, 
  daysCount = 7 
}) => {
  const dates: DateOption[] = Array.from({ length: daysCount }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0] || '',
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()
    };
  });

  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-3xl p-2 border border-white/10 overflow-x-auto no-scrollbar max-w-full">
      {dates.map((d) => (
        <button
          key={d.iso}
          onClick={() => onDateChange(d.iso)}
          className={`px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all ${
            selectedDate === d.iso 
              ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20 scale-105' 
              : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Calendar size={14} /> {selectedDate === d.iso ? 'SELECTED' : d.day}, {d.date}
        </button>
      ))}
    </div>
  );
};
