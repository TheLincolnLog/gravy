import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GameEngine } from "../game/GameEngine";
import { Player, GamePhase, Level } from "../types/game";
import { ChevronLeft, ChevronRight, ChevronUp, Zap } from "lucide-react";

interface GameCanvasProps {
  players: Player[];
  onWin?: (winnerId: number, deathOrder: number[]) => void;
  onDamage?: (playerId: number, health: number) => void;
  onUpdatePlayer?: (playerId: number, updates: Partial<Player>) => void;
  gamePhase: GamePhase;
  level: Level;
  socket?: any;
  controlMode: 'pc' | 'mobile';
  onTutorialUpdate?: (update: { moved?: boolean; jumped?: boolean; targetsHit?: number }) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  players,
  onWin,
  onDamage,
  onUpdatePlayer,
  gamePhase,
  level,
  socket,
  controlMode,
  onTutorialUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>(undefined);
  const inputsRef = useRef<{ [id: number]: any }>({});
  const playersRef = useRef<Player[]>(players);
  const tutorialProgress = useRef({ moved: false, jumped: false });

  const onWinRef = useRef(onWin);
  const onDamageRef = useRef(onDamage);
  const onUpdatePlayerRef = useRef(onUpdatePlayer);
  const onTutorialUpdateRef = useRef(onTutorialUpdate);

  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);
  useEffect(() => {
    onDamageRef.current = onDamage;
  }, [onDamage]);
  useEffect(() => {
    onUpdatePlayerRef.current = onUpdatePlayer;
  }, [onUpdatePlayer]);
  useEffect(() => {
    onTutorialUpdateRef.current = onTutorialUpdate;
  }, [onTutorialUpdate]);

  // Update ref when props change
  useEffect(() => {
    playersRef.current = players;
    if (engineRef.current) {
      engineRef.current.syncPlayers(players);
    }
  }, [players]);

  useEffect(() => {
    if (!canvasRef.current || gamePhase !== "playing") return;

    const canvas = canvasRef.current;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const engine = new GameEngine(canvas, level);
    engineRef.current = engine;

    // Randomized Spawn Points
    const spawnPoints = [
      { x: 200 + Math.random() * 400, y: 300 },
      { x: 2000 + Math.random() * 400, y: 300 },
      { x: 1100 + Math.random() * 400, y: 300 },
      { x: 1600 + Math.random() * 400, y: 300 },
    ];

    playersRef.current.forEach((p, i) => {
      const spawn = spawnPoints[i] || spawnPoints[0];
      engine.addPlayer(p, spawn.x, spawn.y);
    });

    if (onTutorialUpdateRef.current) {
      engine.setupTutorial();
      engine.onTutorialTargetHit = () => {
        onTutorialUpdateRef.current?.({ targetsHit: 1 });
      };
    }

    engine.onWin = (id, deathOrder) => onWinRef.current?.(id, deathOrder);
    engine.onHealthChange = (id, health) => onDamageRef.current?.(id, health);
    engine.onWeaponChange = (id, weapon) =>
      onUpdatePlayerRef.current?.(id, { currentWeapon: weapon });
    engine.onForceFieldChange = (id, active) =>
      onUpdatePlayerRef.current?.(id, { hasForceField: active });
    engine.onGodModeChange = (id, pellets, mode, end) =>
      onUpdatePlayerRef.current?.(id, {
        godPellets: pellets,
        activeGodMode: mode,
        godModeEnd: end,
      });
    engine.onUpdatePlayer = (id, updates) =>
      onUpdatePlayerRef.current?.(id, updates);

    const handleKeyDown = (e: KeyboardEvent) => {
      playersRef.current.forEach((p, idx) => {
        // Networking: Only control players that belong to this local device
        const isLocal = !socket || p.controllerId === socket.id;
        if (!isLocal) return;

        if (!inputsRef.current[p.id]) inputsRef.current[p.id] = {};

        const input = inputsRef.current[p.id];
        if (idx === 0) {
          // P1: WASD + F
          if (e.code === "KeyW") input.jump = true;
          if (e.code === "KeyA") input.left = true;
          if (e.code === "KeyD") input.right = true;
          if (e.code === "KeyF") input.fire = true;
        } else if (idx === 1) {
          // P2: ARROWS + ENT
          if (e.code === "ArrowUp") input.jump = true;
          if (e.code === "ArrowLeft") input.left = true;
          if (e.code === "ArrowRight") input.right = true;
          if (e.code === "Enter") input.fire = true;
        } else if (idx === 2) {
          // P3: GHJY + T
          if (e.code === "KeyY") input.jump = true;
          if (e.code === "KeyG") input.left = true;
          if (e.code === "KeyJ") input.right = true;
          if (e.code === "KeyT") input.fire = true;
        } else if (idx === 3) {
          // P4: PL;' + K
          if (e.code === "KeyP") input.jump = true;
          if (e.code === "KeyL") input.left = true;
          if (e.code === "Quote") input.right = true;
          if (e.code === "KeyK") input.fire = true;
        }
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      playersRef.current.forEach((p, idx) => {
        // Networking: Only control players that belong to this local device
        const isLocal = !socket || p.controllerId === socket.id;
        if (!isLocal) return;

        if (!inputsRef.current[p.id]) inputsRef.current[p.id] = {};
        const input = inputsRef.current[p.id];
        if (idx === 0) {
          if (e.code === "KeyW") input.jump = false;
          if (e.code === "KeyA") input.left = false;
          if (e.code === "KeyD") input.right = false;
          if (e.code === "KeyF") input.fire = false;
        } else if (idx === 1) {
          if (e.code === "ArrowUp") input.jump = false;
          if (e.code === "ArrowLeft") input.left = false;
          if (e.code === "ArrowRight") input.right = false;
          if (e.code === "Enter") input.fire = false;
        } else if (idx === 2) {
          if (e.code === "KeyY") input.jump = false;
          if (e.code === "KeyG") input.left = false;
          if (e.code === "KeyJ") input.right = false;
          if (e.code === "KeyT") input.fire = false;
        } else if (idx === 3) {
          if (e.code === "KeyP") input.jump = false;
          if (e.code === "KeyL") input.left = false;
          if (e.code === "Quote") input.right = false;
          if (e.code === "KeyK") input.fire = false;
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    if (socket) {
      socket.on("network_update", (data: any) => {
        if (engineRef.current && data.playerId) {
          const remotePlayer = playersRef.current.find(
            (p) => p.id === data.playerId,
          );
          // Only sync if it's truly remote
          if (remotePlayer && remotePlayer.controllerId !== socket.id) {
            engineRef.current.syncNetworkPlayer(
              data.playerId,
              data.pos,
              data.vel,
              data.health,
              {
                poisonEnd: data.poisonEnd,
                burnEnd: data.burnEnd,
                freezeEnd: data.freezeEnd,
                stunEnd: data.stunEnd,
                regenEnd: data.regenEnd,
                isStuckEnd: data.isStuckEnd,
                hasForceField: data.hasForceField,
              },
            );
          }
        }
      });
    }

    let lastEmitTime = 0;
    const animate = () => {
      const now = Date.now();
      if (engineRef.current) {
        engineRef.current.update(inputsRef.current);
        engineRef.current.draw();

        // Tutorial progress tracking
        if (onTutorialUpdateRef.current && engineRef.current) {
          const localPlayer = playersRef.current[0];
          if (localPlayer && engineRef.current.getPlayerPosVel) {
            const posVel = engineRef.current.getPlayerPosVel(localPlayer.id);
            if (posVel && posVel.vel) {
              if (!tutorialProgress.current.moved && Math.abs(posVel.vel.x) > 2) {
                tutorialProgress.current.moved = true;
                onTutorialUpdateRef.current({ moved: true });
              }
              if (!tutorialProgress.current.jumped && posVel.vel.y < -5) {
                tutorialProgress.current.jumped = true;
                onTutorialUpdateRef.current({ jumped: true });
              }
            }
          }
        }

        // Emit local player states (Throttled to ~20Hz)
        if (socket && now - lastEmitTime > 50) {
          playersRef.current.forEach((p) => {
            if (p.controllerId === socket.id) {
              const posVel = engineRef.current?.getPlayerPosVel(p.id);
              if (posVel) {
                socket.emit("network_update", {
                  lobbyId: socket.lobbyId || "GLOBAL",
                  data: {
                    playerId: p.id,
                    pos: posVel.pos,
                    vel: posVel.vel,
                    health: p.stats.health,
                    poisonEnd: p.poisonEnd,
                    burnEnd: p.burnEnd,
                    freezeEnd: p.freezeEnd,
                    stunEnd: p.stunEnd,
                    isStuckEnd: p.isStuckEnd,
                    regenEnd: p.regenEnd,
                    hasForceField: p.hasForceField,
                  },
                });
              }
            }
          });
          lastEmitTime = now;
        }
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (engineRef.current) engineRef.current.cleanup();
    };
  }, [gamePhase, level]);

  const handleMobileInput = (action: string, active: boolean) => {
    const localPlayer = playersRef.current.find(p => !socket || p.controllerId === socket.id);
    if (!localPlayer) return;
    
    if (!inputsRef.current[localPlayer.id]) inputsRef.current[localPlayer.id] = {};
    inputsRef.current[localPlayer.id][action] = active;
  };

  return (
    <div id="game-container" className="fixed inset-0 bg-[#05070a] z-0">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* HUD Layer */}
      <div className="absolute inset-0 pointer-events-none p-4 sm:p-8 md:p-12 flex flex-col justify-between z-20">
        <div className="flex justify-between items-start gap-2">
          {players.slice(0, 2).map((p, i) => (
            <div
              key={p.id}
              className={`flex flex-col gap-1 sm:gap-2 w-[48%] max-w-64 md:max-w-none md:w-80 ${i === 1 ? "items-end ml-auto text-right" : ""}`}
            >
              <div
                className="flex justify-between w-full text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]"
                style={{ color: p.color }}
              >
                {i === 0 ? (
                  <>
                    <span className="truncate max-w-[60%]">{p.name}</span>
                    <span className="text-white/60">
                      {Math.round(p.stats.health)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span>{Math.round(p.stats.health)}%</span>
                    <span className="truncate max-w-[60%]">{p.name}</span>
                  </>
                )}
              </div>
              <div className="h-2 sm:h-3 w-full bg-white/5 border border-white/10 relative overflow-hidden rounded-full backdrop-blur-sm">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{
                    width: `${(p.stats.health / (p.stats.maxHealth || 100)) * 100}%`,
                    backgroundColor:
                      p.poisonEnd && Date.now() < p.poisonEnd
                        ? "#84cc16"
                        : p.burnEnd && Date.now() < p.burnEnd
                          ? "#ef4444"
                          : p.freezeEnd && Date.now() < p.freezeEnd
                            ? "#7dd3fc"
                            : p.stunEnd && Date.now() < p.stunEnd
                              ? "#facc15"
                              : p.regenEnd && Date.now() < p.regenEnd
                                ? "#22c55e"
                                : p.color,
                  }}
                  className="h-full transition-all duration-300"
                  style={{ boxShadow: `0 0 15px ${p.color}aa` }}
                />
              </div>
              {/* God Pellets Row */}
              <div
                className={`flex gap-1 md:gap-3 mt-1 overflow-x-auto no-scrollbar max-w-full ${i === 1 ? "flex-row-reverse" : "flex-row"}`}
              >
                {(
                  [
                    "red",
                    "orange",
                    "yellow",
                    "green",
                    "blue",
                    "purple",
                    "pink",
                  ] as const
                ).map((color) => {
                  const count = p.godPellets?.[color] || 0;
                  const hex = {
                    red: "#ef4444",
                    orange: "#f97316",
                    yellow: "#facc15",
                    green: "#22c55e",
                    blue: "#3b82f6",
                    purple: "#d946ef",
                    pink: "#f472b6",
                  }[color];
                  return (
                    <div key={color} className="flex gap-0.5" title={color}>
                      {[...Array(3)].map((_, dotIdx) => (
                        <div
                          key={dotIdx}
                          className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all duration-300 ${dotIdx < count ? "scale-110 shadow-[0_0_8px_currentColor]" : "opacity-20 scale-90"}`}
                          style={{ backgroundColor: hex, color: hex }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-end gap-2">
          {players.slice(2, 4).map((p, i) => (
            <div
              key={p.id}
              className={`flex flex-col gap-1 sm:gap-2 w-[48%] max-w-64 md:max-w-none md:w-80 ${i === 1 ? "items-end ml-auto text-right" : ""}`}
            >
              {/* God Pellets Row */}
              <div
                className={`flex gap-1 md:gap-3 mb-1 overflow-x-auto no-scrollbar max-w-full ${i === 1 ? "flex-row-reverse" : "flex-row"}`}
              >
                {(
                  [
                    "red",
                    "orange",
                    "yellow",
                    "green",
                    "blue",
                    "purple",
                    "pink",
                  ] as const
                ).map((color) => {
                  const count = p.godPellets?.[color] || 0;
                  const hex = {
                    red: "#ef4444",
                    orange: "#f97316",
                    yellow: "#facc15",
                    green: "#22c55e",
                    blue: "#3b82f6",
                    purple: "#d946ef",
                    pink: "#f472b6",
                  }[color];
                  return (
                    <div key={color} className="flex gap-0.5" title={color}>
                      {[...Array(3)].map((_, dotIdx) => (
                        <div
                          key={dotIdx}
                          className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all duration-300 ${dotIdx < count ? "scale-110 shadow-[0_0_8px_currentColor]" : "opacity-20 scale-90"}`}
                          style={{ backgroundColor: hex, color: hex }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="h-2 sm:h-3 w-full bg-white/5 border border-white/10 relative overflow-hidden rounded-full backdrop-blur-sm">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{
                    width: `${(p.stats.health / (p.stats.maxHealth || 100)) * 100}%`,
                    backgroundColor:
                      p.poisonEnd && Date.now() < p.poisonEnd
                        ? "#84cc16"
                        : p.burnEnd && Date.now() < p.burnEnd
                          ? "#ef4444"
                          : p.freezeEnd && Date.now() < p.freezeEnd
                            ? "#7dd3fc"
                            : p.stunEnd && Date.now() < p.stunEnd
                              ? "#facc15"
                              : p.regenEnd && Date.now() < p.regenEnd
                                ? "#22c55e"
                                : p.color,
                  }}
                  className="h-full transition-all duration-300"
                  style={{ boxShadow: `0 0 15px ${p.color}aa` }}
                />
              </div>
              <div
                className="flex justify-between w-full text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]"
                style={{ color: p.color }}
              >
                {i === 0 ? (
                  <>
                    <span className="truncate max-w-[60%]">{p.name}</span>
                    <span className="text-white/60">
                      {Math.round(p.stats.health)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span>{Math.round(p.stats.health)}%</span>
                    <span className="truncate max-w-[60%]">{p.name}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions Overlay */}
      {controlMode === 'pc' ? (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/20 text-[10px] font-black uppercase tracking-[0.4em] pointer-events-none flex gap-4 md:gap-12 bg-black/40 backdrop-blur-md px-6 py-3 md:px-8 md:py-4 border border-white/5 rounded-full text-center xs:whitespace-nowrap">
          <span>P1: WASD+F</span>
          <span>P2: ARROWS+ENT</span>
          <span>P3: GHJY+T</span>
          <span>P4: PL;'+K</span>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none flex items-end justify-between p-4 sm:p-8 md:p-16 z-50">
          <div className="flex gap-2 sm:gap-4 pointer-events-auto">
            <button
               onContextMenu={(e) => e.preventDefault()}
               onMouseDown={() => handleMobileInput('left', true)}
               onMouseUp={() => handleMobileInput('left', false)}
               onMouseLeave={() => handleMobileInput('left', false)}
               onTouchStart={() => handleMobileInput('left', true)}
               onTouchEnd={() => handleMobileInput('left', false)}
               className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center active:bg-white/20 active:scale-95 transition-all text-white/40 active:text-white"
            >
               <ChevronLeft size={32} />
            </button>
            <button
               onContextMenu={(e) => e.preventDefault()}
               onMouseDown={() => handleMobileInput('right', true)}
               onMouseUp={() => handleMobileInput('right', false)}
               onMouseLeave={() => handleMobileInput('right', false)}
               onTouchStart={() => handleMobileInput('right', true)}
               onTouchEnd={() => handleMobileInput('right', false)}
               className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center active:bg-white/20 active:scale-95 transition-all text-white/40 active:text-white"
            >
               <ChevronRight size={32} />
            </button>
          </div>

          <div className="flex gap-2 sm:gap-4 pointer-events-auto">
            <button
               onContextMenu={(e) => e.preventDefault()}
               onMouseDown={() => handleMobileInput('jump', true)}
               onMouseUp={() => handleMobileInput('jump', false)}
               onMouseLeave={() => handleMobileInput('jump', false)}
               onTouchStart={() => handleMobileInput('jump', true)}
               onTouchEnd={() => handleMobileInput('jump', false)}
               className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center active:bg-white/20 active:scale-95 transition-all text-white/40 active:text-white"
            >
               <ChevronUp size={36} />
            </button>
            <button
               onContextMenu={(e) => e.preventDefault()}
               onMouseDown={() => handleMobileInput('fire', true)}
               onMouseUp={() => handleMobileInput('fire', false)}
               onMouseLeave={() => handleMobileInput('fire', false)}
               onTouchStart={() => handleMobileInput('fire', true)}
               onTouchEnd={() => handleMobileInput('fire', false)}
               className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center active:bg-white/40 active:scale-95 transition-all text-cyan-400 active:text-cyan-300"
            >
               <Zap size={36} fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
