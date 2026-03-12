import { motion } from 'motion/react';
import { Coins } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-red-600 flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="relative">
          {/* Use the app icon for consistency */}
          <div className="w-40 h-40 bg-white rounded-[40px] flex items-center justify-center shadow-[0_0_50px_rgba(255,215,0,0.5)] overflow-hidden border-8 border-yellow-400">
            <img src="/favicon.svg" alt="e-Money" className="w-full h-full object-contain p-4" />
          </div>
          <motion.div 
            animate={{ y: [0, -12, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-6 -right-6"
          >
            <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center shadow-xl border-2 border-yellow-100">
              <span className="text-2xl font-bold text-red-600">財</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
