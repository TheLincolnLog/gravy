import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT || 3000;

  // Game State
  const rooms: Record<string, {
    id: string;
    players: Record<string, any>;
    level: number;
    gameState: 'lobby' | 'playing';
  }> = {};

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', () => {
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      rooms[roomId] = {
        id: roomId,
        players: {},
        level: 1,
        gameState: 'lobby'
      };
      socket.join(roomId);
      socket.emit('room-created', roomId);
    });

    socket.on('join-room', (roomId) => {
      if (rooms[roomId]) {
        if (Object.keys(rooms[roomId].players).length < 5) {
          socket.join(roomId);
          socket.emit('room-joined', roomId);
        } else {
          socket.emit('error', 'Room is full');
        }
      } else {
        socket.emit('error', 'Room not found');
      }
    });

    socket.on('player-ready', ({ roomId, character }) => {
      if (rooms[roomId]) {
        rooms[roomId].players[socket.id] = {
          id: socket.id,
          character,
          ready: true,
          x: rooms[roomId].level === 1 ? 50 : 50, // Should use level spawn
          y: 500,
          vx: 0,
          vy: 0,
          gravityScale: 1,
          isPhasing: false,
          portals: [],
          color: character === 'flip' ? '#FF4444' : 
                 character === 'mass' ? '#44FF44' : 
                 character === 'time' ? '#4444FF' : 
                 character === 'portal' ? '#FFFF44' : '#FF44FF'
        };
        io.to(roomId).emit('room-update', rooms[roomId]);
      }
    });

    socket.on('start-game', (roomId) => {
        if (rooms[roomId]) {
            const levelData = [
              { x: 50, y: 500 }, // Level 1 spawn
              { x: 50, y: 500 }, // Level 2 spawn
              { x: 50, y: 500 }  // Level 3 spawn
            ];
            
            Object.values(rooms[roomId].players).forEach((p: any) => {
                p.x = levelData[rooms[roomId].level - 1].x;
                p.y = levelData[rooms[roomId].level - 1].y;
            });

            rooms[roomId].gameState = 'playing';
            io.to(roomId).emit('game-started', rooms[roomId]);
        }
    });

    socket.on('player-update', ({ roomId, data }) => {
      if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        rooms[roomId].players[socket.id] = {
            ...rooms[roomId].players[socket.id],
            ...data
        };
        socket.to(roomId).emit('player-moved', { id: socket.id, ...data });
      }
    });

    socket.on('ability-use', ({ roomId, ability, data }) => {
        io.to(roomId).emit('ability-triggered', { sender: socket.id, ability, data });
    });

    socket.on('level-complete', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].level++;
            io.to(roomId).emit('next-level', rooms[roomId].level);
        }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const roomId in rooms) {
        if (rooms[roomId].players[socket.id]) {
          delete rooms[roomId].players[socket.id];
          if (Object.keys(rooms[roomId].players).length === 0) {
            delete rooms[roomId];
          } else {
            io.to(roomId).emit('player-left', socket.id);
            io.to(roomId).emit('room-update', rooms[roomId]);
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
