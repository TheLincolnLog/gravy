import React from 'react';
import { motion } from 'motion/react';

interface Props {
  color: string;
  glow?: boolean;
  className?: string;
  archetypeId?: string;
}

export const CubeSilhouette: React.FC<Props> = ({ color, glow = true, className = "", archetypeId }) => {
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
        {/* Main Cube Body */}
        <motion.rect 
            x="20" y="45" width="60" height="60" 
            rx="8"
            fill={color} 
            className="transition-colors duration-500" 
            animate={{ y: [45, 40, 45] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Eyes */}
        <motion.g animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <circle cx="40" cy="70" r="4" fill="white" />
            <circle cx="60" cy="70" r="4" fill="white" />
        </motion.g>

        {/* Archetype Specific Details */}
        {archetypeId === 'wraith' && (
             <motion.g animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                 <rect x="25" y="50" width="10" height="10" fill="white" rx="2" />
                 <rect x="65" y="80" width="8" height="8" fill="white" rx="2" />
                 <rect x="45" y="100" width="6" height="6" fill="white" rx="2" />
             </motion.g>
        )}
        
        {archetypeId === 'titan' && (
            <rect x="15" y="40" width="70" height="70" stroke={color} strokeWidth="4" fill="none" rx="10" strokeDasharray="10 5" />
        )}

        {archetypeId === 'acrobat' && (
            <motion.path 
                d="M 20 110 Q 50 130 80 110" 
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
