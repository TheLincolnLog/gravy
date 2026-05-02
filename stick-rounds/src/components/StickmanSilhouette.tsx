import React from 'react';
import { motion } from 'motion/react';

interface Props {
  color: string;
  glow?: boolean;
  className?: string;
  archetypeId?: string;
}

export const StickmanSilhouette: React.FC<Props> = ({ color, glow = true, className = "", archetypeId }) => {
  return (
    <div className={`relative w-48 h-64 flex items-center justify-center ${className}`}>
      {/* Background Glow */}
      {glow && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute w-32 h-32 blur-3xl rounded-full" 
          style={{ backgroundColor: color }} 
        />
      )}

      <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-2xl z-10" style={{ filter: glow ? `drop-shadow(0 0 10px ${color})` : '' }}>
        {/* Head */}
        <circle cx="50" cy="30" r="12" fill={color} className="transition-colors duration-500" />
        
        {/* Spine */}
        <line x1="50" y1="42" x2="50" y2="90" stroke={color} strokeWidth="6" strokeLinecap="round" />
        
        {/* Arms */}
        <motion.line 
          x1="50" y1="55" x2="20" y2="75" stroke={color} strokeWidth="6" strokeLinecap="round" 
          animate={{ x2: [20, 25, 20], y2: [75, 70, 75] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.line 
          x1="50" y1="55" x2="80" y2="75" stroke={color} strokeWidth="6" strokeLinecap="round" 
          animate={{ x2: [80, 75, 80], y2: [75, 70, 75] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        
        {/* Legs */}
        <motion.line 
          x1="50" y1="90" x2="30" y2="135" stroke={color} strokeWidth="6" strokeLinecap="round" 
          animate={{ x2: [30, 25, 30], y2: [135, 130, 135] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.line 
          x1="50" y1="90" x2="70" y2="135" stroke={color} strokeWidth="6" strokeLinecap="round" 
          animate={{ x2: [70, 75, 70], y2: [135, 130, 135] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.75 }}
        />

        {/* Archetype Specific Tints/Particles */}
        {archetypeId === 'wraith' && (
             <motion.g animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                 <circle cx="40" cy="60" r="2" fill="white" />
                 <circle cx="60" cy="80" r="2" fill="white" />
                 <circle cx="50" cy="110" r="2" fill="white" />
             </motion.g>
        )}
        
        {archetypeId === 'titan' && (
            <rect x="35" y="45" width="30" height="40" fill={color} fillOpacity="0.3" rx="4" />
        )}

        {archetypeId === 'acrobat' && (
            <motion.path 
                d="M 50 140 Q 50 150 70 150" 
                fill="none" 
                stroke="white" 
                strokeWidth="2" 
                animate={{ pathLength: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
        )}
      </svg>
    </div>
  );
};
