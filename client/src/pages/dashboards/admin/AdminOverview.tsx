import React, { useEffect, useState } from "react";
import { statsApi, type AdminStats } from "../../../services/api/index.js";
import { usePlatformStats } from "../../../hooks/usePlatformStats.js";
import { Film, MapPin, Users, Ticket, BarChart3, TrendingUp, ChevronRight, Activity, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";
import { formatCountCompact } from "../../../utils/format.js";
import { NotificationRequest } from "../../../components/notifications/NotificationRequest.js";

interface StatCardProps {
  label:        string;
  value:        string;
  icon:         React.ComponentType<{ size?: number }>;
  colorClass:   string;
  shadowClass:  string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClass, shadowClass }) => (
  <div className="bg-white/5 border border-white/10 p-10 rounded-[48px] flex flex-col gap-6 group hover:bg-white/[0.08] transition-all relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-white/[0.05] transition-all" />
    <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform shadow-2xl ${shadowClass}`}>
      <Icon size={28} />
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">{label}</p>
      <div className="flex items-baseline gap-4 mt-1">
        <h3 className="text-5xl font-black text-white tracking-tighter">{value}</h3>
      </div>
    </div>
  </div>
);

export const AdminOverview = () => {
  useDocumentTitle("Admin Overview");

  const { stats: platform, loading: platformLoading } = usePlatformStats();
  const [admin, setAdmin] = useState<AdminStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    statsApi
      .admin()
      .then((res) => {
        if (!alive) return;
        setAdmin(res.stats);
      })
      .catch((e: unknown) => {
        console.error("[AdminOverview] admin stats failed", e);
      })
      .finally(() => {
        if (alive) setAdminLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loading = platformLoading || adminLoading;

  const fmt = (n: number | undefined) =>
    n === undefined ? "—" : formatCountCompact(n);

  return (
    <DashboardPage
      title="Stats"
      accent="Overview"
      subtitle="Track users, movies, and bookings."
      headerActions={
        <NotificationRequest variant="button" />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard
          label="Registered Users"
          value={fmt(platform?.users)}
          icon={Users}
          colorClass="text-accent-blue"
          shadowClass="shadow-accent-blue/20"
        />
        <StatCard
          label="Active Global Movies"
          value={fmt(platform?.movies)}
          icon={Film}
          colorClass="text-accent-pink"
          shadowClass="shadow-accent-pink/20"
        />
        <StatCard
          label="Verified Theatre Partners"
          value={fmt(platform?.theatres)}
          icon={MapPin}
          colorClass="text-accent-purple"
          shadowClass="shadow-accent-purple/20"
        />
        <StatCard
          label="Confirmed Bookings"
          value={fmt(platform?.bookings)}
          icon={Ticket}
          colorClass="text-accent-blue"
          shadowClass="shadow-accent-blue/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {}
        <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[48px] space-y-8 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-pink/10 rounded-2xl text-accent-pink">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Top Genres</h3>
            </div>
          </div>
          {adminLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : admin && admin.topGenres.length > 0 ? (
            <div className="space-y-3">
              {admin.topGenres.slice(0, 8).map((g) => {
                const max = admin.topGenres[0]?.count ?? 1;
                const pct = Math.max(6, Math.round((g.count / max) * 100));
                return (
                  <div key={g.genre} className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-black uppercase tracking-widest text-white">{g.genre}</span>
                      <span className="text-[10px] font-bold text-gray-500">{fmt(g.count)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-accent-pink/60 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 font-bold">No genre data yet.</p>
          )}
        </div>

        {}
        <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[48px] space-y-8 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-blue/10 rounded-2xl text-accent-blue">
                <Activity size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Recent Bookings</h3>
            </div>
            <TrendingUp size={14} className="text-green-500" />
          </div>
          {adminLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : admin && admin.recentBookings.length > 0 ? (
            <div className="space-y-2">
              {admin.recentBookings.slice(-7).map((b) => (
                <div key={b._id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{b._id}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white">{fmt(b.count)} bookings</span>
                    <span className="text-[10px] font-bold text-accent-blue">₹{fmt(b.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 font-bold">No recent bookings.</p>
          )}
        </div>

        {}
        <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[48px] space-y-8 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-purple/10 rounded-2xl text-accent-purple">
                <Shield size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Top Movies</h3>
            </div>
            <ChevronRight size={14} className="text-gray-500" />
          </div>
          {adminLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : admin && admin.topMovies.length > 0 ? (
            <div className="space-y-3">
              {admin.topMovies.slice(0, 6).map((m, i) => (
                <div key={m._id} className="flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all">
                  <span className="text-xl font-black text-gray-700 w-6 text-center">#{i + 1}</span>
                  {m.posterUrl ? (
                    <img src={m.posterUrl} className="w-10 h-14 rounded-lg object-cover shadow-xl" alt={m.title} />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{m.title}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{fmt(m.bookings)} bookings</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 font-bold">No movie data yet.</p>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-center text-[10px] font-black text-gray-700 uppercase tracking-[0.5em] pt-4">
          Loading...
        </p>
      )}
    </DashboardPage>
  );
};
