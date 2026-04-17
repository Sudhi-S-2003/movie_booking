import { memo } from 'react';
import { ChevronLeft, MapPin, Calendar, Timer, Monitor } from 'lucide-react';

interface BookingHeaderProps {
  movie: any;
  theatre: any;
  screen: any;
  showtime: any;
  onBack: () => void;
}

export const BookingHeader = memo(({ movie, theatre, screen, showtime, onBack }: BookingHeaderProps) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-6">
    <div className="flex items-start gap-5">
      <button onClick={onBack} className="mt-1 p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
        <ChevronLeft size={18} />
      </button>
      <div>
        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
          <h1 className="text-2xl font-black tracking-tight">{movie.title}</h1>
          <span className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] font-bold">{movie.certification}</span>
          <span className="px-2 py-0.5 bg-accent-pink/15 border border-accent-pink/30 text-accent-pink rounded text-[10px] font-bold uppercase">{showtime.format}</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><MapPin size={12} className="text-accent-pink" /> {theatre.name}, {theatre.city}</span>
          <span className="flex items-center gap-1.5"><Calendar size={12} className="text-accent-pink" /> {new Date(showtime.startTime).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="flex items-center gap-1.5"><Timer size={12} className="text-accent-pink" /> {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Screen</p>
        <h3 className="text-lg font-black text-white">{screen.name}</h3>
      </div>
      <div className="w-11 h-11 rounded-xl bg-accent-pink/15 flex items-center justify-center border border-accent-pink/30">
        <Monitor size={20} className="text-accent-pink" />
      </div>
    </div>
  </div>
));
BookingHeader.displayName = 'BookingHeader';
