import React, { useEffect, useState } from "react";
import { usersApi } from "../../../services/api/index.js";
import { Users, Search, Mail, Shield, Calendar, UserCheck, UserPlus, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";

export const AdminUsers = () => {
  useDocumentTitle("Users — OpsCenter");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.listAll();
      setUsers(res.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardPage
      title="User"
      accent="Directory"
      subtitle="Identity & Role Orchestration"
      headerActions={
        <div className="flex flex-wrap gap-4">
          <div className="relative group max-w-xs w-full lg:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by name/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 py-3 pl-14 pr-6 rounded-2xl outline-none focus:border-accent-blue/50 transition-all font-bold text-[10px] uppercase tracking-widest"
            />
          </div>
          <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all">
            <Filter size={16} /> Advanced Filters
          </button>
        </div>
      }
    >

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
            <Users size={80} className="text-white/5 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[1em] text-gray-800">Compiling Registry...</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/5 rounded-[60px] overflow-hidden shadow-2xl backdrop-blur-3xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">Identification</th>
                            <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Role</th>
                            <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">Node Registry Date</th>
                            <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">Connectivity</th>
                            <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {filteredUsers.map((user) => (
                            <tr key={user._id} className="group hover:bg-white/[0.01] transition-all">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center text-white font-black text-lg shadow-2xl border border-white/5 group-hover:scale-110 transition-transform">
                                            {user.name[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-black tracking-tight">{user.name}</span>
                                            <span className="text-[10px] font-bold text-gray-600 flex items-center gap-1.5"><Mail size={10} /> {user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                        user.role === 'ADMIN' ? 'bg-accent-pink/10 border-accent-pink/20 text-accent-pink' :
                                        user.role === 'THEATRE_OWNER' ? 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple' :
                                        'bg-accent-blue/10 border-accent-blue/20 text-accent-blue'
                                    }`}>
                                        <Shield size={10} /> {user.role.replace('_', ' ')}
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={14} className="text-gray-700" />
                                        <span className="text-[11px] font-black text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3 text-green-500 bg-green-500/5 px-4 py-2 rounded-full border border-green-500/10 w-fit">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Stable</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3">
                                        <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                                            <Shield size={16} />
                                        </button>
                                        <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                                            <Mail size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredUsers.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <Users size={48} className="mx-auto text-gray-800" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">No nodes found matching search parameters</p>
                </div>
            )}
        </div>
      )}
    </DashboardPage>
  );
};
