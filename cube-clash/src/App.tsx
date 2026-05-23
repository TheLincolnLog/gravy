import React, { useState, useCallback, useEffect, useMemo } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { CardDraft } from "./components/CardDraft";
import { MultiplayerLobby } from "./components/MultiplayerLobby";
import { ARCHETYPES } from "./constants/archetypes";
import { LocalArchetypeSelect } from "./components/LocalArchetypeSelect";
import { ArchetypeShop } from "./components/ArchetypeShop";
import { TutorialOverlay } from "./components/TutorialOverlay";
import { CubeSilhouette } from "./components/CubeSilhouette";
import {
  Player,
  PlayerStats,
  GamePhase,
  Card,
  Level,
  Rarity,
} from "./types/game";
import {
  RefreshCw,
  Play,
  Users,
  Map as MapIcon,
  Settings,
  User,
  ShoppingBag,
  Trophy,
  Home,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_CARDS } from "./constants/cards";

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
  stability: 100,
};

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [matchName, setMatchName] = useState("UNSTOPPABLE DUEL");
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftQueue, setDraftQueue] = useState<number[]>([]);
  const [draftPool, setDraftPool] = useState<Card[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [socket, setSocket] = useState<any>(null);
  
  // PERSISTENCE STATE
  const [totalWins, setTotalWins] = useState(0);
  const [unlockedArchetypes, setUnlockedArchetypes] = useState<string[]>(["titan", "wraith", "gunner", "acrobat"]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [isHybridMode, setIsHybridMode] = useState(false);
  const [controlMode, setControlMode] = useState<'pc' | 'mobile'>('pc');
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [tutorialState, setTutorialState] = useState({
    moved: false,
    jumped: false,
    targetsHit: 0,
    totalTargets: 3
  });

  const tutorialPlayers = useMemo<Player[]>(() => {
    const arch = ARCHETYPES.find(a => a.id === "titan") || ARCHETYPES[0];
    const archetypeStats = {
      ...DEFAULT_STATS,
      movementSpeed: DEFAULT_STATS.movementSpeed * (arch.stats.speed / 100),
      stability: arch.stats.stability,
      damage: DEFAULT_STATS.damage * (arch.stats.power / 100),
      gravityScale: arch.id === "acrobat" ? 0.8 : 1,
      extraJumps: arch.id === "acrobat" ? 2 : 0,
    };

    return [{ 
      id: 1, 
      name: "Trainee", 
      color: "#00f2fe", 
      archetypeId: "titan", 
      controllerId: "local",
      stats: archetypeStats,
      score: 0,
      deaths: 0,
      kills: 0,
      lastHitBy: null,
      isLocal: true,
      isDead: false,
      isGhost: false,
      ghostCharge: 0,
      godPellets: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, pink: 0 },
    } as any];
  }, []);

  // Load persistence
  useEffect(() => {
    const savedWins = localStorage.getItem("cube_clash_wins");
    const savedArchs = localStorage.getItem("cube_clash_unlocked");
    const savedMode = localStorage.getItem("cube_clash_control_mode") as 'pc' | 'mobile';
    const tutorialDone = localStorage.getItem("cube_clash_tutorial_done");
    if (savedWins) setTotalWins(parseInt(savedWins));
    if (savedArchs) setUnlockedArchetypes(JSON.parse(savedArchs));
    if (savedMode) setControlMode(savedMode);
    if (tutorialDone === "true") setHasCompletedTutorial(true);
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem("cube_clash_wins", totalWins.toString());
    localStorage.setItem("cube_clash_unlocked", JSON.stringify(unlockedArchetypes));
    localStorage.setItem("cube_clash_control_mode", controlMode);
    localStorage.setItem("cube_clash_tutorial_done", hasCompletedTutorial.toString());
  }, [totalWins, unlockedArchetypes, controlMode, hasCompletedTutorial]);

  const getDraftPool = () => {
    const getWeight = (r: Rarity) => {
      switch (r) {
        case "mythical":
          return 1;
        case "legendary":
          return 3;
        case "epic":
          return 10;
        case "rare":
          return 25;
        case "uncommon":
          return 50;
        default:
          return 100;
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
    const colors = ["#22d3ee", "#f43f5e", "#a855f7", "#10b981"];
    const initialPlayers: Player[] = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `CUBE ${i + 1}`,
      score: 0,
      color: colors[i],
      stats: { ...DEFAULT_STATS },
      isDead: false,
      isGhost: false,
      ghostCharge: 0,
      godPellets: {
        red: 0,
        orange: 0,
        yellow: 0,
        green: 0,
        blue: 0,
        purple: 0,
        pink: 0,
      },
      controllerId: "local",
    }));
    setPlayers(initialPlayers);
    setPhase("archetypeSelect");
  };

  const handleArchetypeComplete = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    setPhase("customization");
  };

  const handleLevelVote = (level: Level) => {
    setSelectedLevel(level);
    setPhase("playing");
  };

  const handleWin = useCallback((winnerId: number, deathOrder: number[]) => {
    let matchWinner: Player | null = null;
    
    setTotalRounds(prev => {
        const next = prev + 1;
        // Check for match end after 10 rounds total
        if (next >= 10) {
            setPlayers(currentPlayers => {
                // Find majority wins
                const sorted = [...currentPlayers].sort((a, b) => b.score - a.score);
                if (sorted[0].score > sorted[1].score || sorted.length === 1) {
                    matchWinner = sorted[0];
                }
                return currentPlayers;
            });
        }
        return next;
    });

    setPlayers((prev) => {
      return prev.map((p) => {
        const isWinner = p.id === winnerId;
        return {
          ...p,
          score: isWinner ? p.score + 1 : p.score,
          stats: { ...p.stats, health: p.stats.maxHealth },
        };
      });
    });

    if (winnerId === -1) {
       // Draw: Nobody wins, nobody gets upgrade (per user request: "not both")
       setPhase("playing");
       return;
    }

    if (matchWinner) {
      setTotalWins(prev => prev + 1); // Reward permanent currency
      setPhase("matchOver");
      return;
    }

    // Only the player who died (and lost the round) gets an upgrade.
    // Filter deathOrder to only include those who actually "lost" to the winner
    const losers = deathOrder.filter(id => id !== winnerId);

    if (losers.length > 0) {
      setDraftQueue([...losers]);
      setDraftPool(getDraftPool());
      setPhase("drafting");
    } else {
      setPhase("playing");
    }
  }, []);

  const handlePickCard = (card: Card) => {
    const currentPickerId = draftQueue[0];
    if (currentPickerId === undefined) return;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === currentPickerId)
          return { ...p, stats: card.apply(p.stats) };
        return p;
      }),
    );

    setDraftPool((prev) => prev.filter((c) => c.id !== card.id));

    const nextQueue = draftQueue.slice(1);
    if (nextQueue.length > 0) {
      setDraftQueue(nextQueue);
    } else {
      setDraftQueue([]);
      setPhase("playing");
    }
  };

  const handleDamage = useCallback((playerId: number, health: number) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId)
          return { ...p, stats: { ...p.stats, health: Math.max(0, health) } };
        return p;
      }),
    );
  }, []);

  const handleUpdatePlayer = useCallback(
    (playerId: number, updates: Partial<Player>) => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === playerId) return { ...p, ...updates };
          return p;
        }),
      );
    },
    [],
  );

  const handleMultiplayerStart = (lobbyData: any, gameSocket: any) => {
    setSocket(gameSocket);
    const initialPlayers: Player[] = Object.values(lobbyData.players).map(
      (p: any, i: number) => {
        const arch =
          ARCHETYPES.find((a) => a.id === p.lockedArchetype) || ARCHETYPES[0];

        // Apply archetype stats to base DEFAULT_STATS
        const archetypeStats = {
          ...DEFAULT_STATS,
          movementSpeed: DEFAULT_STATS.movementSpeed * (arch.stats.speed / 100),
          stability: arch.stats.stability, // We'll need to define how stability works in the engine
          damage: DEFAULT_STATS.damage * (arch.stats.power / 100),
          gravityScale: arch.id === "acrobat" ? 0.8 : 1,
          extraJumps: arch.id === "acrobat" ? 2 : 0,
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
          godPellets: {
            red: 0,
            orange: 0,
            yellow: 0,
            green: 0,
            blue: 0,
            purple: 0,
            pink: 0,
          },
          archetypeId: arch.id,
          controllerId: p.controllerId,
        };
      },
    );

    setPlayers(initialPlayers);
    setPhase("levelVote");
  };

  return (
    <div 
      className="min-h-screen text-white flex flex-col items-center justify-center font-sans relative border-8 border-[#1A1A1A] overflow-hidden transition-all duration-1000"
      style={{ 
        backgroundColor: hoverColor === 'blue' ? 'rgb(var(--blue-rgb) / 25%)' : 
                         hoverColor === 'green' ? 'rgb(var(--green-rgb) / 25%)' :
                         hoverColor === 'brown' ? 'rgb(var(--brown-rgb) / 25%)' : 
                         '#0C0C0C' 
      }}
    >
      <div className="absolute inset-0 radial-grid opacity-10 pointer-events-none" />

      {/* persistence / Global UI */}
      <AnimatePresence>
        {(phase === "drafting" || phase === "matchOver") && (
          <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 w-full h-24 flex justify-between items-center px-12 z-50 bg-[#0C0C0C]/40 backdrop-blur-md border-b border-white/5"
          >
            <div className="flex flex-col">
              <span className="text-4xl font-black tracking-tighter italic uppercase underline decoration-white/20 leading-none">
                CUBE CLASH
              </span>
              <span className="text-[9px] font-bold text-white/30 tracking-[0.5em] uppercase mt-1">
                {matchName}
              </span>
            </div>

            <div className="flex gap-6 items-center">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-end px-6 border-r border-white/5 last:border-r-0"
                >
                  <span
                    className="text-[9px] uppercase tracking-[0.2em] font-black opacity-40 mb-2"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rotate-45 border transition-all duration-500 ${i < p.score ? "" : "border-white/10"}`}
                        style={{
                          backgroundColor:
                            i < p.score ? p.color : "transparent",
                          borderColor: i < p.score ? p.color : "",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center z-10 w-full"
          >
            {/* Redecorated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ x: [100, 200, 100], y: [100, 150, 100], rotate: [0, 45, 0] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4 opacity-20"
                >
                    <CubeSilhouette color="#22d3ee" archetypeId="acrobat" />
                </motion.div>
                <motion.div 
                    animate={{ x: [-100, -250, -100], y: [200, 100, 200], rotate: [0, -30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, delay: 1 }}
                    className="absolute top-1/3 right-1/4 opacity-20"
                >
                    <CubeSilhouette color="#f43f5e" archetypeId="titan" />
                </motion.div>

                {/* Animated Projectiles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ 
                            x: [-1000, 2500],
                            y: [Math.random() * 1000, Math.random() * 1000]
                        }}
                        transition={{ 
                            duration: 2 + Math.random() * 3, 
                            repeat: Infinity, 
                            delay: i * 0.8,
                            ease: "linear"
                        }}
                        className="absolute h-1 bg-gradient-to-r from-transparent via-white to-transparent w-40 opacity-30 shadow-[0_0_10px_white]"
                        style={{ top: `${20 + i * 15}%` }}
                    />
                ))}
            </div>

            <div 
              className="title-clash-container mb-12"
              onMouseEnter={() => setHoverColor('blue')}
              onMouseLeave={() => setHoverColor(null)}
            >
              <h2 className="text-[12rem] font-black tracking-tighter uppercase italic leading-[0.8] text-center select-none relative z-10">
                CUBE
                <br />
                CLASH
                <div className="absolute -top-12 -right-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                        <RefreshCw size={80} className="text-white/5" />
                    </motion.div>
                </div>
              </h2>
              
              <div className="clash-faders">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="clash-fader text-[12rem] font-black tracking-tighter uppercase italic leading-[0.8] text-white/10 text-center select-none">
                    CUBE<br />CLASH
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6 mt-8 w-full max-w-2xl px-8 z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <button
                  onClick={() => {
                    setIsHybridMode(false);
                    setPhase("playerSelect");
                  }}
                  className="group relative px-12 py-6 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="absolute inset-0 bg-white/10 border-2 border-white -skew-x-12" />
                  <span className="relative text-white font-black text-xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                    <User fill="white" size={24} /> LOCAL ARENA
                  </span>
                </button>

                <button
                  onClick={() => {
                    setPhase("multiplayer");
                  }}
                  onMouseEnter={() => setHoverColor('green')}
                  onMouseLeave={() => setHoverColor(null)}
                  className="group relative px-12 py-6 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="absolute inset-0 bg-white -skew-x-12 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]" />
                  <span className="relative text-black font-black text-xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                    <Play fill="black" size={24} /> MULTIPLAYER
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsHybridMode(true);
                    setPhase("playerSelect");
                  }}
                  className="group relative px-12 py-6 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 -skew-x-12 shadow-[8px_8px_0px_0px_rgba(34,211,238,0.1)] group-hover:bg-cyan-500 group-hover:shadow-[8px_8px_0px_0px_rgba(34,211,238,0.4)] transition-all" />
                  <span className="relative text-cyan-400 group-hover:text-black font-black text-xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                    <Users fill="currentColor" size={24} /> HYBRID ARENA
                  </span>
                  <div className="absolute -bottom-2 -left-2 bg-black border border-cyan-400/50 px-2 py-0.5 text-[8px] font-bold text-cyan-400 tracking-widest -skew-x-12">
                     ALL UNITS UNLOCKED
                  </div>
                </button>

                <button
                  onClick={() => {
                    setPhase("shop");
                  }}
                  onMouseEnter={() => setHoverColor('brown')}
                  onMouseLeave={() => setHoverColor(null)}
                  className="group relative px-12 py-6 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="absolute inset-0 bg-amber-400 -skew-x-12 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.2)]" />
                  <span className="relative text-black font-black text-xl uppercase tracking-tighter italic flex items-center justify-center gap-4">
                    <ShoppingBag fill="black" size={24} /> ARCHETYPE SHOP
                  </span>
                  <div className="absolute -top-2 -right-2 bg-black text-white px-3 py-1 text-[10px] font-black -skew-x-12">
                     {unlockedArchetypes.length} / {ARCHETYPES.length} UNITS
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <button
                onClick={() => setControlMode(prev => prev === 'pc' ? 'mobile' : 'pc')}
                className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:border-white/40 transition-all rounded-full group font-black text-xs tracking-widest uppercase"
              >
                <Settings size={16} className="group-hover:rotate-90 transition-transform" />
                MODE: <span className={controlMode === 'mobile' ? 'text-cyan-400' : 'text-white'}>{controlMode}</span>
              </button>

              <button
                onClick={() => {
                   setTutorialState({ moved: false, jumped: false, targetsHit: 0, totalTargets: 3 });
                   setPhase("playerSelect");
                   // We actually want a special "tutorial" phase in GameCanvas
                   // but for now let's just use the "tutorial" phase we defined
                   setPhase("tutorial");
                }}
                className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:border-white/40 transition-all rounded-full group font-black text-xs tracking-widest uppercase"
              >
                <HelpCircle size={16} className="group-hover:scale-110 transition-transform" />
                HOW TO PLAY
              </button>
            </div>
          </motion.div>
        )}

        {phase === "tutorial" && (
           <>
              <GameCanvas
                 players={tutorialPlayers}
                 gamePhase="playing" // Treat as playing for engine to run
                 level="pyramid"
                 controlMode={controlMode}
                 onTutorialUpdate={(update) => {
                    setTutorialState(prev => {
                       const nextTargets = prev.targetsHit + (update.targetsHit || 0);
                       // Only update if something actually changed to avoid unnecessary re-renders
                       if (prev.moved === !!(update.moved || prev.moved) && 
                           prev.jumped === !!(update.jumped || prev.jumped) && 
                           prev.targetsHit === nextTargets) {
                          return prev;
                       }
                       return {
                          ...prev,
                          ...update,
                          targetsHit: nextTargets
                       };
                    });
                 }}
              />
              <TutorialOverlay 
                 tutorialState={tutorialState}
                 controlMode={controlMode} 
                 onComplete={() => {
                    setHasCompletedTutorial(true);
                    setPhase("menu");
                 }} 
              />
           </>
        )}

        {phase === "shop" && (
           <motion.div
             key="shop"
             initial={{ opacity: 0, x: 100 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -100 }}
             className="flex flex-col items-center z-50 w-full"
           >
             <ArchetypeShop 
                totalWins={totalWins} 
                unlockedIds={unlockedArchetypes}
                onClose={() => setPhase("menu")}
                onPurchase={(id, price) => {
                    if (totalWins >= price) {
                        setTotalWins(prev => prev - price);
                        setUnlockedArchetypes(prev => [...prev, id]);
                    }
                }}
             />
           </motion.div>
        )}

        {phase === "multiplayer" && (
          <motion.div
            key="multi"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center z-10 w-full"
          >
            <MultiplayerLobby
              playerName={players[0]?.name || "RECRUIT"}
              onGameStart={handleMultiplayerStart}
            />
            <button
              onClick={() => setPhase("menu")}
              className="mt-8 text-white/20 hover:text-white font-bold uppercase tracking-widest text-xs"
            >
              ← GO BACK
            </button>
          </motion.div>
        )}

        {phase === "archetypeSelect" && (
          <motion.div
            key="arch-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center z-10 w-full"
          >
            <LocalArchetypeSelect
              players={players}
              unlockedIds={isHybridMode ? ARCHETYPES.map(a => a.id) : unlockedArchetypes}
              onComplete={handleArchetypeComplete}
              onBack={() => setPhase("playerSelect")}
            />
          </motion.div>
        )}

        {phase === "playerSelect" && (
          <motion.div
            key="pselect"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center z-10 w-full max-w-4xl px-8"
          >
            <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-16 flex items-center gap-6">
              <Users size={60} /> HOW MANY CUBES?
            </h2>
            <div className="grid grid-cols-3 gap-12 w-full">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => setupMatch(count)}
                  className="group relative aspect-square bg-[#111] border-4 border-white/5 hover:border-white transition-all flex flex-col items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                  <span className="text-[12rem] font-black italic opacity-10 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                    {count}
                  </span>
                  <span className="text-sm font-black tracking-[0.5em] uppercase opacity-40 group-hover:opacity-100">
                    Competitive Cubes
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase("menu")}
              className="mt-12 text-white/40 hover:text-white font-bold uppercase tracking-widest text-xs"
            >
              ← GO BACK
            </button>
          </motion.div>
        )}

        {phase === "customization" && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center z-10 w-full max-w-2xl px-6"
          >
            <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-12 flex items-center gap-4">
              <Settings /> BATTLE IDENTITY
            </h2>

            <div className="w-full space-y-2 mb-12">
              <label className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 ml-4">
                Match Designation
              </label>
              <input
                value={matchName}
                onChange={(e) => setMatchName(e.target.value.toUpperCase())}
                className="w-full bg-white text-black p-6 text-2xl font-black uppercase italic -skew-x-12 text-center outline-none focus:ring-4 ring-white/20 transition-all"
                placeholder="ENTER MATCH NAME"
              />
            </div>

            <div className="flex flex-col gap-4 w-full mb-12">
              <label className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 ml-4">
                Combatant Profiles
              </label>
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center gap-6 bg-white/5 p-4 border-2 border-white/10 hover:border-white/40 transition-all relative group"
                >
                  <div className="w-12 h-12 rotate-45 flex-shrink-0 relative">
                    <div
                      className="absolute inset-0 rounded-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <input
                    value={p.name}
                    onChange={(e) => {
                      const next = [...players];
                      next[idx].name = e.target.value.toUpperCase();
                      setPlayers(next);
                    }}
                    className="flex-1 bg-transparent border-b-2 border-white/10 focus:border-white outline-none font-black text-2xl uppercase italic tracking-wider transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-20 group-hover:opacity-100 uppercase tracking-widest">
                    {p.color}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setPhase("levelVote")}
              className="w-full py-8 bg-white text-black font-black text-3xl uppercase italic -skew-x-12 hover:bg-zinc-200 transition-all shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[16px_16px_0px_0px_rgba(255,255,255,0.2)]"
            >
              PREPARE BATTLEFIELD
            </button>
            <button
              onClick={() => setPhase("playerSelect")}
              className="mt-8 text-white/20 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
            >
              ← CHANGE PLAYER COUNT
            </button>
          </motion.div>
        )}

        {phase === "levelVote" && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center z-10 w-full max-w-7xl px-12 pt-32 pb-12"
          >
            <div className="flex justify-between items-center w-full mb-12">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter flex items-center gap-6">
                <MapIcon size={50} /> CHOOSE DESTINATION
              </h2>
              <button 
                onClick={() => setPhase("archetypeSelect")}
                className="px-8 py-3 bg-white/5 border border-white/20 text-white/40 hover:text-white hover:border-white font-black text-sm uppercase italic -skew-x-12 transition-all"
              >
                ← GO BACK
              </button>
            </div>
            <div
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full p-2 overflow-y-auto custom-scrollbar"
              style={{ maxHeight: "calc(100vh - 350px)" }}
            >
              {[
                {
                  id: "pyramid",
                  label: "PYRAMID",
                  color: "#8e6c4e",
                  desc: "Tiered Sands",
                },
                {
                  id: "moon",
                  label: "THE MOON",
                  color: "#1a1a2e",
                  desc: "Low Gravity",
                },
                {
                  id: "jungle",
                  label: "JUNGLE",
                  color: "#0b1a0f",
                  desc: "Dense Canopy",
                },
                {
                  id: "atlantis",
                  label: "ATLANTIS",
                  color: "#042f2e",
                  desc: "Deep Sea",
                },
                {
                  id: "arctic",
                  label: "ARCTIC",
                  color: "#0f172a",
                  desc: "Frozen Waste",
                },
                {
                  id: "radioactive",
                  label: "TOXIC ZONE",
                  color: "#022c22",
                  desc: "Mutant Sludge",
                },
                {
                  id: "cave",
                  label: "THE CAVE",
                  color: "#1e1b4b",
                  desc: "Crystal Grotto",
                },
                {
                  id: "volcano",
                  label: "VOLCANO",
                  color: "#450a0a",
                  desc: "Lava Pits",
                },
                {
                  id: "foundry",
                  label: "FOUNDRY",
                  color: "#1a1a1a",
                  desc: "Industrial",
                },
                {
                  id: "data_center",
                  label: "DIGITAL",
                  color: "#020108",
                  desc: "Matrix Blocks",
                },
                {
                  id: "greenhouse",
                  label: "BOTANY",
                  color: "#022c22",
                  desc: "Bio Hazards",
                },
                {
                  id: "haunted_mansion",
                  label: "MANSION",
                  color: "#1e1b4b",
                  desc: "Ghostly Halls",
                },
                {
                  id: "underwater_base",
                  label: "SUB-BASE",
                  color: "#083344",
                  desc: "Pressure",
                },
                {
                  id: "volcano_fortress",
                  label: "MAGMA",
                  color: "#450a0a",
                  desc: "Lava Castle",
                },
                {
                  id: "cloud_city",
                  label: "SKYE",
                  color: "#0ea5e9",
                  desc: "Floating",
                },
                {
                  id: "toxic_sewer",
                  label: "SEWERS",
                  color: "#064e3b",
                  desc: "Ooze",
                },
                {
                  id: "frozen_wasteland",
                  label: "ICE WASTE",
                  color: "#1e293b",
                  desc: "Frozen",
                },
                {
                  id: "cyber_void",
                  label: "VOID",
                  color: "#111827",
                  desc: "Digital End",
                },
              ].map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleLevelVote(level.id as Level)}
                  className="group relative aspect-[3/4] border-2 border-white/5 hover:border-white overflow-hidden transition-all duration-300"
                >
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundColor: level.color }}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <span className="text-xl font-black italic uppercase tracking-tighter mb-1">
                      {level.label}
                    </span>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">
                      {level.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase("customization")}
              className="mt-8 text-white/20 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
            >
              ← REVISE IDENTITIES
            </button>
          </motion.div>
        )}

        {phase === "playing" && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 w-full h-full z-0"
          >
            {/* UI Overlay */}
            <div className="absolute top-8 left-8 flex items-center gap-4 z-50">
               <button 
                  onClick={() => setPhase("menu")}
                  className="p-4 bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/40 text-white/40 hover:text-white transition-all rounded-full group pointer-events-auto"
                  title="Return to Menu"
               >
                  <Home size={24} className="group-hover:scale-110 transition-transform" />
               </button>
               <div className="flex flex-col">
                  <span className="text-xl font-black italic uppercase text-white/80">{matchName}</span>
               </div>
            </div>

            <GameCanvas
              players={players}
              onWin={handleWin}
              onDamage={handleDamage}
              onUpdatePlayer={handleUpdatePlayer}
              gamePhase={phase}
              level={selectedLevel || "pyramid"}
              socket={socket}
              controlMode={controlMode}
            />
          </motion.div>
        )}

        {(phase as any) === "matchOver" && (
          <motion.div
            key="match-over"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center z-10"
          >
            <div className="text-[9px] font-black tracking-[1em] text-white/40 uppercase mb-4">MATCH CONCLUDED</div>
            <h2 className="text-[10rem] font-black italic uppercase tracking-tighter leading-none mb-4" style={{ color: players.sort((a,b) => b.score - a.score)[0]?.color }}>
              {players.sort((a,b) => b.score - a.score)[0]?.name}
            </h2>
            <div className="text-4xl font-black italic uppercase tracking-widest mb-12">CHAMPION</div>
            <div className="flex gap-12 mb-16">
                {players.sort((a,b) => b.score - a.score).map((p, i) => (
                    <div key={p.id} className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase opacity-40 mb-2">#{i+1} {p.name}</span>
                        <span className="text-3xl font-black italic uppercase" style={{ color: p.color }}>{p.score} PTS</span>
                    </div>
                ))}
            </div>
            <button
               onClick={() => {
                   setTotalRounds(0);
                   setPhase("menu");
               }}
               className="px-16 py-6 bg-white text-black font-black text-2xl uppercase italic -skew-x-12 hover:scale-105 transition-all"
            >
              RETURN TO MENU
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CardDraft
        isOpen={phase === "drafting"}
        onPick={handlePickCard}
        loserName={players.find((p) => p.id === draftQueue[0])?.name}
        draftOptions={draftPool}
      />

      {phase !== "playing" && (
        <footer className="fixed bottom-0 left-0 w-full p-6 flex justify-between items-center text-[8px] font-black tracking-[0.5em] uppercase opacity-40 z-50 bg-gradient-to-t from-black/20 to-transparent">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={10} className="animate-spin-slow" />
            <span>v1.0.0</span>
          </div>
        </footer>
      )}
    </div>
  );
}
