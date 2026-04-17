import { useState, useEffect } from 'react';
import { BarChart3, User } from 'lucide-react';
import { bookingsApi } from '../../../services/api/index.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { DashboardPage } from '../../../components/dashboard/index.js';

export const UserStats = () => {
  useDocumentTitle('Activity Stats — CinemaConnect');
  const [bookingCount, setBookingCount] = useState(0);

  useEffect(() => {
    bookingsApi.getMyBookings().then(res => {
      const grouped = res.bookings.reduce((acc: any, curr: any) => {
        const showtimeId = curr.showtimeId._id;
        const date = new Date(curr.createdAt).getTime();
        const exists = acc.find((g: any) =>
          g.showtimeId._id === showtimeId &&
          Math.abs(new Date(g.createdAt).getTime() - date) < 60000
        );
        if (!exists) acc.push(curr);
        return acc;
      }, []);
      setBookingCount(grouped.length);
    });
  }, []);

  return (
    <DashboardPage
      title="Activity"
      accent="Stats"
      accentColor="text-accent-pink"
      subtitle="Your cinema journey at a glance."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 p-10 rounded-[40px] space-y-6">
          <BarChart3 className="text-accent-pink" size={32} />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Movie Master</h3>
            <p className="text-sm text-gray-500 mt-2">
              You've watched <span className="text-white font-bold">{bookingCount}</span> movies this month! Keep it up!
            </p>
          </div>
          <div className="pt-6 border-t border-white/5 flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`h-12 flex-1 rounded-xl ${i <= Math.min(bookingCount, 5) ? 'bg-accent-pink' : 'bg-white/5'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-10 rounded-[40px] space-y-6">
          <User className="text-accent-blue" size={32} />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Loyalty Points</h3>
            <p className="text-4xl font-black text-white mt-4">
              {bookingCount * 120}{' '}
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Points</span>
            </p>
          </div>
          <button className="w-full py-4 bg-accent-blue/10 border border-accent-blue/20 rounded-2xl font-black text-[10px] uppercase tracking-widest text-accent-blue hover:bg-accent-blue/20 transition-colors">
            Redeem Rewards
          </button>
        </div>
      </div>
    </DashboardPage>
  );
};
