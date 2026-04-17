import React from 'react';
import { Navbar } from './Navbar.js';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-accent-pink/30 selection:text-white">
      <Navbar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        {children}
      </motion.main>
      
      {}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-accent-purple/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-pink/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
    </div>
  );
};
