import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Level } from '../types/game';
import { Users, Palette, Map, Swords, Trash2 } from 'lucide-react';

interface SetupFlowProps {
  onComplete: (players: Player[], level: Level) => void;
}

export const SetupFlow: React.FC<SetupFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'count' | 'customization' | 'level'>('count');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [players, setPlayers] = useState<Partial<Player>[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level>('pyramid');

  const handleSelectCount = (count: number) => {
    setPlayerCount(count);
    const initialPlayers = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      color: i === 0 ? '#22d3ee' : i === 1 ? '#f43f5e' : i === 2 ? '#a855f7' : '#10b981',
      score: 0
    }));
    setPlayers(initialPlayers);
    setStep('customization');
  };

  const updatePlayer = (id: number, data: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const handleCompleteCustomization = () => {
    setStep('level');
  };

  const handleFinish = (level: Level) => {
    const finalPlayers = players.map(p => ({
      ...p,
      stats: {
          maxHealth: 100,
          health: 100,
          movementSpeed: 5,
          jumpForce: 10,
          attackSpeed: 1,
          projectileCount: 1,
          projectileSize: 1,
          damage: 20,
          bounceCount: 0,
          isBouncy: false,
          isExplosive: false,
          isHeatSeeking: false,
          reloadSpeed: 1,
          piercing: false,
          shieldDuration: 0,
          gravityScale: 1
      },
      score: 0
    })) as Player[];
    onComplete(finalPlayers, level);
  };

  const colors = [
    '#22d3ee', '#f43f5e', '#a855f7', '#10b981', 
    '#fbbf24', '#f97316', '#6366f1', '#ec4899', 
    '#ffffff', '#525252'
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-4xl z-20">
      <AnimatePresence mode="wait">
        {step === 'count' && (
          <motion.div 
            key="count"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-12">Select Player Count</h2>
            <div className="flex gap-8">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  onClick={() => handleSelectCount(count)}
                  className="group relative w-48 h-48 bg-white/5 border-4 border-white/10 hover:border-white transition-all flex flex-col items-center justify-center gap-4"
                >
                   <Users size={48} className="group-hover:scale-110 transition-transform" />
                   <span className="text-4xl font-black italic uppercase">{count}P</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'customization' && (
          <motion.div 
            key="customization"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-8 text-center">Customize Players</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {players.map((p, i) => (
                <div key={p.id} className="p-6 bg-white/5 border-2 border-white/10 rounded-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-2xl" style={{ backgroundColor: p.color }}>
                      {p.id}
                    </div>
                    <input 
                      type="text" 
                      value={p.name}
                      onChange={(e) => updatePlayer(p.id!, { name: e.target.value })}
                      className="bg-transparent border-b-2 border-white/20 focus:border-white outline-none px-2 py-1 flex-1 font-bold text-xl uppercase italic tracking-tighter"
                      placeholder="Enter Match Name"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button 
                        key={c}
                        onClick={() => updatePlayer(p.id!, { color: c })}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${p.color === c ? 'border-white scale-125 shadow-[0_0_10px_white]' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <button 
                onClick={handleCompleteCustomization}
                className="px-12 py-4 bg-white text-black font-black text-2xl uppercase italic tracking-tighter skew-x-[-12deg] hover:bg-zinc-200 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === 'level' && (
          <motion.div 
            key="level"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full"
          >
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-12">VOTE FOR THE ARENA</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <LevelCard 
                id="pyramid" 
                name="Pyramid / Desert" 
                desc="Hot sands and tiered platforms await."
                color="#d4a373"
                onSelect={handleFinish}
              />
              <LevelCard 
                id="moon" 
                name="Moon / Space" 
                desc="Low gravity. High stakes. Zero air."
                color="#333"
                onSelect={handleFinish}
              />
              <LevelCard 
                id="jungle" 
                name="The Jungle" 
                desc="Dense platforms and treacherous vines."
                color="#2d6a4f"
                onSelect={handleFinish}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LevelCard: React.FC<{ id: Level, name: string, desc: string, color: string, onSelect: (id: Level) => void }> = ({ id, name, desc, color, onSelect }) => (
  <button 
    onClick={() => onSelect(id)}
    className="group relative flex flex-col items-center bg-white/5 border-4 border-white/10 hover:border-white transition-all p-8 text-center"
  >
    <div className="w-full aspect-square mb-6 relative overflow-hidden bg-zinc-900 flex items-center justify-center">
        <Map size={80} className="text-white/20 group-hover:scale-125 group-hover:text-white transition-all duration-500" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundColor: color }} />
    </div>
    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{name}</h3>
    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{desc}</p>
  </button>
);
