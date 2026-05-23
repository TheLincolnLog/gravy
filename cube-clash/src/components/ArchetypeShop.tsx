import React from 'react';
import { motion } from 'motion/react';
import { ARCHETYPES, Archetype } from '../constants/archetypes';
import { CubeSilhouette } from './CubeSilhouette';
import { ShoppingBag, Lock, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';

interface Props {
  totalWins: number;
  unlockedIds: string[];
  onPurchase: (id: string, price: number) => void;
  onClose: () => void;
}

export const ArchetypeShop: React.FC<Props> = ({ totalWins, unlockedIds, onPurchase, onClose }) => {
  return (
    <div className="flex flex-col items-center w-full max-w-7xl px-8 py-12 bg-black/40 backdrop-blur-md border-x border-white/5 max-h-screen overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center w-full mb-12 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <ShoppingBag className="text-amber-400" /> BATTLE READY UNITS
          </h2>
        </div>

        <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end mr-4">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Available Credits</span>
                <span className="text-2xl font-black text-amber-400 italic flex items-center gap-2 uppercase tracking-tighter">
                   <Trophy size={18} /> {totalWins} WINS
                </span>
            </div>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-white text-black font-black text-sm uppercase italic -skew-x-12 hover:bg-zinc-200 transition-all"
          >
            RETURN TO MENU
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full pb-20">
        {ARCHETYPES.map(arch => {
          const isUnlocked = unlockedIds.includes(arch.id);
          const price = arch.price || 0;
          const canAfford = totalWins >= price;

          return (
            <div 
              key={arch.id}
              className={`
                group relative flex flex-col bg-white/5 border-2 p-6 transition-all duration-300
                ${isUnlocked ? 'border-white/10 hover:border-white/40' : 'border-white/5 bg-black/20'}
              `}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight" style={{ color: arch.color }}>
                    {arch.name}
                  </h3>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                    {arch.passiveName}
                  </span>
                </div>
                {isUnlocked ? (
                  <CheckCircle2 size={24} className="text-emerald-500" />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-400 text-black text-[11px] font-black italic -skew-x-12">
                     <Trophy size={12} /> {price}
                  </div>
                )}
              </div>

              <div className="flex justify-center py-4 bg-black/40 border border-white/5 mb-6 relative overflow-hidden group-hover:border-white/20 transition-colors">
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-40" />
                 <CubeSilhouette 
                    color={arch.color} 
                    glow={isUnlocked} 
                    archetypeId={arch.id} 
                    className="scale-90"
                 />
              </div>

              <p className="text-[10px] text-white/50 font-medium mb-6 leading-relaxed flex-grow">
                {arch.description}
                <br />
                <span className="text-white/80 block mt-2 font-bold italic">
                  PASSIVE: {arch.passive}
                </span>
              </p>

              <div className="grid grid-cols-4 gap-2 mb-6">
                 {Object.entries(arch.stats).map(([key, val]) => (
                   <div key={key} className="flex flex-col items-center">
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-1">
                         <div 
                            className="h-full bg-white transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (val as number) / 1.5)}%`, backgroundColor: arch.color }} 
                         />
                      </div>
                      <span className="text-[7px] font-black uppercase opacity-40">{key}</span>
                   </div>
                 ))}
              </div>

              {!isUnlocked && (
                <button
                  disabled={!canAfford}
                  onClick={() => onPurchase(arch.id, price)}
                  className={`
                    w-full py-4 font-black italic uppercase -skew-x-12 transition-all flex items-center justify-center gap-2
                    ${canAfford ? 'bg-amber-400 text-black hover:scale-105' : 'bg-white/5 text-white/20 cursor-not-allowed'}
                  `}
                >
                   {canAfford ? 'ACQUIRE UNIT' : 'LACKING CREDITS'}
                   <ChevronRight size={16} />
                </button>
              )}
              {isUnlocked && (
                <div className="w-full py-4 bg-white/10 text-white/40 font-black italic uppercase -skew-x-12 text-center text-xs">
                   UNIT UNLOCKED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
