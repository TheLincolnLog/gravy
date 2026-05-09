import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { ARCHETYPES, Archetype } from '../constants/archetypes';
import { CubeSilhouette } from './CubeSilhouette';
import { ArchetypeStats } from './ArchetypeStats';
import { Users, Lock, ChevronRight, Hash, Globe, Shield, User } from 'lucide-react';

interface LobbyPlayer {
  id: string;
  controllerId: string;
  name: string;
  color: string;
  hoveredArchetype: string | null;
  lockedArchetype: string | null;
}

interface LobbyData {
  id: string;
  owner: string;           // socket.id of the owner
  players: Record<string, LobbyPlayer>; // keyed by player.id (NOT socket.id)
  status: 'lobby' | 'playing';
}

interface Props {
  onGameStart: (lobby: LobbyData, socket: Socket) => void;
  playerName: string;
}

export const MultiplayerLobby: React.FC<Props> = ({ onGameStart, playerName }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const lobbyRef = useRef<LobbyData | null>(null);

  const [lobbyIdInput, setLobbyIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // myPlayerIds: all player IDs whose controllerId === socket.id
  const [myPlayerIds, setMyPlayerIds] = useState<string[]>([]);
  // activePlayerId: the one we're currently controlling in the UI
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);

  // Keep refs in sync so socket event callbacks always see fresh values
  const myPlayerIdsRef = useRef<string[]>([]);
  const activePlayerIdRef = useRef<string | null>(null);

  const syncMyPlayers = (lobbyData: LobbyData, sock: Socket) => {
    const mine = Object.values(lobbyData.players)
      .filter(p => p.controllerId === sock.id)
      .map(p => p.id);

    myPlayerIdsRef.current = mine;
    setMyPlayerIds(mine);

    // Pick the first unset one as active if we don't have one yet
    if (!activePlayerIdRef.current && mine.length > 0) {
      activePlayerIdRef.current = mine[0];
      setActivePlayerId(mine[0]);
    }
  };

  useEffect(() => {
    const newSocket = io();
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('lobby_created', (data: LobbyData) => {
      lobbyRef.current = data;
      setLobby(data);
      syncMyPlayers(data, newSocket);
      setError(null);
    });

    newSocket.on('lobby_updated', (data: LobbyData) => {
      lobbyRef.current = data;
      setLobby(data);
      syncMyPlayers(data, newSocket);
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

  // Keep activePlayerIdRef in sync with state
  useEffect(() => {
    activePlayerIdRef.current = activePlayerId;
  }, [activePlayerId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createLobby = () => {
    socket?.emit('create_lobby', { name: playerName, isPrivate: false });
  };

  const joinLobby = () => {
    if (!lobbyIdInput.trim()) return;
    socket?.emit('join_lobby', { lobbyId: lobbyIdInput.toUpperCase(), name: playerName });
  };

  const handleHover = (archetypeId: string | null) => {
    const pid = activePlayerIdRef.current;
    const currentLobby = lobbyRef.current;
    if (!pid || !currentLobby) return;
    socket?.emit('hover_archetype', { lobbyId: currentLobby.id, playerId: pid, archetypeId });
  };

  const handleLock = (archetypeId: string) => {
    const pid = activePlayerIdRef.current;
    const currentLobby = lobbyRef.current;
    if (!pid || !currentLobby) return;

    const isTaken = Object.values(currentLobby.players).some(
      p => p.lockedArchetype === archetypeId && p.id !== pid
    );
    if (!isTaken) {
      socket?.emit('lock_archetype', { lobbyId: currentLobby.id, playerId: pid, archetypeId });
    }
  };

  const addLocalPlayer = () => {
    const currentLobby = lobbyRef.current;
    if (!currentLobby) return;
    socket?.emit('add_local_player', { lobbyId: currentLobby.id });
  };

  const startGame = () => {
    const currentLobby = lobbyRef.current;
    if (!currentLobby || socket?.id !== currentLobby.owner) return;
    socket?.emit('start_game', { lobbyId: currentLobby.id });
  };

  // ── Pre-lobby screen ────────────────────────────────────────────────────────

  if (!lobby) {
    return (
      <div className="flex flex-col items-center gap-12 w-full max-w-2xl">
        <h2 className="text-6xl font-black italic uppercase tracking-tighter flex items-center gap-6">
          <Users size={60} /> MULTIPLAYER
        </h2>

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
              <span className="text-[10px] font-black uppercase tracking-widest">Access Protocol</span>
            </div>
            <div className="flex gap-2">
              <input
                value={lobbyIdInput}
                onChange={e => setLobbyIdInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinLobby()}
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
            {error && (
              <span className="absolute -bottom-6 left-0 text-red-500 text-[10px] font-bold uppercase">{error}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby screen ────────────────────────────────────────────────────────────

  const playersInLobby = Object.values(lobby.players) as LobbyPlayer[];
  const myPlayers = playersInLobby.filter(p => myPlayerIds.includes(p.id));
  const allLocked = playersInLobby.length >= 2 && playersInLobby.every(p => p.lockedArchetype);
  const isOwner = socket?.id === lobby.owner;

  return (
    <div className="flex flex-col items-center w-full max-w-7xl px-8 py-12 max-h-screen overflow-y-auto custom-scrollbar">

      {/* Header */}
      <div className="flex justify-between items-center w-full mb-12 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase">System // Lobby</span>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <Shield className="text-cyan-400" /> {lobby.id}
          </h2>
        </div>

        <div className="flex gap-4 flex-wrap justify-end">
          {playersInLobby.map(p => {
            const isMine = myPlayerIds.includes(p.id);
            const isActive = activePlayerId === p.id;
            const lockedArch = ARCHETYPES.find(a => a.id === p.lockedArchetype);
            return (
              <button
                key={p.id}
                onClick={() => isMine && setActivePlayerId(p.id)}
                className={`flex flex-col items-end transition-all px-3 py-2 rounded border-2
                  ${isMine ? 'cursor-pointer hover:border-white/30' : 'opacity-50 cursor-default'}
                  ${isActive ? 'border-white bg-white/5' : 'border-transparent'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{p.name}</span>
                  <div
                    className="w-2 h-2 rotate-45"
                    style={{ backgroundColor: lockedArch?.color ?? p.color ?? '#ffffff' }}
                  />
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase">
                  {p.lockedArchetype ? 'READY' : p.hoveredArchetype ? 'SELECTING...' : 'IDLE'}
                </span>
              </button>
            );
          })}

          {playersInLobby.length < 4 && (
            <button
              onClick={addLocalPlayer}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 border border-dashed border-white/20 transition-all group"
            >
              <User size={14} className="opacity-40 group-hover:opacity-100" />
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">
                + Local
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-local-player switcher */}
      {myPlayers.length > 1 && (
        <div className="mb-12 flex items-center gap-4 bg-white/5 p-4 rounded border border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Selecting As:</span>
          {myPlayers.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePlayerId(p.id)}
              className={`px-4 py-1 text-xs font-black italic uppercase transition-all ${activePlayerId === p.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* No identity warning */}
      {myPlayers.length === 0 && (
        <div className="mb-8 px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest">
          ⚠ Could not identify your player slot. Try rejoining.
        </div>
      )}

      {/* Archetype grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full pb-12">
        {ARCHETYPES.map(arch => {
          const activePlayer = activePlayerId ? lobby.players[activePlayerId] : null;
          const isLockedByActive = activePlayer?.lockedArchetype === arch.id;
          const isLockedByOther = playersInLobby.some(
            p => p.lockedArchetype === arch.id && p.id !== activePlayerId
          );
          const isHoveredByOther = playersInLobby.some(
            p => p.hoveredArchetype === arch.id && p.id !== activePlayerId && !p.lockedArchetype
          );

          return (
            <motion.div
              key={arch.id}
              onMouseEnter={() => handleHover(arch.id)}
              onMouseLeave={() => handleHover(null)}
              onClick={() => !isLockedByOther && handleLock(arch.id)}
              className={`relative group bg-[#111] border-2 transition-all p-6 overflow-hidden
                ${isLockedByOther ? 'opacity-20 cursor-not-allowed grayscale' : 'cursor-pointer'}
                ${isLockedByActive ? 'border-white ring-4 ring-white/10 scale-105 z-10' : 'border-white/5 hover:border-white/40'}
              `}
            >
              {isHoveredByOther && !isLockedByOther && (
                <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center pointer-events-none">
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

              {/* Show which other player has this locked */}
              {isLockedByOther && (() => {
                const locker = playersInLobby.find(p => p.lockedArchetype === arch.id);
                return locker ? (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <span className="text-[9px] font-black uppercase opacity-60">{locker.name}</span>
                  </div>
                ) : null;
              })()}
            </motion.div>
          );
        })}
      </div>

      {/* Bottom controls */}
      <div className="mt-4 flex flex-col items-center gap-6">
        {isOwner ? (
          <>
            <button
              onClick={startGame}
              disabled={!allLocked}
              className={`px-24 py-8 -skew-x-12 font-black text-4xl italic uppercase transition-all shadow-2xl
                ${allLocked
                  ? 'bg-white text-black hover:scale-110 cursor-pointer'
                  : 'bg-white/10 text-white/20 cursor-not-allowed'}
              `}
            >
              {allLocked ? 'Initialize Protocol' : 'Awaiting Squad Lock'}
            </button>
            {!allLocked && (
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 animate-pulse">
                {playersInLobby.filter(p => !p.lockedArchetype).length} player(s) still selecting
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            <span className="text-[10px] font-black uppercase opacity-40 tracking-[0.5em] animate-pulse">
              Waiting for Host Activation
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
