import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { SEO } from '../components/common/SEO.js';
import { PAGE_META } from '../constants/seo.constants.js';
import { UsernameSuggestions } from '../components/auth/UsernameSuggestions.js';
import { authApi } from '../services/api/auth.api.js';

export const Register = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[] | null>(null);


  const location = useLocation();
  const { setAuth } = useAuthStore();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, token } = await authApi.register(formData);
      setAuth(user, token);
      window.location.href = from;
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      const suggestions: string[] | undefined = err.fieldErrors?.username ? [err.fieldErrors.username] : undefined; 
      setError(message);
      if (suggestions !== undefined) setUsernameSuggestions(suggestions);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SEO 
        title={PAGE_META.AUTH.REGISTER.TITLE} 
        description={PAGE_META.AUTH.REGISTER.DESCRIPTION} 
      />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <User className="text-gray-600 group-focus-within:text-accent-pink transition-colors" size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Full Name" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full bg-[#1c1c21] border border-white/5 rounded-[20px] py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-accent-pink/30 transition-all font-bold shadow-inner text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <User className="text-gray-600 group-focus-within:text-accent-blue transition-colors" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Username (@username)" 
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, '') })}
              required
              className="w-full bg-[#1c1c21] border border-white/5 rounded-[20px] py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/30 transition-all font-bold shadow-inner text-sm"
            />
          </div>
          {usernameSuggestions && (
            <UsernameSuggestions 
              suggestions={usernameSuggestions} 
              onSelect={u => { setFormData(p => ({...p, username: u})); setUsernameSuggestions(null); }} 
            />
          )}
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Mail className="text-gray-600 group-focus-within:text-accent-blue transition-colors" size={18} />
          </div>
          <input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full bg-[#1c1c21] border border-white/5 rounded-[20px] py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/30 transition-all font-bold shadow-inner text-sm"
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Lock className="text-gray-600 group-focus-within:text-accent-purple transition-colors" size={18} />
          </div>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required
            className="w-full bg-[#1c1c21] border border-white/5 rounded-[20px] py-4 pl-14 pr-14 text-white placeholder:text-gray-700 focus:outline-none focus:border-accent-purple/30 transition-all font-bold shadow-inner text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"
          >
            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
              {error}
            </p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4.5 rounded-[20px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group/btn ${
            loading 
              ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-accent-pink via-accent-purple to-accent-blue text-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,45,85,0.3)] active:scale-[0.98]'
          }`}
        >
          <span className="relative z-10">{loading ? 'Creating Account...' : 'Create Account'}</span>
          {!loading && <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-2 transition-transform" />}
        </button>
      </form>

      {/* Footer */}
      <div className="space-y-6 pt-4">
        <div className="text-center pt-4">
          <Link 
            to="/login"
            className="group inline-flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              Already a member?
            </span>
            <span className="text-sm font-black text-white uppercase tracking-tighter group-hover:text-accent-pink transition-colors border-b-2 border-accent-blue/30 group-hover:border-accent-pink pb-1">
              Access Your Account
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
