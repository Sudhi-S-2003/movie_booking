import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { bookingsApi } from '../services/api/bookings.api.js';
import { toPng } from 'html-to-image';
import { Ticket, Calendar, Clock, MapPin, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const PublicTicket = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const sig = searchParams.get('sig');
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await bookingsApi.getPublicTicket(id!, sig!);
        if (response && response.booking) {
          setBooking(response.booking);
        } else {
          setError('Invalid or expired ticket link.');
        }
      } catch (err) {
        setError('Failed to load ticket details.');
      } finally {
        setLoading(false);
      }
    };

    if (id && sig) {
      fetchTicket();
    } else {
      setError('Invalid ticket link.');
      setLoading(false);
    }
  }, [id, sig]);

  const handleDownload = async () => {
    if (ticketRef.current === null) return;
    
    try {
      const dataUrl = await toPng(ticketRef.current, { 
        cacheBust: true, 
        backgroundColor: '#0f172a',
        style: {
          borderRadius: '0' // Ensure edges look clean in download
        }
      });
      const link = document.createElement('a');
      link.download = `CinemaTicket-${booking.seatId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Verifying Ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 text-center">
        <div className="max-w-sm w-full bg-slate-900 border border-red-500/20 p-8 rounded-3xl shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
          <p className="text-slate-400 mb-6">{error || 'This ticket could not be verified.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-colors font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { showtimeId, seatId } = booking;
  const { movieId, theatreId, screenId, startTime } = showtimeId;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 flex flex-col items-center">
      <div className="max-w-md w-full">
        {/* Ticket Header */}
        <div className="flex justify-between items-end mb-8 px-2">
          <div>
            <p className="text-blue-500 font-bold tracking-tighter text-sm uppercase">Booking Confirmed</p>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              My Ticket
            </h1>
          </div>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl transition-all text-sm font-bold shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Download size={18} /> Save Image
          </button>
        </div>

        {/* Ticket Body */}
        <div 
          ref={ticketRef}
          className="relative bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800/50"
        >
          {/* Subtle Movie Poster Background */}
          <div className="absolute inset-0 opacity-[0.03] blur-2xl pointer-events-none">
            <img src={movieId.posterUrl} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="relative p-10">
            {/* Poster and Title Section */}
            <div className="flex gap-6 mb-8">
              <div className="relative shrink-0">
                <img 
                  src={movieId.posterUrl} 
                  alt={movieId.title} 
                  className="w-28 h-40 rounded-2xl object-cover shadow-2xl border border-slate-700"
                />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 p-1.5 rounded-lg shadow-lg">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-2xl font-black text-white mb-2 leading-tight">{movieId.title}</h2>
                <div className="flex flex-wrap gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span className="px-2 py-1 bg-slate-800 rounded-md border border-slate-700">{movieId.rating || 'PG-13'}</span>
                  <span className="px-2 py-1 bg-slate-800 rounded-md border border-slate-700">{movieId.duration} MIN</span>
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-md border border-blue-500/20">{showtimeId.format || '2D'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-700 my-8 relative">
                {/* Decorative cutouts inside the dashed line */}
                <div className="absolute -left-12 -top-4 w-8 h-8 bg-slate-950 rounded-full border-r border-slate-800/50"></div>
                <div className="absolute -right-12 -top-4 w-8 h-8 bg-slate-950 rounded-full border-l border-slate-800/50"></div>
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-2 gap-y-8 gap-x-4 mb-10">
              <div className="col-span-2 flex items-start gap-3">
                <MapPin className="text-blue-500 shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Venue</p>
                  <p className="text-white font-bold text-lg leading-tight">{theatreId.name}</p>
                  <p className="text-slate-400 text-sm">{screenId.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-blue-500 shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Date</p>
                  <p className="text-white font-bold text-base">{new Date(startTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-blue-500 shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Showtime</p>
                  <p className="text-white font-bold text-base">{new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Seat Badge */}
            <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-6 rounded-[2rem] flex justify-between items-center border border-blue-500/20 mb-10">
              <div>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Seat Number</p>
                <p className="text-4xl font-black text-white">{seatId}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Ticket Price</p>
                <p className="text-2xl font-bold text-white">₹{booking.price}</p>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl shadow-white/5 border-8 border-slate-800/20">
                <QRCodeCanvas 
                  value={`${window.location.origin}/ticket/${id}?sig=${sig}`} 
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="mt-6 flex flex-col items-center gap-1">
                <p className="text-slate-300 font-bold text-xs uppercase tracking-[0.3em]">SCAN TO VERIFY</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest italic">Digital Access Token</p>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="bg-slate-800/30 py-4 px-10 text-center border-t border-slate-700/50">
             <p className="text-slate-600 text-[10px] font-medium tracking-widest uppercase">
                Valid for single entry only • Non-transferable
             </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-slate-700 text-[10px] font-mono tracking-widest bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50">
              TX_ID: {id}
            </p>
            <p className="text-slate-600 text-xs italic">
                Thank you for choosing MovieVerse
            </p>
        </div>
      </div>
    </div>
  );
};

export default PublicTicket;
