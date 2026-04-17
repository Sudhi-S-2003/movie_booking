import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Globe, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const Auth = () => {
  useDocumentTitle("Login");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password } 
        : formData;
        
      const { data } = await axios.post(`${API_URL}${endpoint}`, payload);
      
      setAuth(data.user, data.token);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-surface/30 backdrop-blur-3xl border border-white/10 rounded-[48px] overflow-hidden shadow-2xl"
      >
        <div className="p-12 space-y-10">
          
          {}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              {isLogin ? 'Enter the cinematic multiverse' : 'Join the ultimate movie community'}
            </p>
          </div>

          {}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative group"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent-pink transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-pink/50 transition-all font-bold"
                  />
                </motion.div>
              )}

              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative group mt-5"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent-blue transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Username (@ammu)" 
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, '') })}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all font-bold"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent-blue transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all font-bold"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent-purple transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-purple/50 transition-all font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-xs font-black uppercase text-center">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-2xl ${
                loading ? 'bg-gray-800 text-gray-500 scale-95' : 'bg-accent-pink text-white hover:scale-105 active:scale-95 shadow-accent-pink/40'
              }`}
            >
              {loading ? 'Authenticating...' : <>{isLogin ? 'Sign In' : 'Register Now'} <ArrowRight size={18} /></>}
            </button>
          </form>

          {}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Or Continue With</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>
            
            <div className="flex gap-4">
              <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-bold text-xs">
                <Globe size={18} /> Github
              </button>
              <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-bold text-xs">
                <Globe size={18} /> Google
              </button>
            </div>
          </div>

          {}
          <div className="text-center pt-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors underline underline-offset-8"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
