import { motion, AnimatePresence } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';

export const AuthLayout = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const title = isLogin ? 'Welcome' : 'Join';
  const highlightText = isLogin ? 'Back' : 'Us Now';
  const subtitle = isLogin ? 'Enter your details to access your account' : 'Start your cinematic journey with us';

  return (
    <div className="min-h-screen bg-[#020617] flex overflow-hidden selection:bg-accent-blue/30 selection:text-white">
      {/* Left: Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black overflow-hidden group">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 z-0 group-hover:scale-105 transition-transform duration-[20s] ease-out"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-black/40 to-transparent z-10" />
        
        {/* Decorative Light Beams */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-15 pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[120%] bg-accent-blue/5 blur-[100px] rotate-12" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[120%] bg-accent-pink/5 blur-[100px] -rotate-12" />
        </div>

        <div className="relative z-20 w-full p-20 flex flex-col justify-between">
          <Link to="/" className="text-3xl font-black tracking-tighter text-white group/logo flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-accent-pink to-accent-purple rounded-lg flex items-center justify-center text-sm">CC</span>
            <span>CINEMA<span className="text-accent-pink group-hover/logo:text-accent-blue transition-colors duration-500">CONNECT</span></span>
          </Link>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="space-y-6"
            >
              <div className="w-20 h-1.5 bg-gradient-to-r from-accent-pink to-accent-purple rounded-full" />
              <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter">
                The Future of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink animate-gradient-x">Cinema Browsing</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-md font-medium leading-relaxed">
                Join our premium community and experience movies like never before. Seamless booking, real-time updates, and exclusive access.
              </p>
            </motion.div>

            <div className="flex gap-16 text-white/40">
              <div className="space-y-2">
                <p className="text-4xl font-black text-white tracking-tighter">50k+</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-blue">Active Users</p>
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div className="space-y-2">
                <p className="text-4xl font-black text-white tracking-tighter">2.5k+</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-pink">Cinema Partners</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">© 2026 CinemaConnect Global</p>
            <div className="h-px flex-1 bg-white/5" />
          </div>
        </div>
      </div>

      {/* Right: Auth Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Animated Background Blobs */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-accent-blue/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-accent-pink/10 rounded-full blur-[150px] animate-pulse delay-1000 pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10 py-12"
        >
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-6">
              <div className="lg:hidden mb-12">
                 <Link to="/" className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-accent-pink to-accent-purple rounded flex items-center justify-center text-[10px]">CC</div>
                  <span>CINEMA<span className="text-accent-pink">CONNECT</span></span>
                </Link>
              </div>
              
              <div className="space-y-2">
                <motion.div 
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                    {title} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple">{highlightText}</span>
                  </h1>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.4em] leading-relaxed max-w-[280px]">
                    {subtitle}
                  </p>
                </motion.div>
              </div>
            </div>

            <div className="relative min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
