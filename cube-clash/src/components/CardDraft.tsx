import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Rarity } from '../types/game';
import { ALL_CARDS } from '../constants/cards';

interface CardDraftProps {
  onPick: (card: Card) => void;
  isOpen: boolean;
  loserName?: string;
  draftOptions: Card[];
}

export const CardDraft: React.FC<CardDraftProps> = ({ onPick, isOpen, loserName, draftOptions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center py-20 bg-[#0C0C0C]/90 backdrop-blur-xl overflow-y-auto custom-scrollbar">
      <div className="absolute inset-0 radial-grid opacity-10 pointer-events-none" />
      
      <div className="text-center mb-16 z-10">
        <motion.h2 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-7xl md:text-8xl font-black text-white uppercase tracking-tighter italic mb-4"
        >
          {loserName} PICK A CARD
        </motion.h2>
        <p className="text-white/40 text-sm tracking-[0.4em] font-bold uppercase">
          CHOOSE YOUR UPGRADE TO COUNTER THE DOMINANCE
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-6xl px-12 z-10">
        <AnimatePresence>
          {draftOptions.map((card, idx) => {
            const rarities: Record<Rarity, { main: string, inner: string, shadow: string }> = {
              common: { main: 'bg-zinc-400', inner: 'bg-zinc-900', shadow: 'rgba(156,163,175,0.3)' },
              uncommon: { main: 'bg-green-500', inner: 'bg-green-950', shadow: 'rgba(74,222,128,0.3)' },
              rare: { main: 'bg-blue-500', inner: 'bg-blue-950', shadow: 'rgba(56,189,248,0.3)' },
              epic: { main: 'bg-purple-600', inner: 'bg-purple-950', shadow: 'rgba(168,85,247,0.4)' },
              legendary: { main: 'bg-amber-500', inner: 'bg-amber-950', shadow: 'rgba(251,191,36,0.5)' },
              mythical: { main: 'bg-red-600', inner: 'bg-red-950', shadow: 'rgba(239,68,68,0.6)' }
            };
            
            const style = rarities[card.rarity] || rarities.common;

            return (
              <motion.div
                key={card.id + idx}
                initial={{ opacity: 0, y: 50, rotate: idx % 2 === 0 ? -2 : 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring' }}
                whileHover={{ y: -15, scale: 1.02 }}
                onClick={() => onPick(card)}
                className={`group relative p-1 border-4 h-[450px] cursor-pointer transition-all border-white ${style.main}`}
                style={{ boxShadow: `12px 12px 0px 0px ${style.shadow}` }}
              >
                <div className={`${style.inner} h-full w-full p-8 flex flex-col border-2 border-white/20 uppercase overflow-hidden relative`}>
                  {/* Shimmer Effect */}
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
                  />

                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80" style={{ color: style.main.replace('bg-', 'text-') }}>
                      {card.rarity}
                    </span>
                    <div className="w-4 h-4 border border-white/40 rotate-45" />
                  </div>

                  <div className="text-5xl font-black leading-[0.85] tracking-tighter italic mb-6 break-words">
                    {card.name}
                  </div>

                  <div className="flex-1 flex items-center justify-center border-y-2 border-white/10 my-4">
                     {/* Decorative icon based on name/type if possible or just generic */}
                     <div className="w-20 h-20 opacity-20 group-hover:opacity-100 transition-opacity">
                        {card.id.includes('bullet') || card.id.includes('shot') ? <div className="w-full h-4 bg-white -rotate-45" /> : 
                         card.id.includes('jump') || card.id.includes('speed') ? <div className="w-12 h-12 border-4 border-white rounded-full" /> : 
                         <div className="w-12 h-12 border-4 border-white" />}
                     </div>
                  </div>

                  <div className="mt-auto">
                    <div className="h-1 w-full bg-white/20 mb-6" />
                    <p className="text-sm font-bold leading-tight uppercase mb-2">
                      {card.description}
                    </p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">
                      BUFF SYSTEM v{idx}.01
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
