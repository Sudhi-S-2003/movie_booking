import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ChevronDown, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useBookingStore } from '../../store/bookingStore.js';
import { useNavigate } from 'react-router-dom';
import { CitySelector } from './CitySelector.js';


export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { selectedCity, searchQuery, setSearchQuery } = useBookingStore();
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    // focus after animation starts
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-2xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4 sm:gap-10">
            <Link to="/" className="text-xl sm:text-2xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity whitespace-nowrap group">
              CINEMA<span className="text-accent-pink group-hover:text-accent-pink/80 transition-colors">CONNECT</span>
            </Link>

            {/* Desktop City Trigger */}
            <button
              onClick={() => setIsCityModalOpen(true)}
              className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-2.5 text-gray-300 hover:text-white hover:bg-white/10 transition-all group shadow-inner"
            >
              <div className="p-1 bg-accent-blue/20 rounded-lg group-hover:bg-accent-blue/30 transition-colors">
                <MapPin size={16} className="text-accent-blue" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none mb-1">Location Hub</p>
                <p className="text-sm font-bold leading-none">{selectedCity || 'Anywhere'}</p>
              </div>
              <ChevronDown size={14} className="ml-2 group-hover:translate-y-0.5 transition-transform text-gray-500" />
            </button>

            <AnimatePresence>
              {!isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="hidden lg:flex items-center gap-8 border-l border-white/10 pl-10"
                >
                  <Link to="/movies" className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-accent-pink transition-colors">Movies</Link>
                  <Link to="/cinemas" className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-accent-blue transition-colors">Cinemas</Link>
                  <Link to="/subscription" className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-accent-pink transition-colors">Pricing</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Auth/Search */}
          <div className="hidden md:flex items-center gap-3">
            {/* Collapsible search */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 240, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search movies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearch}
                      onBlur={() => { if (!searchQuery) setIsSearchOpen(false); }}
                      className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-4 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-full shadow-inner placeholder:text-gray-600"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={isSearchOpen ? () => { setSearchQuery(''); setIsSearchOpen(false); } : openSearch}
                className="ml-1 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                {isSearchOpen && searchQuery ? <X size={18} /> : <Search size={18} />}
              </button>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-white/5 pr-3 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-pink to-accent-purple flex items-center justify-center text-sm font-black text-white shadow-lg shadow-accent-pink/20">
                    {user?.name[0]}
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-xs font-black text-white leading-none mb-0.5">{user?.name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user?.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={user?.role === 'admin' ? '/admin' : user?.role === 'theatre_owner' ? '/owner' : '/user'}
                    className="text-[10px] font-black uppercase tracking-widest text-accent-blue hover:text-white transition-colors whitespace-nowrap"
                  >
                    Dashboard
                  </Link>
                  <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors whitespace-nowrap">Logout</button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-accent-pink hover:bg-accent-pink/80 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all active:scale-95 shadow-xl shadow-accent-pink/20 whitespace-nowrap"
              >
                Access Account
              </Link>
            )}
          </div>

          {/* Mobile Right Icons */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => setIsCityModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-accent-blue border border-white/10 active:scale-90 transition-transform"
            >
              <MapPin size={20} />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-8">
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

              <div className="flex flex-col gap-2">
                {[
                  { name: 'Movies', to: '/movies', color: 'bg-accent-pink' },
                  { name: 'Cinemas', to: '/cinemas', color: 'bg-accent-blue' },
                  { name: 'Pricing', to: '/subscription', color: 'bg-accent-pink' }
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

              <div className="pt-8 border-t border-white/5">
                {isAuthenticated ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-pink to-accent-purple flex items-center justify-center text-lg font-bold text-white">
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
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </nav>
      <CitySelector isOpen={isCityModalOpen} onClose={() => setIsCityModalOpen(false)} />
    </>
  );
};
