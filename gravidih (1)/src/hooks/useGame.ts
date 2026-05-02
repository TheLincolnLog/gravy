import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, CHARACTERS, Platform, LevelData } from '../types';
import { LEVELS } from '../game/levels';
import { applyPhysics, SPEED, JUMP_FORCE } from '../game/engine';

export function useGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gameState, setGameState] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [levelIndex, setLevelIndex] = useState(0);
  const [myId, setMyId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LevelData>(JSON.parse(JSON.stringify(LEVELS[0])));

  const playersRef = useRef<Record<string, Player>>({});
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const s = io();
    setSocket(s);
    
    s.on('connect', () => setMyId(s.id!));
    
    s.on('room-created', (id) => {
      setRoomId(id);
      setGameState('lobby');
    });

    s.on('room-joined', (id) => {
      setRoomId(id);
      setGameState('lobby');
    });

    s.on('room-update', (data) => {
        setPlayers(data.players);
        playersRef.current = data.players;
    });

    s.on('game-started', (data) => {
        setPlayers(data.players);
        playersRef.current = data.players;
        setLevelIndex(data.level - 1);
        setCurrentLevel(JSON.parse(JSON.stringify(LEVELS[data.level - 1])));
        setGameState('playing');
    });

    s.on('player-moved', (data) => {
        if (playersRef.current[data.id]) {
            playersRef.current[data.id] = { ...playersRef.current[data.id], ...data };
            setPlayers({ ...playersRef.current });
        }
    });

    s.on('ability-triggered', ({ sender, ability, data }) => {
        // Handle global ability effects
        if (ability === 'TIME') {
            // Slow down logic handled in loop
        }
    });

    s.on('next-level', (idx) => {
        setLevelIndex(idx - 1);
        setCurrentLevel(JSON.parse(JSON.stringify(LEVELS[idx - 1])));
        // Reset player positions
        if (playersRef.current[s.id!]) {
            playersRef.current[s.id!].x = LEVELS[idx - 1].spawn.x;
            playersRef.current[s.id!].y = LEVELS[idx - 1].spawn.y;
        }
    });

    s.on('error', (msg) => setError(msg));

    return () => { s.disconnect(); };
  }, []);

  const createRoom = () => socket?.emit('create-room');
  const joinRoom = (id: string) => socket?.emit('join-room', id);
  const chooseCharacter = (id: string, char: string) => socket?.emit('player-ready', { roomId: id, character: char });
  const startGame = () => socket?.emit('start-game', roomId);

  useEffect(() => {
    if (gameState !== 'playing' || !myId) return;

    let frameId: number;
    const loop = () => {
        const me = playersRef.current[myId];
        if (me) {
            // Input
            if (keysRef.current['ArrowLeft'] || keysRef.current['a']) me.vx = -SPEED;
            else if (keysRef.current['ArrowRight'] || keysRef.current['d']) me.vx = SPEED;
            else me.vx = 0;

            const onGround = applyPhysics(me, currentLevel, playersRef.current, true);

            if ((keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current[' ']) && onGround) {
                me.vy = JUMP_FORCE * me.gravityScale;
            }

            // Power logic
            if (keysRef.current['q']) {
                // One-time triggers
                keysRef.current['q'] = false; // Prevent spam
                handleAbility(me);
            }

            // Button trigger check
            for (const plat of currentLevel.platforms) {
                if (plat.type === 'button') {
                    const isOver = me.x < plat.x + plat.width && me.x + 30 > plat.x && me.y < plat.y + plat.height && me.y + 30 > plat.y;
                    if (isOver && !plat.isOpen) {
                        plat.isOpen = true;
                        // Signal all doors
                        currentLevel.platforms.forEach(d => {
                            if (d.type === 'door' && d.id === plat.triggerId) {
                                d.isOpen = true;
                            }
                        });
                    }
                }
                if (plat.type === 'goal') {
                    const isOver = me.x < plat.x + plat.width && me.x + 30 > plat.x && me.y < plat.y + plat.height && me.y + 30 > plat.y;
                    if (isOver) {
                        socket?.emit('level-complete', roomId);
                    }
                }
            }

            socket?.emit('player-update', { roomId, data: { x: me.x, y: me.y, vx: me.vx, vy: me.vy, gravityScale: me.gravityScale, isPhasing: me.isPhasing } });
        }
        
        setPlayers({ ...playersRef.current });
        frameId = requestAnimationFrame(loop);
    };

    const handleAbility = (me: Player) => {
        const char = CHARACTERS.find(c => c.id === me.character);
        if (!char) return;

        if (char.power === 'FLIP') {
            me.gravityScale *= -1;
        } else if (char.power === 'MASS') {
            me.gravityScale = me.gravityScale === 2 ? 1 : 2;
        } else if (char.power === 'PHASE') {
            me.isPhasing = !me.isPhasing;
        }
        // Portals and Time involve more logic...
        socket?.emit('ability-use', { roomId, ability: char.power });
    };

    const kd = (e: KeyboardEvent) => keysRef.current[e.key] = true;
    const ku = (e: KeyboardEvent) => keysRef.current[e.key] = false;

    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    frameId = requestAnimationFrame(loop);

    return () => {
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        cancelAnimationFrame(frameId);
    };
  }, [gameState, myId, currentLevel, roomId, socket]);

  return {
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
  };
}
