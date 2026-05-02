import React, { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { CardDraft } from './components/CardDraft';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { ARCHETYPES } from './constants/archetypes';
import { LocalArchetypeSelect } from './components/LocalArchetypeSelect';
import { Player, PlayerStats, GamePhase, Card, Level, Rarity } from './types/game';
import { RefreshCw, Play, Users, Map as MapIcon, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ALL_CARDS } from './constants/cards';

const DEFAULT_STATS: PlayerStats = {
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
  gravityScale: 1,
  jumpCooldown: 600,
  fireRate: 400,
  projectileSpeed: 1,
  lifesteal: 0,
  poisonChance: 0,
  burnChance: 0,
  thorns: 0,
  dodgeChance: 0,
  necroChance: 0,
  extraJumps: 0,
  armor: 0,
  projectileGravity: 0,
  recoilPropulsion: 0,
  noAirContactDamage: false,
  wallWalk: false,
  echoStrikes: false,
  kineticBattery: false,
  storedKineticEnergy: 0,
  neonGlow: false,
  trailEffect: false,
  entropyMode: false,
  bulletTimeParry: false,
  quantumSwap: false,
  finalStandVisuals: false,
  extraDebris: false,
  stability: 100
};

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [matchName, setMatchName] = useState('UNSTOPPABLE DUEL');
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftQueue, setDraftQueue] = useState<number[]>([]);
  const [draftPool, setDraftPool] = useState<Card[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [socket, setSocket] = useState<any>(null);

  const getDraftPool = () => {
    const getWeight = (r: Rarity) => {
      switch(r) {
        case 'mythical': return 1;
        case 'legendary': return 3;
        case 'epic': return 10;
        case 'rare': return 25;
        case 'uncommon': return 50;
        default: return 100;
      }
    };

    const options: Card[] = [];
    const pool = [...ALL_CARDS];
    
    for (let i = 0; i < 3; i++) {
        const totalWeight = pool.reduce((acc, c) => acc + getWeight(c.rarity), 0);
        let roll = Math.random() * totalWeight;
        let selectedIdx = 0;
        for (let j = 0; j < pool.length; j++) {
            roll -= getWeight(pool[j].rarity);
            if (roll <= 0) {
                selectedIdx = j;
                break;
            }
        }
        options.push(pool[selectedIdx]);
        pool.splice(selectedIdx, 1);
    }
    return options;
  };

  const setupMatch = (count: number) => {
    setPlayerCount(count);
    const colors = ['#22d3ee', '#f43f5e', '#a855f7', '#10b981'];
    const initialPlayers: Player[] = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `STICK ${i + 1}`,
      score: 0,
      color: colors[i],
      stats: { ...DEFAULT_STATS },
      isDead: false,
      isGhost: false,
      ghostCharge: 0,
      godPellets: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, pink: 0 },
      controllerId: 'local'
    }));
    setPlayers(initialPlayers);
    setPhase('archetypeSelect');
  };

  const handleArchetypeComplete = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    setPhase('customization');
  };

  const handleLevelVote = (level: Level) => {
    setSelectedLevel(level);
    setPhase('playing');
  };

  const handleWin = useCallback((winnerId: number, deathOrder: number[]) => {
    setPlayers(prev => {
      return prev.map(p => {
        const isWinner = p.id === winnerId;
        return {
          ...p,
          score: isWinner ? p.score + 1 : p.score,
          stats: { ...p.stats, health: p.stats.maxHealth }
        };
      });
    });

    if (deathOrder.length > 0) {
        setDraftQueue([...deathOrder]);
        setDraftPool(getDraftPool());
        setPhase('drafting');
    } else {
        setPhase('playing');
    }
  }, []);

  const handlePickCard = (card: Card) => {
    const currentPickerId = draftQueue[0];
    if (currentPickerId === undefined) return;

    setPlayers(prev => prev.map(p => {
      if (p.id === currentPickerId) return { ...p, stats: card.apply(p.stats) };
      return p;
    }));

    setDraftPool(prev => prev.filter(c => c.id !== card.id));
    
    const nextQueue = draftQueue.slice(1);
    if (nextQueue.length > 0) {
       setDraftQueue(nextQueue);
    } else {
       setDraftQueue([]);
       setPhase('playing');
    }
  };

  const handleDamage = useCallback((playerId: number, health: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) return { ...p, stats: { ...p.stats, health: Math.max(0, health) } };
      return p;
    }));
  }, []);

  const handleUpdatePlayer = useCallback((playerId: number, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) return { ...p, ...updates };
      return p;
    }));
  }, []);

  const handleMultiplayerStart = (lobbyData: any, gameSocket: any) => {
    setSocket(gameSocket);
    const initialPlayers: Player[] = Object.values(lobbyData.players).map((p: any, i: number) => {
      const arch = ARCHETYPES.find(a => a.id === p.lockedArchetype) || ARCHETYPES[0];
      
      // Apply archetype stats to base DEFAULT_STATS
      const archetypeStats = {
        ...DEFAULT_STATS,
        movementSpeed: DEFAULT_STATS.movementSpeed * (arch.stats.speed / 100),
        stability: arch.stats.stability, // We'll need to define how stability works in the engine
        damage: DEFAULT_STATS.damage * (arch.stats.power / 100),
        gravityScale: arch.id === 'acrobat' ? 0.8 : 1,
        extraJumps: arch.id === 'acrobat' ? 2 : 0,
      };

      return {
        id: i + 1,
        name: p.name,
        score: 0,
        color: arch.color,
        stats: archetypeStats,
        isDead: false,
        isGhost: false,
        ghostCharge: 0,
        godPellets: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, pink: 0 },
        archetypeId: arch.id,
        controllerId: p.controllerId
      };
    });

    setPlayers(initialPlayers);
    setPhase('levelVote');
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white flex flex-col items-center justify-center font-sans relative border-8 border-[#1A1A1A] overflow-hidden">
      <div className="absolute inset-0 radial-grid opacity-10 pointer-events-none" />

      {/* Persistence / Global UI */}
      <AnimatePresence>
        {phase !== 'playing' && (
          <motion.nav 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 w-full h-24 flex justify-between items-center px-12 z-50 bg-[#0C0C0C]/40 backdrop-blur-md border-b border-white/5"
          >
            <div className="flex flex-col">
              <span className="text-4xl font-black tracking-tighter italic uppercase underline decoration-white/20 leading-none">STICK ROUNDS</span>
              <span className="text-[9px] font-bold text-white/30 tracking-[0.5em] uppercase mt-1">{matchName} // {players.length}P AUTHENTICATED</span>
            </div>

            <div className="flex gap-6 items-center">
              {players.map(p => (
                <div key={p.id} className="flex flex-col items-end px-6 border-r border-white/5 last:border-r-0">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-black opacity-40 mb-2" style={{ color: p.color }}>{p.name}</span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-3 h-3 rotate-45 border transition-all duration-500 ${i < p.score ? '' : 'border-white/10'}`} style={{ backgroundColor: i < p.score ? p.color : 'transparent', borderColor: i < p.score ? p.color : '' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center z-10">
            <h2 className="text-[12rem] font-black tracking-tighter uppercase italic leading-[0.8] mb-12 text-center select-none">STICK<br />ROUNDS</h2>
            
            <div className="flex flex-col gap-6 mt-8">
              <button 
                onClick={() => setPhase('playerSelect')} 
                className="group relative px-16 py-6 transition-all hover:scale-105 active:scale-95 w-96"
              >
                <div className="absolute inset-0 bg-white/10 border-2 border-white -skew-x-12" />
                <span className="relative text-white font-black text-2xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                  <User fill="white" size={24} /> LOCAL CO-OP
                </span>
              </button>

              <button 
                onClick={() => setPhase('multiplayer')} 
                className="group relative px-16 py-6 transition-all hover:scale-105 active:scale-95 w-96"
              >
                <div className="absolute inset-0 bg-white -skew-x-12 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]" />
                <span className="relative text-black font-black text-2xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                  <Play fill="black" size={24} /> MULTIPLAYER
                </span>
              </button>

              <button 
                onClick={() => setPhase('multiplayer')} 
                className="group relative px-16 py-6 transition-all hover:scale-105 active:scale-95 w-96"
              >
                <div className="absolute inset-0 bg-cyan-500 -skew-x-12 shadow-[8px_8px_0px_0px_rgba(34,211,238,0.2)]" />
                <span className="relative text-black font-black text-2xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                  <Users fill="black" size={24} /> HYBRID ARENA
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'multiplayer' && (
           <motion.div key="multi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center z-10 w-full">
              <MultiplayerLobby 
                playerName={players[0]?.name || "RECRUIT"} 
                onGameStart={handleMultiplayerStart} 
              />
              <button onClick={() => setPhase('menu')} className="mt-8 text-white/20 hover:text-white font-bold uppercase tracking-widest text-xs">← GO BACK</button>
           </motion.div>
        )}

        {phase === 'archetypeSelect' && (
           <motion.div key="arch-select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center z-10 w-full">
              <LocalArchetypeSelect 
                players={players} 
                onComplete={handleArchetypeComplete} 
              />
           </motion.div>
        )}

        {phase === 'playerSelect' && (
          <motion.div key="pselect" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center z-10 w-full max-w-4xl px-8">
            <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-16 flex items-center gap-6"><Users size={60} /> HOW MANY STICKS?</h2>
            <div className="grid grid-cols-3 gap-12 w-full">
              {[2, 3, 4].map(count => (
                <button key={count} onClick={() => setupMatch(count)} className="group relative aspect-square bg-[#111] border-4 border-white/5 hover:border-white transition-all flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                  <span className="text-[12rem] font-black italic opacity-10 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">{count}</span>
                  <span className="text-sm font-black tracking-[0.5em] uppercase opacity-40 group-hover:opacity-100">Competitive Sticks</span>
                </button>
              ))}
            </div>
            <button onClick={() => setPhase('menu')} className="mt-12 text-white/40 hover:text-white font-bold uppercase tracking-widest text-xs">← GO BACK</button>
          </motion.div>
        )}

        {phase === 'customization' && (
          <motion.div key="custom" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center z-10 w-full max-w-2xl px-6">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-12 flex items-center gap-4"><Settings /> BATTLE IDENTITY</h2>
            
            <div className="w-full space-y-2 mb-12">
              <label className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 ml-4">Match Designation</label>
              <input 
                value={matchName} 
                onChange={e => setMatchName(e.target.value.toUpperCase())}
                className="w-full bg-white text-black p-6 text-2xl font-black uppercase italic -skew-x-12 text-center outline-none focus:ring-4 ring-white/20 transition-all"
                placeholder="ENTER MATCH NAME"
              />
            </div>

            <div className="flex flex-col gap-4 w-full mb-12">
              <label className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 ml-4">Combatant Profiles</label>
              {players.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-6 bg-white/5 p-4 border-2 border-white/10 hover:border-white/40 transition-all relative group">
                  <div className="w-12 h-12 rotate-45 flex-shrink-0 relative">
                     <div className="absolute inset-0 rounded-sm" style={{ backgroundColor: p.color }} />
                     <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <input 
                    value={p.name}
                    onChange={e => {
                      const next = [...players];
                      next[idx].name = e.target.value.toUpperCase();
                      setPlayers(next);
                    }}
                    className="flex-1 bg-transparent border-b-2 border-white/10 focus:border-white outline-none font-black text-2xl uppercase italic tracking-wider transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-20 group-hover:opacity-100 uppercase tracking-widest">{p.color}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setPhase('levelVote')} className="w-full py-8 bg-white text-black font-black text-3xl uppercase italic -skew-x-12 hover:bg-zinc-200 transition-all shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[16px_16px_0px_0px_rgba(255,255,255,0.2)]">
              PREPARE BATTLEFIELD
            </button>
          </motion.div>
        )}

        {phase === 'levelVote' && (
          <motion.div key="vote" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center z-10 w-full max-w-7xl px-12 pt-32 pb-12">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-12 flex items-center gap-6"><MapIcon size={50} /> CHOOSE DESTINATION</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full p-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              {[
                { id: 'pyramid', label: 'PYRAMID', color: '#8e6c4e', desc: 'Tiered Sands' },
                { id: 'moon', label: 'THE MOON', color: '#1a1a2e', desc: 'Low Gravity' },
                { id: 'jungle', label: 'JUNGLE', color: '#0b1a0f', desc: 'Dense Canopy' },
                { id: 'atlantis', label: 'ATLANTIS', color: '#042f2e', desc: 'Deep Sea' },
                { id: 'arctic', label: 'ARCTIC', color: '#0f172a', desc: 'Frozen Waste' },
                { id: 'radioactive', label: 'TOXIC ZONE', color: '#022c22', desc: 'Mutant Sludge' },
                { id: 'cave', label: 'THE CAVE', color: '#1e1b4b', desc: 'Crystal Grotto' },
                { id: 'volcano', label: 'VOLCANO', color: '#450a0a', desc: 'Lava Pits' },
                { id: 'foundry', label: 'FOUNDRY', color: '#1a1a1a', desc: 'Industrial' },
                { id: 'data_center', label: 'DIGITAL', color: '#020108', desc: 'Matrix Blocks' },
                { id: 'greenhouse', label: 'BOTANY', color: '#022c22', desc: 'Bio Hazards' },
                { id: 'haunted_mansion', label: 'MANSION', color: '#1e1b4b', desc: 'Ghostly Halls' },
                { id: 'underwater_base', label: 'SUB-BASE', color: '#083344', desc: 'Pressure' },
                { id: 'volcano_fortress', label: 'MAGMA', color: '#450a0a', desc: 'Lava Castle' },
                { id: 'cloud_city', label: 'SKYE', color: '#0ea5e9', desc: 'Floating' },
                { id: 'toxic_sewer', label: 'SEWERS', color: '#064e3b', desc: 'Ooze' },
                { id: 'frozen_wasteland', label: 'ICE WASTE', color: '#1e293b', desc: 'Frozen' },
                { id: 'cyber_void', label: 'VOID', color: '#111827', desc: 'Digital End' }
              ].map(level => (
                <button key={level.id} onClick={() => handleLevelVote(level.id as Level)} className="group relative aspect-[3/4] border-2 border-white/5 hover:border-white overflow-hidden transition-all duration-300">
                   <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ backgroundColor: level.color }} />
                   <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                   <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                      <span className="text-xl font-black italic uppercase tracking-tighter mb-1">{level.label}</span>
                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">{level.desc}</p>
                   </div>
                </button>
              ))}
            </div>
            <button onClick={() => setPhase('customization')} className="mt-8 text-white/20 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors">← REVISE IDENTITIES</button>
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 w-full h-full z-0">
            <GameCanvas players={players} onWin={handleWin} onDamage={handleDamage} onUpdatePlayer={handleUpdatePlayer} gamePhase={phase} level={selectedLevel || 'pyramid'} socket={socket} />
          </motion.div>
        )}
      </AnimatePresence>

      <CardDraft 
        isOpen={phase === 'drafting'} 
        onPick={handlePickCard} 
        loserName={players.find(p => p.id === draftQueue[0])?.name} 
        draftOptions={draftPool}
      />

      {phase !== 'playing' && (
        <footer className="fixed bottom-0 left-0 w-full p-6 flex justify-between items-center text-[8px] font-black tracking-[0.5em] uppercase opacity-40 z-50 bg-gradient-to-t from-black/20 to-transparent">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => <div key={i} className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
            </div>
            <span>System: Online</span>
          </div>
          <div className="flex gap-12">
            <span className="hidden md:inline">Arena: {selectedLevel?.toUpperCase() || 'STANDBY'}</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={10} className="animate-spin-slow" />
            <span>v1.8.NET</span>
          </div>
        </footer>
      )}
    </div>
  );
}
