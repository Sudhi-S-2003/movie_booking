import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, QrCode, BarChart3, User, Settings, LogOut } from 'lucide-react';
import { bookingsApi, usersApi } from '../../services/api/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { Link } from 'react-router-dom';
import { IssueSuite } from '../../components/support/IssueSuite.js';
import { LifeBuoy } from 'lucide-react';
import { SEO } from '../../components/common/SEO.js';
import { SessionManager } from './components/SessionManager.js';

export const UserDashboard = () => {
  const { user, logout } = useAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'STATS' | 'SETTINGS' | 'SUPPORT'>('BOOKINGS');

  useEffect(() => {
    Promise.all([
      bookingsApi.getMyBookings(),
      usersApi.me()
    ]).then(([bookingsRes, profileRes]) => {
        const grouped = bookingsRes.bookings.reduce((acc: any, curr: any) => {
          const showtimeId = curr.showtimeId?._id;
          if (!showtimeId) return acc;
          const date = new Date(curr.createdAt).getTime();
          const group = acc.find((g: any) =>
            g.showtimeId._id === showtimeId &&
            Math.abs(new Date(g.createdAt).getTime() - date) < 60000
          );
          if (group) {
            group.seats.push(curr.seatId);
            group.totalPrice += curr.price;
          } else {
            acc.push({ ...curr, seats: [curr.seatId], totalPrice: curr.price });
          }
          return acc;
        }, []);
        setBookings(grouped);
        setProfile(profileRes.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const SidebarItem = ({ icon: Icon, label, id }: any) => (
    <button 
      onClick={() => setActiveTab(id as any)}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
        activeTab === id 
          ? `bg-white/10 text-white border border-white/20` 
          : 'text-gray-500 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} className={activeTab === id ? (id === 'BOOKINGS' ? 'text-accent-blue' : id === 'STATS' ? 'text-accent-pink' : 'text-accent-purple') : ''} />
      <span className="font-black text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex pt-20">
      <SEO title="User Dashboard" description="Manage your movie tickets, view watch history, and update your account settings." />
      
      {}
      <aside className="w-80 border-r border-white/5 p-8 flex flex-col gap-2">
        <div className="mb-10 px-6 flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent-pink to-accent-purple flex items-center justify-center font-black text-xl">
              {user?.name[0]}
           </div>
           <div>
              <h2 className="text-sm font-black tracking-tight">{user?.name}</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Premium Member</p>
           </div>
        </div>
        
        <SidebarItem icon={Ticket} label="My Tickets" id="BOOKINGS" color="accent-blue" />
        <SidebarItem icon={BarChart3} label="Stats" id="STATS" color="accent-pink" />
        <SidebarItem icon={LifeBuoy} label="Support" id="SUPPORT" color="accent-purple" />
        <SidebarItem icon={Settings} label="Account Settings" id="SETTINGS" color="accent-purple" />
        
        <button 
          onClick={logout}
          className="mt-auto w-full flex items-center gap-4 px-6 py-4 text-red-500/60 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-black text-[10px] uppercase tracking-widest">Sign Out</span>
        </button>
      </aside>

      {}
      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'BOOKINGS' && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-12"
            >
               <div className="flex items-center justify-between">
                  <h1 className="text-4xl font-black uppercase tracking-tighter">My <span className="text-accent-blue">Tickets</span></h1>
                  <Link to="/" className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Book More</Link>
               </div>

               <div className="grid grid-cols-1 gap-8">
                  {loading ? (
                    [1, 2].map(i => <div key={i} className="h-48 bg-white/5 rounded-[40px] animate-pulse" />)
                  ) : bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <div key={booking._id} className="relative bg-surface/30 border border-white/5 rounded-[40px] p-8 flex flex-col md:flex-row gap-8 items-center hover:bg-surface/50 transition-all">
                        <div className="absolute top-0 left-0 w-2 h-full bg-accent-blue" />
                        <img src={booking.showtimeId.movieId.posterUrl} className="w-32 aspect-[2/3] rounded-2xl object-cover shadow-2xl" />
                        <div className="flex-1 space-y-4">
                           <div>
                              <h3 className="text-2xl font-black">{booking.showtimeId.movieId.title}</h3>
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                                {new Date(booking.showtimeId.startTime).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })} • {new Date(booking.showtimeId.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        <div className="p-4 bg-white rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity self-center md:self-end">
                           <QrCode size={48} className="text-black" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10 text-center space-y-4">
                       <Ticket size={60} className="mx-auto text-gray-700 opacity-30" />
                       <p className="text-xl font-black italic opacity-40">No tickets found</p>
                    </div>
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'STATS' && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
               <div className="bg-white/5 border border-white/10 p-10 rounded-[50px] space-y-6">
                  <BarChart3 className="text-accent-pink" size={32} />
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">Activities</h3>
                     <p className="text-sm text-gray-500 mt-2">You've completed <span className="text-white font-bold">{profile?.stats?.bookings ?? 0}</span> bookings and written <span className="text-white font-bold">{profile?.stats?.reviews ?? 0}</span> reviews.</p>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex gap-2">
                     {[1,2,3,4,5].map(i => <div key={i} className={`h-12 flex-1 rounded-xl ${i < 4 ? 'bg-accent-pink' : 'bg-white/5'}`} />)}
                  </div>
               </div>
               
               <div className="bg-white/5 border border-white/10 p-10 rounded-[50px] space-y-6">
                  <User className="text-accent-blue" size={32} />
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">Loyalty Points</h3>
                     <p className="text-4xl font-black text-white mt-4">{(profile?.stats?.bookings ?? 0) * 120} <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Points</span></p>
                  </div>
                  <button className="w-full py-4 bg-accent-blue/10 border border-accent-blue/20 rounded-2xl font-black text-[10px] uppercase tracking-widest text-accent-blue">Redeem Rewards</button>
               </div>
            </motion.div>
          )}

          {activeTab === 'SETTINGS' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
            >
              <SessionManager />
            </motion.div>
          )}

          {activeTab === 'SUPPORT' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <IssueSuite />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
