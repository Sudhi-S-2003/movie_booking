import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ChevronDown, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useBookingStore } from '../../store/bookingStore.js';
import { useNavigate } from 'react-router-dom';

const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { selectedCity, setCity, searchQuery, setSearchQuery } = useBookingStore();
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          { }
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="text-xl sm:text-2xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity whitespace-nowrap">
              CINEMA<span className="text-accent-pink">CONNECT</span>
            </Link>

            {/* Desktop Navigation Links */}
            <button
              onClick={() => setIsCityModalOpen(true)}
              className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
            >
              <MapPin size={18} className="text-accent-blue" />
              <span className="text-sm font-medium">{selectedCity || 'Select City'}</span>
              <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-8 ml-2">
              <Link to="/movies" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-accent-pink transition-colors">Movies</Link>
              <Link to="/cinemas" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-accent-blue transition-colors">Cinemas</Link>
              <Link to="/subscription" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-accent-pink transition-colors">Pricing</Link>
            </div>
          </div>

          {/* Desktop Auth/Search */}
          <div className="hidden md:flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent-blue transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search movies, theatres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-64 transition-all"
              />
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-pink to-accent-purple flex items-center justify-center text-xs font-bold">
                    {user?.name[0]}
                  </div>
                  <span className="text-sm font-medium text-white">{user?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={user?.role === 'admin' ? '/admin' : user?.role === 'theatre_owner' ? '/owner' : '/user'}
                    className="text-xs text-accent-blue font-bold hover:underline"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-600">|</span>
                  <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">Logout</button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-accent-pink hover:bg-accent-pink/80 text-white text-sm font-bold px-6 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-accent-pink/20"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Right Icons */}
          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsCityModalOpen(true)} className="text-gray-300">
              <MapPin size={22} />
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-8">
              {/* Mobile Search */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    handleSearch(e);
                    if (e.key === 'Enter') setIsMenuOpen(false);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-accent-blue/50 outline-none"
                />
              </div>

              {/* Mobile Links */}
              <div className="flex flex-col gap-2">
                {[
                  { name: 'Movies', to: '/movies', color: 'bg-accent-pink' },
                  { name: 'Cinemas', to: '/cinemas', color: 'bg-accent-blue' },
                  { name: 'Pricing', to: '/subscription', color: 'bg-accent-pink' },
                  ...(isAuthenticated ? [
                    { name: 'API Docs', to: `/${user?.role === 'admin' ? 'admin' : user?.role === 'theatre_owner' ? 'owner' : 'user'}/api-docs`, color: 'bg-emerald-400' }
                  ] : [])
                ].map((item) => (
                  <Link
                    key={item.name}
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-bold text-gray-300 hover:text-white transition-all flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 active:scale-95"
                  >
                    {item.name}
                    <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                  </Link>
                ))}
              </div>

              {/* Mobile Auth Section */}
              <div className="pt-8 border-t border-white/5">
                {isAuthenticated ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-pink to-accent-purple flex items-center justify-center text-lg font-bold">
                        {user?.name[0]}
                      </div>
                      <div>
                        <p className="text-white font-bold">{user?.name}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">{user?.role}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        to={user?.role === 'admin' ? '/admin' : user?.role === 'theatre_owner' ? '/owner' : '/user'}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-center h-12 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-accent-blue transition-all"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center h-12 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-sm font-bold text-red-400 transition-all"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center h-14 bg-accent-pink hover:bg-accent-pink/90 text-white font-bold rounded-2xl shadow-lg shadow-accent-pink/20 transition-all"
                  >
                    Sign In to Account
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      { }
      <AnimatePresence>
        {isCityModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsCityModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 w-full max-w-2xl rounded-3xl p-8 overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Popular Cities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => {
                      setCity(city);
                      setIsCityModalOpen(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all text-sm font-semibold ${selectedCity === city
                        ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'
                      }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
