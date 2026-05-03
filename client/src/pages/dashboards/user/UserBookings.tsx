import { useState, useEffect } from 'react';
import { Ticket, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { bookingsApi } from '../../../services/api/index.js';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/common/SEO.js';
import { DashboardPage } from '../../../components/dashboard/index.js';
import { groupBookings } from '../../../utils/groupBookings.js';
import { NotificationRequest } from '../../../components/notifications/NotificationRequest.js';

export const UserBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrSize, setQrSize] = useState(window.innerWidth < 768 ? 180 : 64);

  useEffect(() => {
    const handleResize = () => setQrSize(window.innerWidth < 768 ? 180 : 64);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    bookingsApi.getMyBookings()
      .then(res => {
        setBookings(groupBookings(res.bookings));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id: string, movieTitle: string) => {
    const element = document.getElementById(`booking-card-${id}`);
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#000000',
        style: {
          borderRadius: '0',
        },
      });
      const link = document.createElement('a');
      link.download = `Ticket-${movieTitle.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <DashboardPage
      title="My"
      accent="Experience"
      headerActions={
        <>
          <NotificationRequest variant="button" />
          <Link
            to="/"
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Book More
          </Link>
        </>
      }
    >
      <SEO title="My Tickets" description="View and download your active movie tickets and booking details." />
      <div className="grid grid-cols-1 gap-8">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="h-48 bg-white/5 rounded-[40px] animate-pulse" />
          ))
        ) : bookings.length > 0 ? (
          bookings.map(booking => (
            <div
              key={booking._id}
              id={`booking-card-${booking._id}`}
              className="relative bg-surface/30 border border-white/5 rounded-[40px] p-8 flex flex-col md:flex-row gap-8 items-center hover:bg-surface/50 transition-all"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-accent-blue rounded-l-[40px]" />
              <img
                src={booking.showtimeId.movieId.posterUrl}
                className="w-32 aspect-[2/3] rounded-2xl object-cover shadow-2xl"
              />
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-black">{booking.showtimeId.movieId.title}</h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                    {new Date(booking.showtimeId.startTime).toLocaleDateString([], {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    &bull;{' '}
                    {new Date(booking.showtimeId.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                     })}
                  </p>
                </div>
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seats</p>
                    <p className="text-sm font-black text-white">{booking.seats.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Theatre</p>
                    <p className="text-sm font-black text-white">{booking.showtimeId.theatreId.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Link 
                  to={`/ticket/${booking._id}?sig=${booking.signature}`}
                  className="w-full md:w-auto p-6 md:p-3 bg-white rounded-2xl opacity-90 hover:opacity-100 transition-opacity flex flex-col items-center gap-4 md:gap-2"
                >
                  <div className="p-2 md:p-1 bg-white rounded-lg">
                    <QRCodeCanvas 
                      value={`${window.location.origin}/ticket/${booking._id}?sig=${booking.signature}`}
                      size={qrSize}
                      level="L"
                      includeMargin={false}
                    />
                  </div>
                  <span className="text-xs md:text-[9px] text-black font-black uppercase tracking-[0.2em] md:tracking-tighter">View Ticket</span>
                </Link>
                <button
                  onClick={() => handleDownload(booking._id, booking.showtimeId.movieId.title)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10 text-center space-y-4">
            <Ticket size={60} className="mx-auto text-gray-700 opacity-30" />
            <p className="text-xl font-black italic opacity-40">No active bookings found</p>
          </div>
        )}
      </div>
    </DashboardPage>
  );
};
