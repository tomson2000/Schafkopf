import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Card,
  Contract,
  PlayerAction,
  PublicPlayerView,
  PublicState,
  Suit
} from "@schafkopf/shared";
import cardBg from "./assets/card-bg.svg";
import cardBack from "./assets/card-back.svg";
import suitEichel from "./assets/suit-eichel.svg";
import suitGras from "./assets/suit-gras.svg";
import suitHerz from "./assets/suit-herz.svg";
import suitSchelln from "./assets/suit-schelln.svg";
import { CardSvg } from "./components/CardSvg";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");
const socket: Socket = io(SERVER_URL, { autoConnect: true });

const allContracts: Contract[] = [
  { kind: "pass" },
  { kind: "rufspiel", calledAceSuit: "eichel" },
  { kind: "rufspiel", calledAceSuit: "gras" },
  { kind: "rufspiel", calledAceSuit: "schelln" },
  { kind: "wenz" },
  { kind: "geier" },
  { kind: "solo", suit: "eichel" },
  { kind: "solo", suit: "gras" },
  { kind: "solo", suit: "herz" },
  { kind: "solo", suit: "schelln" },
  { kind: "farbwenz", suit: "eichel" },
  { kind: "farbwenz", suit: "gras" },
  { kind: "farbwenz", suit: "herz" },
  { kind: "farbwenz", suit: "schelln" },
  { kind: "farbsolo", suit: "eichel" },
  { kind: "farbsolo", suit: "gras" },
  { kind: "farbsolo", suit: "herz" },
  { kind: "farbsolo", suit: "schelln" },
  { kind: "ramsch" }
];

const suitIcons: Record<Suit, string> = {
  eichel: suitEichel,
  gras: suitGras,
  herz: suitHerz,
  schelln: suitSchelln
};

const suitNames: Record<Suit, string> = {
  eichel: "Eichel",
  gras: "Gras",
  herz: "Herz",
  schelln: "Schelln"
};

export function App() {
  const [name, setName] = useState("Thomas");
  const [joinCode, setJoinCode] = useState("");
  const [state, setState] = useState<PublicState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on("room:state", (next: PublicState) => {
      setState(next);
      setError("");
    });
    socket.on("room:error", ({ message }: { message: string }) => {
      setError(message);
    });
    return () => {
      socket.off("room:state");
      socket.off("room:error");
    };
  }, []);

  const self = state?.players.find((player) => player.id === state.selfId);
  const isHost = state?.hostId === state?.selfId;
  const isTurn = state?.round.turnPlayerId === state?.selfId;

  const availableBidOptions = useMemo(() => {
    if (!state) {
      return [];
    }
    return allContracts.filter((contract) => {
      if (contract.kind === "rufspiel") {
        return state.config.rules.allowRufspiel;
      }
      if (contract.kind === "wenz") {
        return state.config.rules.allowWenz;
      }
      if (contract.kind === "geier") {
        return state.config.rules.allowGeier;
      }
      if (contract.kind === "solo") {
        return state.config.rules.allowSolo;
      }
      if (contract.kind === "farbsolo") {
        return state.config.rules.allowFarbsolo;
      }
      if (contract.kind === "farbwenz") {
        return state.config.rules.allowFarbwenz;
      }
      if (contract.kind === "ramsch") {
        return state.config.rules.allowRamsch;
      }
      return true;
    });
  }, [state]);

  const actions = {
    createRoom: () => socket.emit("room:create", { playerName: name }),
    joinRoom: () => socket.emit("room:join", { roomCode: joinCode, playerName: name }),
    updateConfig: (config: PublicState["config"]) => socket.emit("room:update-config", { config }),
    startRoom: () => socket.emit("room:start"),
    sendAction: (action: PlayerAction) => socket.emit("room:action", { action })
  };

  if (!state) {
    return (
      <main className="landing">
        <div className="hero">
          <p className="eyebrow">Echtzeit-Schafkopf auf Docker</p>
          <h1>Schafkopf Online</h1>
          <p className="subline">Lobby, WebSocket-Spieltisch, konfigurierbare Varianten und Bots als Ersatzspieler.</p>
        </div>
        <section className="panel auth">
          <label>
            Dein Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} />
          </label>
          <div className="auth-actions">
            <button onClick={actions.createRoom}>Raum erstellen</button>
            <input
              placeholder="Raumcode"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              maxLength={4}
            />
            <button className="secondary" onClick={actions.joinRoom}>
              Beitreten
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    );
  }

  const hand = self?.hand ?? [];
  const top = seatAtOffset(state.players, self?.seat ?? 0, 2);
  const left = seatAtOffset(state.players, self?.seat ?? 0, 3);
  const right = seatAtOffset(state.players, self?.seat ?? 0, 1);
  const lastCompletedTrick = state.round.completedTricks[state.round.completedTricks.length - 1];
  const recentWinnerId = state.round.currentTrick.cards.length === 0 ? lastCompletedTrick?.winnerId : undefined;
  const trickNumber = state.round.completedTricks.length + (state.round.currentTrick.cards.length > 0 ? 1 : 0);

  return (
    <main className="table-page">
      <aside className="sidebar panel">
        <div className="room-head">
          <div>
            <p className="eyebrow">Raum</p>
            <h2>{state.roomCode}</h2>
          </div>
          <div className="status-chip">{phaseLabel(state.round.phase)}</div>
        </div>
        <p className="contract-label">
          {state.round.contract ? `Spiel: ${formatContract(state.round.contract)}` : "Noch kein Spiel angesagt"}
        </p>
        <div className="score-grid">
          {state.players.map((player) => (
            <div key={player.id} className={`score-card ${recentWinnerId === player.id ? "winner" : ""}`}>
              <div className="score-card-head">
                <strong>
                  {player.name}
                  {recentWinnerId === player.id ? <span className="winner-badge">Letzter Stich</span> : null}
                </strong>
                <span className={`player-kind ${player.isBot ? "bot" : "human"}`}>{player.isBot ? "Bot" : "Mensch"}</span>
              </div>
              <div className="score-metrics">
                <div className="score-pill round">
                  <span className="label">Runde</span>
                  <strong>{state.round.scores[player.id] ?? 0}</strong>
                  <span className="unit">Augen</span>
                </div>
                <div className="score-pill total">
                  <span className="label">Gesamt</span>
                  <strong>{Math.round(state.matchScores[player.id] ?? 0)}</strong>
                  <span className="unit">Punkte</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {lastCompletedTrick ? (
          <div className="last-trick panel inset-panel">
            <div className="section-head">
              <h3>Letzter Stich</h3>
              <span>{state.players.find((player) => player.id === lastCompletedTrick.winnerId)?.name ?? "Unbekannt"}</span>
            </div>
            <div className="last-trick-cards">
              {lastCompletedTrick.cards.map((entry) => (
                <div key={`${entry.playerId}-${entry.card.id}-last`} className="last-trick-entry">
                  <CardFace card={entry.card} />
                  <span>{state.players.find((player) => player.id === entry.playerId)?.name ?? "Spieler"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {isHost && state.round.phase === "waiting" ? (
          <ConfigPanel state={state} onChange={actions.updateConfig} onStart={actions.startRoom} />
        ) : null}
        {state.round.result ? <div className="result-box">{state.round.result.summary}</div> : null}
      </aside>

      <section className="table">
        <div className="corner-brass top-left" />
        <div className="corner-brass top-right" />
        <div className="corner-brass bottom-left" />
        <div className="corner-brass bottom-right" />
        <div className="frame-rivet r1" />
        <div className="frame-rivet r2" />
        <div className="frame-rivet r3" />
        <div className="frame-rivet r4" />
        <Seat player={top} position="top" active={state.round.turnPlayerId === top?.id} winner={recentWinnerId === top?.id} />
        <Seat player={left} position="left" active={state.round.turnPlayerId === left?.id} winner={recentWinnerId === left?.id} />
        <Seat player={right} position="right" active={state.round.turnPlayerId === right?.id} winner={recentWinnerId === right?.id} />

        <div className="center-stage">
          <div className="felt-ring" />
          <div className={`phase-banner phase-${state.round.phase}`}>
            <span>{phaseLabel(state.round.phase)}</span>
            <strong>{state.round.contract ? formatContract(state.round.contract) : "Warten auf Spielstart"}</strong>
          </div>
          <div className="trick-counter">Stich {trickNumber}/8</div>
          <div className="trick-grid">
            {state.round.currentTrick.cards.map((entry, index) => (
              <div
                key={`${entry.playerId}-${entry.card.id}`}
                className={`trick-card ${state.round.currentTrick.cards.length === 4 ? "resolving" : ""} ${trickPositionClass(
                  state.players,
                  self?.seat ?? 0,
                  entry.playerId
                )}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CardFace card={entry.card} />
                <span className="trick-player">{state.players.find((player) => player.id === entry.playerId)?.name ?? "Spieler"}</span>
              </div>
            ))}
          </div>
          {state.round.phase === "bidding" && isTurn ? (
            <div className="action-panel">
              <h3>Spiel ansagen</h3>
              <div className="action-grid">
                {availableBidOptions.map((contract) => (
                  <button key={formatContract(contract)} onClick={() => actions.sendAction({ type: "bid", contract })}>
                    {formatContract(contract)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {state.round.phase === "doubling" && isTurn ? (
            <div className="action-panel">
              <h3>Ansagen</h3>
              <div className="action-grid compact">
                {["pass", "kontra", "retour", "stoss", "spritze"].map((declaration) => (
                  <button
                    key={declaration}
                    onClick={() => actions.sendAction({ type: "declare", declaration: declaration as PlayerAction["declaration"] })}
                  >
                    {declaration}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bottom-area">
          <Seat player={self} position="bottom" active={state.round.turnPlayerId === self?.id} winner={recentWinnerId === self?.id} />
          <div className="hand-row">
            {hand.map((card, index) => (
              <button
                key={card.id}
                className={`card-button ${state.round.phase === "playing" && isTurn ? "playable" : ""}`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => actions.sendAction({ type: "play", cardId: card.id })}
                disabled={state.round.phase !== "playing" || !isTurn}
              >
                <CardFace card={card} />
              </button>
            ))}
          </div>
          {state.round.phase === "round_over" && isHost ? (
            <button className="next-round" onClick={() => actions.sendAction({ type: "new_round" })}>
              Nächste Runde
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ConfigPanel({
  state,
  onChange,
  onStart
}: {
  state: PublicState;
  onChange: (config: PublicState["config"]) => void;
  onStart: () => void;
}) {
  const [config, setConfig] = useState(state.config);

  useEffect(() => {
    setConfig(state.config);
  }, [state.config]);

  return (
    <div className="config-panel">
      <h3>Lobby-Konfiguration</h3>
      <label>
        Bot-Stärke
        <select
          value={config.botStrength}
          onChange={(event) => setConfig({ ...config, botStrength: event.target.value as PublicState["config"]["botStrength"] })}
        >
          <option value="leicht">Leicht</option>
          <option value="mittel">Mittel</option>
          <option value="stark">Stark</option>
        </select>
      </label>
      <div className="toggle-grid">
        {Object.entries(config.rules).map(([key, value]) => (
          <label key={key} className="toggle">
            <input
              type="checkbox"
              checked={value}
              onChange={(event) =>
                setConfig({
                  ...config,
                  rules: {
                    ...config.rules,
                    [key]: event.target.checked
                  }
                })
              }
            />
            <span>{humanizeRule(key)}</span>
          </label>
        ))}
      </div>
      <div className="config-actions">
        <button onClick={() => onChange(config)}>Konfiguration speichern</button>
        <button className="secondary" onClick={onStart}>
          Spiel starten
        </button>
      </div>
    </div>
  );
}

function Seat({
  player,
  position,
  active,
  winner
}: {
  player?: PublicPlayerView;
  position: "top" | "left" | "right" | "bottom";
  active?: boolean;
  winner?: boolean;
}) {
  if (!player) {
    return null;
  }
  return (
    <div className={`seat ${position} ${active ? "active" : ""} ${winner ? "winner" : ""}`}>
      <strong>{player.name}</strong>
      <span>
        {player.handCount} Karten {player.isBot ? "• Bot" : ""}
      </span>
      {position !== "bottom" ? (
        <div className={`seat-stack ${position}`}>
          {Array.from({ length: Math.min(player.handCount, 4) }).map((_, index) => (
            <CardBack key={`${player.id}-back-${index}`} offset={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CardFace({ card }: { card: Card }) {
  return (
    <div className="card-face svg-card">
      <CardSvg card={card} className="card-svg" />
    </div>
  );
}

function CardBack({ offset }: { offset: number }) {
  return (
    <div
      className="card-back"
      style={{
        backgroundImage: `url(${cardBack})`,
        transform: `translateX(${offset * 10}px) translateY(${offset * 2}px) rotate(${offset * 2 - 3}deg)`
      }}
    />
  );
}

function formatContract(contract: Contract) {
  if (contract.kind === "pass") {
    return "Weiter";
  }
  if (contract.kind === "rufspiel") {
    return `Rufspiel ${suitNames[contract.calledAceSuit as Suit]}`;
  }
  if (contract.suit) {
    return `${contract.kind} ${suitNames[contract.suit]}`;
  }
  return contract.kind;
}

function phaseLabel(phase: string) {
  return (
    {
      waiting: "Lobby",
      bidding: "Spielansage",
      doubling: "Ansagen",
      playing: "Stichspiel",
      round_over: "Runde beendet"
    }[phase] ?? phase
  );
}

function seatAtOffset(players: PublicPlayerView[], ownSeat: number, offset: number) {
  return players.find((player) => player.seat === (ownSeat + offset) % 4);
}

function humanizeRule(key: string) {
  return (
    {
      allowRufspiel: "Rufspiel",
      allowWenz: "Wenz",
      allowGeier: "Geier",
      allowSolo: "Solo",
      allowFarbsolo: "Farbsolo",
      allowFarbwenz: "Farbwenz",
      allowRamsch: "Ramsch",
      allowKontraRetour: "Kontra/Retour",
      allowStoss: "Stoß",
      allowSpritze: "Spritze",
      countLaufende: "Laufende"
    }[key] ?? key
  );
}

function trickPositionClass(players: PublicPlayerView[], ownSeat: number, playerId: string) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player) {
    return "from-center";
  }
  const offset = (player.seat - ownSeat + 4) % 4;
  return (
    {
      0: "from-bottom",
      1: "from-right",
      2: "from-top",
      3: "from-left"
    }[offset] ?? "from-center"
  );
}
