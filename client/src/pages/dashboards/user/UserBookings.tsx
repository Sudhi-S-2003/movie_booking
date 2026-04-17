import { useState, useEffect } from 'react';
import { Ticket, QrCode } from 'lucide-react';
import { bookingsApi } from '../../../services/api/index.js';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { DashboardPage } from '../../../components/dashboard/index.js';
import { groupBookings } from '../../../utils/groupBookings.js';

export const UserBookings = () => {
  useDocumentTitle('My Tickets — CinemaConnect');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.getMyBookings()
      .then(res => {
        setBookings(groupBookings(res.bookings));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardPage
      title="My"
      accent="Experience"
      headerActions={
        <Link
          to="/"
          className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Book More
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-8">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="h-48 bg-white/5 rounded-[40px] animate-pulse" />
          ))
        ) : bookings.length > 0 ? (
          bookings.map(booking => (
            <div
              key={booking._id}
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
              <div className="p-4 bg-white rounded-2xl opacity-80 hover:opacity-100 transition-opacity self-center md:self-end">
                <QrCode size={48} className="text-black" />
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
