import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { ARCHETYPES, Archetype } from '../constants/archetypes';
import { CubeSilhouette } from './CubeSilhouette';
import { ArchetypeStats } from './ArchetypeStats';
import { Users, Lock, ChevronRight, Hash, Globe, Shield, User } from 'lucide-react';

interface Player {
  id: string;
  controllerId: string;
  name: string;
  color: string;
  hoveredArchetype: string | null;
  lockedArchetype: string | null;
}

interface LobbyData {
  id: string;
  owner: string;
  players: Record<string, Player>;
  status: 'lobby' | 'playing';
}

interface Props {
  onGameStart: (lobby: LobbyData, socket: Socket) => void;
  playerName: string;
}

export const MultiplayerLobby: React.FC<Props> = ({ onGameStart, playerName }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [lobbyIdInput, setLobbyIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('lobby_created', (data: LobbyData) => {
      (newSocket as any).lobbyId = data.id;
      setLobby(data);
      // Wait for lobby data to find our specific player ID
      const me = Object.values(data.players).find(p => p.controllerId === newSocket.id);
      if (me) setActivePlayerId(me.id);
      setError(null);
    });

    newSocket.on('lobby_updated', (data: LobbyData) => {
      (newSocket as any).lobbyId = data.id;
      setLobby(data);
      // If we don't have an active player selected yet, pick the first one we control
      if (!activePlayerId) {
        const myFirst = Object.values(data.players).find(p => p.controllerId === newSocket.id);
        if (myFirst) setActivePlayerId(myFirst.id);
      }
    });

    newSocket.on('game_started', (data: LobbyData) => {
      onGameStart(data, newSocket);
    });

    newSocket.on('error', (msg: string) => {
      setError(msg);
    });

    return () => {
      newSocket.close();
    };
  }, [onGameStart]);

  const createLobby = () => {
    socket?.emit('create_lobby', { name: playerName, isPrivate: false });
  };

  const joinLobby = () => {
    if (!lobbyIdInput) return;
    socket?.emit('join_lobby', { lobbyId: lobbyIdInput.toUpperCase(), name: playerName });
  };

  const handleHover = (archetypeId: string | null) => {
    if (!activePlayerId) return;
    socket?.emit('hover_archetype', { lobbyId: lobby?.id, playerId: activePlayerId, archetypeId });
  };

  const handleLock = (archetypeId: string) => {
    if (!activePlayerId) return;
    
    // Check if taken
    const isTaken = Object.values(lobby?.players || {}).some(
      (p: Player) => p.lockedArchetype === archetypeId && p.id !== activePlayerId
    );

    if (!isTaken) {
      socket?.emit('lock_archetype', { lobbyId: lobby?.id, playerId: activePlayerId, archetypeId });
    }
  };

  const addLocalPlayer = () => {
    socket?.emit('add_local_player', { lobbyId: lobby?.id });
  };

  const startGame = () => {
    if (lobby?.owner === socket?.id) {
      socket?.emit('start_game', { lobbyId: lobby.id });
    }
  };

  if (!lobby) {
    return (
      <div className="flex flex-col items-center gap-12 w-full max-w-2xl">
        <h2 className="text-6xl font-black italic uppercase tracking-tighter flex items-center gap-6"><Users size={60} /> MULTIPLAYER</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <button 
            onClick={createLobby}
            className="group relative h-48 bg-white text-black p-8 -skew-x-12 overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <div className="flex flex-col items-start gap-2 h-full justify-center">
                <Globe className="mb-2" />
                <span className="text-3xl font-black italic uppercase leading-none">Create Hub</span>
                <span className="text-[10px] font-bold opacity-60 tracking-widest">Public Lobby Instance</span>
            </div>
          </button>

          <div className="relative group h-48 bg-white/5 border-2 border-white/10 p-8 -skew-x-12 flex flex-col justify-center gap-4">
             <div className="flex items-center gap-4 text-white/40">
                <Hash size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">ENTER CODE</span>
             </div>
             <div className="flex gap-2">
                <input 
                  value={lobbyIdInput}
                  onChange={e => setLobbyIdInput(e.target.value.toUpperCase())}
                  placeholder="LOBBY ID"
                  className="bg-transparent border-b-2 border-white/20 focus:border-white outline-none font-black text-2xl uppercase italic w-full"
                />
                <button 
                  onClick={joinLobby}
                  className="bg-white text-black px-6 py-2 font-black italic hover:bg-zinc-200 transition-colors"
                >
                  JOIN
                </button>
             </div>
             {error && <span className="absolute -bottom-6 left-0 text-red-500 text-[10px] font-bold uppercase">{error}</span>}
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = lobby.players[socket?.id || ''];
  const playersInLobby = Object.values(lobby.players) as Player[];

  return (
    <div className="flex flex-col items-center w-full max-w-7xl px-8 py-12 max-h-screen overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center w-full mb-12 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <Shield className="text-cyan-400" /> ARENA: {lobby.id}
          </h2>
        </div>

        <div className="flex gap-4">
          {playersInLobby.map((p: Player) => (
            <button 
              key={p.id} 
              onClick={() => p.controllerId === socket?.id && setActivePlayerId(p.id)}
              className={`flex flex-col items-end transition-all px-3 py-2 rounded border-2
                ${p.controllerId === socket?.id ? 'cursor-pointer hover:border-white/20' : 'opacity-50'}
                ${activePlayerId === p.id ? 'border-white bg-white/5' : 'border-transparent'}
              `}
            >
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{p.name}</span>
                    <div className="w-2 h-2 rotate-45" style={{ backgroundColor: p.color }} />
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase">
                    {p.lockedArchetype ? 'READY' : p.hoveredArchetype ? 'SELECTING...' : 'IDLE'}
                </span>
            </button>
          ))}
          {playersInLobby.length < 4 && (
             <button 
                onClick={addLocalPlayer}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 border border-dashed border-white/20 transition-all group"
             >
                <User size={14} className="opacity-40 group-hover:opacity-100" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">+ Local</span>
             </button>
          )}
        </div>
      </div>

      {playersInLobby.filter(p => p.controllerId === socket?.id).length > 1 && (
        <div className="mb-12 flex items-center gap-4 bg-white/5 p-4 rounded border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Active Selector:</span>
            {playersInLobby.filter(p => p.controllerId === socket?.id).map(p => (
                <button 
                  key={p.id}
                  onClick={() => setActivePlayerId(p.id)}
                  className={`px-4 py-1 text-xs font-black italic uppercase italic transition-all ${activePlayerId === p.id ? 'bg-white text-black' : 'text-white/40'}`}
                >
                    {p.name}
                </button>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full pb-12">
        {ARCHETYPES.map(arch => {
          const activePlayer = lobby.players[activePlayerId || ''];
          const isLockedByActive = activePlayer?.lockedArchetype === arch.id;
          const isLockedByOther = playersInLobby.some((p: Player) => p.lockedArchetype === arch.id && p.id !== activePlayerId);
          const isHoveredByOther = playersInLobby.some((p: Player) => p.hoveredArchetype === arch.id && p.id !== activePlayerId && !p.lockedArchetype);
          
          return (
            <motion.div 
              key={arch.id}
              onMouseEnter={() => handleHover(arch.id)}
              onMouseLeave={() => handleHover(null)}
              onClick={() => !isLockedByOther && handleLock(arch.id)}
              className={`relative group bg-[#111] border-2 transition-all p-6 overflow-hidden cursor-pointer
                ${isLockedByActive ? 'border-white ring-4 ring-white/10 scale-105 z-10' : 'border-white/5 hover:border-white/40'}
                ${isLockedByOther ? 'opacity-20 cursor-not-allowed grayscale' : ''}
              `}
            >
              {/* Other Player Hover Indicator */}
              {isHoveredByOther && !isLockedByOther && (
                   <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Occupied</span>
                   </div>
              )}

              <div className="relative z-10 flex flex-col items-center">
                 <CubeSilhouette 
                    color={arch.color} 
                    glow={!isLockedByOther} 
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

                 {/* Stats Integration */}
                 <div className="mt-6 border-t border-white/5 pt-6 w-full flex flex-col items-center">
                    <ArchetypeStats stats={arch.stats} color={arch.color} />
                    <div className="mt-4 text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
                        {arch.passive}
                    </div>
                 </div>
              </div>

              {isLockedByActive && (
                  <div className="absolute top-4 right-4 text-white">
                      <Lock size={20} />
                  </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6">
        {lobby.owner === socket?.id ? (
          <button 
            onClick={startGame}
            disabled={!playersInLobby.every((p: Player) => p.lockedArchetype)}
            className={`px-24 py-8 -skew-x-12 font-black text-4xl italic uppercase transition-all shadow-2xl
                ${playersInLobby.every((p: Player) => p.lockedArchetype) 
                    ? 'bg-white text-black hover:scale-110' 
                    : 'bg-white/10 text-white/20 cursor-not-allowed'}
            `}
          >
            {playersInLobby.every((p: Player) => p.lockedArchetype) ? 'START BATTLE' : 'AWAITING SELECTIONS'}
          </button>
        ) : (
          <div className="text-center">
            <span className="text-[10px] font-black uppercase opacity-40 tracking-[0.5em] animate-pulse">Waiting for Host</span>
          </div>
        )}
      </div>
    </div>
  );
};
