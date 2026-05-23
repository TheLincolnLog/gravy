import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ARCHETYPES } from '../constants/archetypes';
import { CubeSilhouette } from './CubeSilhouette';
import { ArchetypeStats } from './ArchetypeStats';
import { Shield, Lock, ChevronRight, User } from 'lucide-react';
import { Player } from '../types/game';

interface Props {
  players: Player[];
  unlockedIds?: string[];
  onComplete: (updatedPlayers: Player[]) => void;
  onBack: () => void;
}

export const LocalArchetypeSelect: React.FC<Props> = ({ players, unlockedIds = [], onComplete, onBack }) => {
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [hoveredIdx, setHoveredIdx] = useState<string | null>(null);

  const currentPlayer = players[currentPlayerIdx];

  // Only show archetypes that are unlocked
  const availableArchetypes = ARCHETYPES.filter(a => unlockedIds.length === 0 || unlockedIds.includes(a.id));

  const handleSelect = (archetypeId: string) => {
    // Check if already taken by another player
    const isTaken = Object.entries(selections).some(([idx, id]) => id === archetypeId && parseInt(idx) !== currentPlayerIdx);
    if (isTaken) return;

    const newSelections = { ...selections, [currentPlayerIdx]: archetypeId };
    setSelections(newSelections);

    if (currentPlayerIdx < players.length - 1) {
      setCurrentPlayerIdx(prev => prev + 1);
    }
  };

  const finalize = () => {
    const updatedPlayers = players.map((p, idx) => {
      const archId = selections[idx] || 'gunner';
      const arch = ARCHETYPES.find(a => a.id === archId)!;
      
      return {
        ...p,
        color: arch.color,
        archetypeId: arch.id,
        stats: {
          ...p.stats,
          movementSpeed: p.stats.movementSpeed * (arch.stats.speed / 100),
          damage: p.stats.damage * (arch.stats.power / 100),
          stability: arch.stats.stability,
          gravityScale: arch.id === 'acrobat' ? 0.8 : 1,
          extraJumps: arch.id === 'acrobat' ? 1 : 0,
        }
      };
    });
    onComplete(updatedPlayers);
  };

  const isCurrentSelectionValid = selections[currentPlayerIdx] !== undefined;
  const allSelected = players.every((_, idx) => selections[idx] !== undefined);

  return (
    <div className="flex flex-col items-center w-full max-w-7xl px-4 sm:px-8 py-8 sm:py-12 bg-black/40 backdrop-blur-md border-x border-white/5 max-h-screen overflow-y-auto custom-scrollbar">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 w-full mb-12 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3 sm:gap-4">
            <Shield className="text-cyan-400" /> CUBE {currentPlayerIdx + 1} SELECTING
          </h2>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-center">
          <button 
            onClick={onBack}
            className="px-4 sm:px-6 py-2 bg-white/5 border border-white/20 text-white/40 hover:text-white hover:border-white font-black text-xs uppercase italic -skew-x-12 transition-all mr-2 lg:mr-4"
          >
            ← GO BACK
          </button>
          {players.map((p, idx) => (
            <div key={p.id} className={`flex flex-col items-center lg:items-end transition-all ${idx === currentPlayerIdx ? 'opacity-100 scale-105' : 'opacity-40'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">{p.name || `P${idx+1}`}</span>
                    <div className="w-2 h-2 rotate-45" style={{ backgroundColor: selections[idx] ? ARCHETYPES.find(a => a.id === selections[idx])?.color : '#fff' }} />
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase">
                    {selections[idx] ? 'LOCKED' : idx === currentPlayerIdx ? 'ACTIVE' : 'WAITING'}
                </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {availableArchetypes.map(arch => {
          const isSelectedByCurrent = selections[currentPlayerIdx] === arch.id;
          const isSelectedByOther = Object.entries(selections).some(([idx, id]) => id === arch.id && parseInt(idx) !== currentPlayerIdx);
          
          return (
            <motion.div 
              key={arch.id}
              onMouseEnter={() => {
                  setHoveredIdx(arch.id);
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => {
                  if (isSelectedByOther) return;
                  handleSelect(arch.id);
              }}
              className={`relative group bg-[#111] border-2 transition-all p-6 overflow-hidden cursor-pointer
                ${isSelectedByCurrent ? 'border-white ring-4 ring-white/10 scale-105 z-10' : 'border-white/5 hover:border-white/40'}
                ${isSelectedByOther ? 'opacity-20 cursor-not-allowed grayscale' : ''}
              `}
            >
              <div className="relative z-10 flex flex-col items-center">
                 <CubeSilhouette 
                    color={arch.color} 
                    glow={!isSelectedByOther} 
                    archetypeId={arch.id} 
                    className="mb-8"
                 />
                 
                 <div className="flex flex-col items-center text-center">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-1">{arch.name}</h3>
                    <div className="flex items-center gap-2 mb-4 bg-white/5 px-3 py-1 rounded-full">
                        <User size={10} className="opacity-40" />
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{arch.passiveName}</span>
                    </div>
                    <p className="text-[10px] font-bold opacity-30 uppercase leading-relaxed max-w-[200px] h-12">
                        {arch.description}
                    </p>
                 </div>

                 <div className="mt-6 border-t border-white/5 pt-6 w-full flex flex-col items-center">
                    <ArchetypeStats stats={arch.stats} color={arch.color} />
                    <div className="mt-4 text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
                        {arch.passive}
                    </div>
                 </div>
              </div>

              {isSelectedByCurrent && (
                  <div className="absolute top-4 right-4 text-white">
                      <Lock size={20} />
                  </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 w-full">
        {allSelected ? (
          <button 
            onClick={finalize}
            className="px-8 sm:px-24 py-4 sm:py-8 bg-white text-black -skew-x-12 font-black text-xl sm:text-4xl italic uppercase transition-all hover:scale-105 shadow-2xl flex items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto"
          >
            CONFIRM SELECTION <ChevronRight size={32} />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase opacity-40 tracking-[0.5em] animate-pulse">Awaiting Selection</span>
            {currentPlayerIdx > 0 && (
                <button 
                    onClick={() => setCurrentPlayerIdx(prev => prev - 1)}
                    className="text-[10px] font-bold text-white/40 hover:text-white uppercase mt-4"
                >
                    ← Back to Previous Player
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
