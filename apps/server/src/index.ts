import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  DEFAULT_RULES,
  LobbyState,
  Player,
  PlayerAction,
  applyAction,
  chooseBotAction,
  createInitialLobby,
  fillBots,
  getPublicState,
  replaceDisconnectedWithBot,
  startRound
} from "@schafkopf/shared";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*"
  }
});

const rooms = new Map<string, LobbyState>();
const playerToRoom = new Map<string, string>();

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, rules: DEFAULT_RULES });
});

io.on("connection", (socket) => {
  socket.on("room:create", ({ playerName }: { playerName: string }) => {
    const roomCode = generateRoomCode();
    const lobby = createInitialLobby(socket.id, roomCode, sanitizeName(playerName));
    rooms.set(roomCode, lobby);
    playerToRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    emitState(roomCode);
  });

  socket.on("room:join", ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const lobby = rooms.get(roomCode.toUpperCase());
    if (!lobby || lobby.players.length >= 4) {
      socket.emit("room:error", { message: "Raum nicht gefunden oder bereits voll." });
      return;
    }
    const player: Player = {
      id: socket.id,
      name: sanitizeName(playerName),
      isBot: false,
      connected: true,
      seat: lobby.players.length
    };
    lobby.players.push(player);
    lobby.matchScores[player.id] = 0;
    lobby.round.hands[player.id] = [];
    lobby.round.scores[player.id] = 0;
    rooms.set(lobby.roomCode, lobby);
    playerToRoom.set(socket.id, lobby.roomCode);
    socket.join(lobby.roomCode);
    emitState(lobby.roomCode);
  });

  socket.on("room:update-config", ({ config }: { config: LobbyState["config"] }) => {
    const roomCode = playerToRoom.get(socket.id);
    if (!roomCode) {
      return;
    }
    const lobby = rooms.get(roomCode);
    if (!lobby || lobby.hostId !== socket.id || lobby.round.phase !== "waiting") {
      return;
    }
    lobby.config = config;
    rooms.set(roomCode, lobby);
    emitState(roomCode);
  });

  socket.on("room:start", () => {
    const roomCode = playerToRoom.get(socket.id);
    if (!roomCode) {
      return;
    }
    const lobby = rooms.get(roomCode);
    if (!lobby || lobby.hostId !== socket.id) {
      return;
    }
    rooms.set(roomCode, startRound(fillBots(lobby)));
    emitState(roomCode);
    scheduleBots(roomCode);
  });

  socket.on("room:action", ({ action }: { action: PlayerAction }) => {
    const roomCode = playerToRoom.get(socket.id);
    if (!roomCode) {
      return;
    }
    processAction(roomCode, socket.id, action);
  });

  socket.on("disconnect", () => {
    const roomCode = playerToRoom.get(socket.id);
    if (!roomCode) {
      return;
    }
    const lobby = rooms.get(roomCode);
    if (!lobby) {
      return;
    }
    if (lobby.round.phase === "waiting") {
      lobby.players = lobby.players.filter((player) => player.id !== socket.id);
      if (lobby.hostId === socket.id && lobby.players[0]) {
        lobby.hostId = lobby.players[0].id;
      }
      if (lobby.players.length === 0) {
        rooms.delete(roomCode);
      } else {
        rooms.set(roomCode, lobby);
        emitState(roomCode);
      }
    } else {
      rooms.set(roomCode, replaceDisconnectedWithBot(lobby, socket.id, lobby.config.botStrength));
      emitState(roomCode);
      scheduleBots(roomCode);
    }
    playerToRoom.delete(socket.id);
  });
});

function processAction(roomCode: string, playerId: string, action: PlayerAction) {
  const lobby = rooms.get(roomCode);
  if (!lobby) {
    return;
  }
  const updated = applyAction(lobby, playerId, action);
  rooms.set(roomCode, updated);
  emitState(roomCode);
  scheduleBots(roomCode);
}

function scheduleBots(roomCode: string) {
  const lobby = rooms.get(roomCode);
  if (!lobby || !lobby.round.turnPlayerId) {
    return;
  }
  const currentPlayer = lobby.players.find((player) => player.id === lobby.round.turnPlayerId);
  if (!currentPlayer?.isBot) {
    return;
  }
  const strength = currentPlayer.botStrength ?? lobby.config.botStrength;
  setTimeout(() => {
    const latest = rooms.get(roomCode);
    if (!latest || latest.round.turnPlayerId !== currentPlayer.id) {
      return;
    }
    const action = chooseBotAction(latest, currentPlayer.id, strength);
    if (action) {
      processAction(roomCode, currentPlayer.id, action);
    }
  }, 700);
}

function emitState(roomCode: string) {
  const lobby = rooms.get(roomCode);
  if (!lobby) {
    return;
  }
  lobby.players.forEach((player) => {
    io.to(player.id).emit("room:state", getPublicState(lobby, player.id));
  });
}

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function sanitizeName(name: string) {
  const trimmed = name.trim().slice(0, 24);
  return trimmed.length ? trimmed : "Spieler";
}

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, () => {
  console.log(`Schafkopf server listening on ${port}`);
});
