import { useState, useRef, useEffect } from 'react';
import { useGame } from './hooks/useGame';
import { CHARACTERS, Player } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Zap, Play, ChevronRight, Activity } from 'lucide-react';

export default function App() {
  const {
    gameState,
    roomId,
    players,
    myId,
    error,
    levelIndex,
    currentLevel,
    createRoom,
    joinRoom,
    chooseCharacter,
    startGame
  } = useGame();

  const [joinInput, setJoinInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    const draw = () => {
      ctx.clearRect(0, 0, 800, 600);

      // Background Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke();
      }
      for (let i = 0; i < 600; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
      }

      // Draw Platforms
      currentLevel.platforms.forEach(plat => {
        if (plat.type === 'static') {
          ctx.fillStyle = '#1e293b'; // slate-800
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.strokeStyle = '#334155'; // slate-700
          ctx.lineWidth = 2;
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
        } else if (plat.type === 'ghost') {
          ctx.fillStyle = 'rgba(217, 70, 239, 0.1)'; // fuchsia-500 opacity
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
          ctx.setLineDash([]);
        } else if (plat.type === 'kill') {
          ctx.fillStyle = '#ef4444'; // red-500
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          // Glitch effect
          if (Math.random() > 0.95) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(plat.x, plat.y, plat.width, 2);
          }
        } else if (plat.type === 'button') {
          ctx.fillStyle = plat.isOpen ? '#06b6d4' : '#475569'; // cyan-500 or slate-600
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
        } else if (plat.type === 'door') {
          if (!plat.isOpen) {
            ctx.fillStyle = '#0f172a'; // slate-900
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
            ctx.strokeStyle = '#d946ef'; // fuchsia-500
            ctx.lineWidth = 3;
            ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
          }
        } else if (plat.type === 'goal') {
            const time = Date.now() / 500;
            ctx.fillStyle = '#06b6d4';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#06b6d4';
            ctx.beginPath();
            ctx.arc(plat.x + 20, plat.y + 20, 15 + Math.sin(time) * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
      });

      // Draw Players
      (Object.values(players) as Player[]).forEach((p: Player) => {
        if (!p.id || !p.character) return;
        const charData = CHARACTERS.find(c => c.id === p.character);
        ctx.fillStyle = charData?.color || '#fff';
        
        // Player body
        ctx.fillRect(p.x, p.y, 30, 30);
        
        // Identity indicator
        if (p.id === myId) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x - 2, p.y - 2, 34, 34);
        }

        // Power feedback
        if (p.isPhasing) {
            ctx.globalAlpha = 0.5;
            ctx.strokeRect(p.x - 5, p.y - 5, 40, 40);
            ctx.globalAlpha = 1.0;
        }

        if (p.gravityScale < 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(p.x, p.y - 5, 30, 2);
        }
      });

      frameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameId);
  }, [gameState, players, currentLevel, myId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-[-40px] left-[-20px] text-[240px] font-black tracking-tighter text-slate-900 leading-none select-none pointer-events-none uppercase z-0">
        Gravidih
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-8 relative z-10"
          >
            <div className="text-center mb-12">
              <motion.h1 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-8xl md:text-9xl font-black tracking-tighter mb-4 uppercase leading-none"
              >
                GRAVIDIH
              </motion.h1>
              <p className="text-slate-400 font-mono tracking-widest text-xs mt-4 uppercase max-w-md mx-auto">
                // Collaborative Reality Distortion Protocol
              </p>
            </div>

            <div className="space-y-6 w-full max-w-xs">
              <button 
                onClick={createRoom}
                className="w-full py-4 px-8 bg-white text-black font-black uppercase tracking-[0.3em] shadow-[8px_8px_0px_0px_rgba(71,85,105,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(71,85,105,1)] transition-all flex items-center justify-between group"
              >
                <span>CREATE</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative group shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
                <input 
                  type="text" 
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="ID: PROTOCOL"
                  className="w-full py-4 px-6 border-2 border-slate-800 bg-slate-900/80 text-center font-black tracking-widest focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                />
                {joinInput && (
                  <button 
                    onClick={() => joinRoom(joinInput)}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-cyan-500 text-black text-xs font-black hover:bg-cyan-400 transition-colors uppercase tracking-widest"
                  >
                    JOIN
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-12 text-cyan-500 font-mono text-[10px] uppercase tracking-widest animate-pulse border border-cyan-500/20 px-4 py-2 bg-cyan-500/5">
                ! ERROR: {error}
              </p>
            )}
          </motion.div>
        )}

        {gameState === 'lobby' && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen p-12 relative z-10"
          >
            <header className="flex justify-between items-start mb-20">
              <div className="flex flex-col">
                <h1 className="text-8xl font-black tracking-tighter uppercase leading-none">Lobby</h1>
                <p className="text-slate-400 font-mono tracking-widest text-[10px] mt-4 uppercase">
                  // SESSION_ID: {roomId}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-white text-black px-4 py-1 text-sm font-bold uppercase tracking-widest mb-2 shadow-[4px_4px_0px_0px_rgba(71,85,105,1)]">
                  Party: {Object.keys(players).length} / 5
                </div>
                <div className="text-slate-500 font-mono text-[10px] tracking-widest uppercase">
                  ACTIVE_LINK_STABLE
                </div>
              </div>
            </header>

            <main className="grid grid-cols-5 gap-4 flex-grow mb-12">
              {[...Array(5)].map((_, i) => {
                const pList = Object.values(players) as Player[];
                const p = pList[i];
                const charData = p ? CHARACTERS.find(c => c.id === p.character) : null;
                const isMe = p?.id === myId;

                if (p) {
                  return (
                    <div 
                      key={p.id} 
                      className={`border-2 p-6 flex flex-col h-full bg-slate-900/50 transition-colors ${
                        isMe ? 'border-white animate-pulse' : charData ? 'border-cyan-500' : 'border-slate-800'
                      }`}
                    >
                      <div className="mb-auto">
                        <span className={`text-[10px] font-mono block mb-2 tracking-widest uppercase ${isMe ? 'text-white' : 'text-cyan-400'}`}>
                          P{i + 1} // {isMe ? 'YOU' : 'READY'}
                        </span>
                        <h2 className="text-3xl font-black uppercase mb-1 leading-none">
                          {charData?.name || 'SYNCING...'}
                        </h2>
                        <p className="text-[10px] text-slate-400 leading-tight uppercase mt-2">
                          {charData?.description || 'Awaiting selection...'}
                        </p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                        {p.id === myId && !p.character && (
                          <div className="grid grid-cols-2 gap-2">
                            {CHARACTERS.map(c => (
                              <button
                                key={c.id}
                                onClick={() => chooseCharacter(roomId!, c.id)}
                                className="text-[10px] font-black border border-white/20 p-2 hover:bg-white hover:text-black transition-all uppercase tracking-tighter"
                              >
                                {c.id}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="w-full h-32 bg-slate-800/50 flex items-center justify-center border border-white/5">
                            <div className="w-8 h-8 rotate-45 border-2 border-cyan-500/50" />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="border-2 border-dashed border-slate-800 bg-slate-900/20 p-6 flex flex-col h-full opacity-50">
                    <div className="my-auto text-center">
                      <span className="text-[10px] font-mono text-slate-600 block mb-2 uppercase tracking-widest">P{i + 1} // WAITING</span>
                      <div className="text-slate-800 text-3xl font-black uppercase tracking-tighter">EMPTY</div>
                    </div>
                  </div>
                );
              })}
            </main>

            <footer className="mt-auto border-t border-slate-800 pt-8 flex justify-between items-center">
              <div className="flex space-x-12">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">CURRENT STATUS</span>
                  <span className="text-xl font-black uppercase">PRE-FLIGHT // LOBBY</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">COOPERATION</span>
                  <span className="text-xl font-black uppercase text-cyan-400">OPTIMAL</span>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <button 
                  onClick={startGame}
                  className="bg-white hover:bg-slate-200 text-black px-12 py-4 text-sm font-black uppercase tracking-[0.3em] shadow-[8px_8px_0px_0px_rgba(71,85,105,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  START_MISSION
                </button>
              </div>
            </footer>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen overflow-hidden relative z-10"
          >
            <div className="h-24 border-b-2 border-slate-800 px-12 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
              <div className="flex gap-12 items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">PROTOCOL</span>
                  <span className="text-2xl font-black uppercase leading-none">GRAVIDIH // L0{levelIndex + 1}</span>
                </div>
                <div className="h-8 w-[2px] bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">PARTICIPANTS</span>
                  <span className="text-xl font-black uppercase leading-none text-cyan-400">{Object.keys(players).length} ACTIVE</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-[10px] text-right font-mono text-slate-500 space-y-1">
                  <p>CONTROLS: WASD_MOVE | Q_ABILITY | SPACE_JUMP</p>
                  <p>STATUS: SYSTEM_NOMINAL // EN_STABLE</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-transparent">
              <div className="relative border-2 border-slate-800 shadow-[20px_20px_0px_0px_rgba(15,23,42,0.5)]">
                <canvas 
                  ref={canvasRef} 
                  width={800} 
                  height={600}
                  className="bg-slate-950/90"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
