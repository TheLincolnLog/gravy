import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { nanoid } from "nanoid";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  // Selection Lobby State
  // Map of lobbyId -> { players: { socketId: { id, name, archetype, hoveredArchetype, isLocked } }, private: boolean }
  const lobbies = new Map();

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("create_lobby", ({ name, isPrivate }) => {
      const lobbyId = nanoid(6).toUpperCase();
      socket.join(lobbyId);
      
      lobbies.set(lobbyId, {
        id: lobbyId,
        owner: socket.id,
        private: isPrivate,
        players: {
          [socket.id]: {
            id: socket.id,
            name: name || "PLAYER 1",
            hoveredArchetype: null,
            lockedArchetype: null,
            color: "#22d3ee"
          }
        },
        status: "lobby" // lobby, playing
      });

      socket.emit("lobby_created", lobbies.get(lobbyId));
    });

    socket.on("join_lobby", ({ lobbyId, name }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        return socket.emit("error", "Lobby not found");
      }

      if (Object.keys(lobby.players).length >= 4) {
        return socket.emit("error", "Lobby full");
      }

      socket.join(lobbyId);
      const colors = ['#22d3ee', '#f43f5e', '#a855f7', '#10b981'];
      const playerIdx = Object.keys(lobby.players).length;

      const playerId = socket.id;
      lobby.players[playerId] = {
        id: playerId,
        controllerId: socket.id,
        name: name || `PLAYER ${playerIdx + 1}`,
        hoveredArchetype: null,
        lockedArchetype: null,
        color: colors[playerIdx] || "#ffffff"
      };

      io.to(lobbyId).emit("lobby_updated", lobby);
    });

    socket.on("add_local_player", ({ lobbyId, name }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;

      if (Object.keys(lobby.players).length >= 4) {
        return socket.emit("error", "Lobby full");
      }

      const colors = ['#22d3ee', '#f43f5e', '#a855f7', '#10b981'];
      const playerIdx = Object.keys(lobby.players).length;
      const playerId = `local_${socket.id}_${playerIdx}`;

      lobby.players[playerId] = {
        id: playerId,
        controllerId: socket.id,
        name: name || `GUEST ${playerIdx + 1}`,
        hoveredArchetype: null,
        lockedArchetype: null,
        color: colors[playerIdx] || "#ffffff"
      };

      io.to(lobbyId).emit("lobby_updated", lobby);
    });

    socket.on("hover_archetype", ({ lobbyId, playerId, archetypeId }) => {
      const lobby = lobbies.get(lobbyId);
      const pid = playerId || socket.id;
      if (!lobby || !lobby.players[pid]) return;
      if (lobby.players[pid].controllerId !== socket.id) return;

      lobby.players[pid].hoveredArchetype = archetypeId;
      io.to(lobbyId).emit("lobby_updated", lobby);
    });

    socket.on("lock_archetype", ({ lobbyId, playerId, archetypeId }) => {
      const lobby = lobbies.get(lobbyId);
      const pid = playerId || socket.id;
      if (!lobby || !lobby.players[pid]) return;
      if (lobby.players[pid].controllerId !== socket.id) return;

      // Check if already locked by someone else
      const isTaken = Object.values(lobby.players).some(
        p => (p as any).lockedArchetype === archetypeId && (p as any).id !== pid
      );

      if (!isTaken) {
        lobby.players[pid].lockedArchetype = archetypeId;
        io.to(lobbyId).emit("lobby_updated", lobby);
      }
    });

    socket.on("start_game", ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.owner !== socket.id) return;

      lobby.status = "playing";
      io.to(lobbyId).emit("game_started", lobby);
    });

    socket.on("network_update", ({ lobbyId, data }) => {
      // Broadcast to everyone else in the lobby
      socket.to(lobbyId).emit("network_update", data);
    });

    socket.on("disconnect", () => {
      lobbies.forEach((lobby, lobbyId) => {
        if (lobby.players[socket.id]) {
          delete lobby.players[socket.id];
          if (Object.keys(lobby.players).length === 0) {
            lobbies.delete(lobbyId);
          } else {
            if (lobby.owner === socket.id) {
              lobby.owner = Object.keys(lobby.players)[0];
            }
            io.to(lobbyId).emit("lobby_updated", lobby);
          }
        }
      });
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
