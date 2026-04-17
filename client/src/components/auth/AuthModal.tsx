import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const mockUser = {
      id: 'mock-id',
      name: formData.name || 'User',
      email: formData.email,
      role: formData.role as 'user' | 'admin'
    };
    
    setAuth(mockUser, 'mock-token');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card relative w-full max-w-md overflow-hidden p-8"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-600" />
            
            <h2 className="text-glow mb-6 text-3xl font-bold">
              {isLogin ? 'Welcome Back' : 'Join CinemaConnect'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm text-gray-400">FullName</label>
                  <input 
                    type="text" 
                    className="glass-input w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required 
                  />
                </div>
              )}
              
              <div>
                <label className="mb-2 block text-sm text-gray-400">Email Address</label>
                <input 
                  type="email" 
                  className="glass-input w-full"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required 
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">Password</label>
                <input 
                  type="password" 
                  className="glass-input w-full"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required 
                />
              </div>

              {!isLogin && (
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role" 
                      checked={formData.role === 'user'} 
                      onChange={() => setFormData({...formData, role: 'user'})}
                    />
                    <span className="text-sm">Normal User</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role" 
                      checked={formData.role === 'admin'}
                      onChange={() => setFormData({...formData, role: 'admin'})}
                    />
                    <span className="text-sm">Theatre Owner</span>
                  </label>
                </div>
              )}

              <button type="submit" className="btn-primary w-full mt-4 py-3">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 font-bold text-purple-400 hover:text-purple-300 transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
