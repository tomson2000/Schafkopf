import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import cardBack from "./assets/card-back.svg";
import suitEichel from "./assets/suit-eichel.svg";
import suitGras from "./assets/suit-gras.svg";
import suitHerz from "./assets/suit-herz.svg";
import suitSchelln from "./assets/suit-schelln.svg";
import { CardSvg } from "./components/CardSvg";
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");
const socket = io(SERVER_URL, { autoConnect: true });
const allContracts = [
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
const suitIcons = {
    eichel: suitEichel,
    gras: suitGras,
    herz: suitHerz,
    schelln: suitSchelln
};
const suitNames = {
    eichel: "Eichel",
    gras: "Gras",
    herz: "Herz",
    schelln: "Schelln"
};
export function App() {
    const [name, setName] = useState("Thomas");
    const [joinCode, setJoinCode] = useState("");
    const [state, setState] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        socket.on("room:state", (next) => {
            setState(next);
            setError("");
        });
        socket.on("room:error", ({ message }) => {
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
        updateConfig: (config) => socket.emit("room:update-config", { config }),
        startRoom: () => socket.emit("room:start"),
        sendAction: (action) => socket.emit("room:action", { action })
    };
    if (!state) {
        return (_jsxs("main", { className: "landing", children: [_jsxs("div", { className: "hero", children: [_jsx("p", { className: "eyebrow", children: "Echtzeit-Schafkopf auf Docker" }), _jsx("h1", { children: "Schafkopf Online" }), _jsx("p", { className: "subline", children: "Lobby, WebSocket-Spieltisch, konfigurierbare Varianten und Bots als Ersatzspieler." })] }), _jsxs("section", { className: "panel auth", children: [_jsxs("label", { children: ["Dein Name", _jsx("input", { value: name, onChange: (event) => setName(event.target.value), maxLength: 24 })] }), _jsxs("div", { className: "auth-actions", children: [_jsx("button", { onClick: actions.createRoom, children: "Raum erstellen" }), _jsx("input", { placeholder: "Raumcode", value: joinCode, onChange: (event) => setJoinCode(event.target.value.toUpperCase()), maxLength: 4 }), _jsx("button", { className: "secondary", onClick: actions.joinRoom, children: "Beitreten" })] }), error ? _jsx("p", { className: "error", children: error }) : null] })] }));
    }
    const hand = self?.hand ?? [];
    const top = seatAtOffset(state.players, self?.seat ?? 0, 2);
    const left = seatAtOffset(state.players, self?.seat ?? 0, 3);
    const right = seatAtOffset(state.players, self?.seat ?? 0, 1);
    const lastCompletedTrick = state.round.completedTricks[state.round.completedTricks.length - 1];
    const recentWinnerId = state.round.currentTrick.cards.length === 0 ? lastCompletedTrick?.winnerId : undefined;
    const trickNumber = state.round.completedTricks.length + (state.round.currentTrick.cards.length > 0 ? 1 : 0);
    return (_jsxs("main", { className: "table-page", children: [_jsxs("aside", { className: "sidebar panel", children: [_jsxs("div", { className: "room-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Raum" }), _jsx("h2", { children: state.roomCode })] }), _jsx("div", { className: "status-chip", children: phaseLabel(state.round.phase) })] }), _jsx("p", { className: "contract-label", children: state.round.contract ? `Spiel: ${formatContract(state.round.contract)}` : "Noch kein Spiel angesagt" }), _jsx("div", { className: "score-grid", children: state.players.map((player) => (_jsxs("div", { className: `score-card ${recentWinnerId === player.id ? "winner" : ""}`, children: [_jsxs("div", { className: "score-card-head", children: [_jsxs("strong", { children: [player.name, recentWinnerId === player.id ? _jsx("span", { className: "winner-badge", children: "Letzter Stich" }) : null] }), _jsx("span", { className: `player-kind ${player.isBot ? "bot" : "human"}`, children: player.isBot ? "Bot" : "Mensch" })] }), _jsxs("div", { className: "score-metrics", children: [_jsxs("div", { className: "score-pill round", children: [_jsx("span", { className: "label", children: "Runde" }), _jsx("strong", { children: state.round.scores[player.id] ?? 0 }), _jsx("span", { className: "unit", children: "Augen" })] }), _jsxs("div", { className: "score-pill total", children: [_jsx("span", { className: "label", children: "Gesamt" }), _jsx("strong", { children: Math.round(state.matchScores[player.id] ?? 0) }), _jsx("span", { className: "unit", children: "Punkte" })] })] })] }, player.id))) }), lastCompletedTrick ? (_jsxs("div", { className: "last-trick panel inset-panel", children: [_jsxs("div", { className: "section-head", children: [_jsx("h3", { children: "Letzter Stich" }), _jsx("span", { children: state.players.find((player) => player.id === lastCompletedTrick.winnerId)?.name ?? "Unbekannt" })] }), _jsx("div", { className: "last-trick-cards", children: lastCompletedTrick.cards.map((entry) => (_jsxs("div", { className: "last-trick-entry", children: [_jsx(CardFace, { card: entry.card }), _jsx("span", { children: state.players.find((player) => player.id === entry.playerId)?.name ?? "Spieler" })] }, `${entry.playerId}-${entry.card.id}-last`))) })] })) : null, isHost && state.round.phase === "waiting" ? (_jsx(ConfigPanel, { state: state, onChange: actions.updateConfig, onStart: actions.startRoom })) : null, state.round.result ? _jsx("div", { className: "result-box", children: state.round.result.summary }) : null] }), _jsxs("section", { className: "table", children: [_jsx("div", { className: "corner-brass top-left" }), _jsx("div", { className: "corner-brass top-right" }), _jsx("div", { className: "corner-brass bottom-left" }), _jsx("div", { className: "corner-brass bottom-right" }), _jsx("div", { className: "frame-rivet r1" }), _jsx("div", { className: "frame-rivet r2" }), _jsx("div", { className: "frame-rivet r3" }), _jsx("div", { className: "frame-rivet r4" }), _jsx(Seat, { player: top, position: "top", active: state.round.turnPlayerId === top?.id, winner: recentWinnerId === top?.id }), _jsx(Seat, { player: left, position: "left", active: state.round.turnPlayerId === left?.id, winner: recentWinnerId === left?.id }), _jsx(Seat, { player: right, position: "right", active: state.round.turnPlayerId === right?.id, winner: recentWinnerId === right?.id }), _jsxs("div", { className: "center-stage", children: [_jsx("div", { className: "felt-ring" }), _jsxs("div", { className: `phase-banner phase-${state.round.phase}`, children: [_jsx("span", { children: phaseLabel(state.round.phase) }), _jsx("strong", { children: state.round.contract ? formatContract(state.round.contract) : "Warten auf Spielstart" })] }), _jsxs("div", { className: "trick-counter", children: ["Stich ", trickNumber, "/8"] }), _jsx("div", { className: "trick-grid", children: state.round.currentTrick.cards.map((entry, index) => (_jsxs("div", { className: `trick-card ${state.round.currentTrick.cards.length === 4 ? "resolving" : ""} ${trickPositionClass(state.players, self?.seat ?? 0, entry.playerId)}`, style: { animationDelay: `${index * 80}ms` }, children: [_jsx(CardFace, { card: entry.card }), _jsx("span", { className: "trick-player", children: state.players.find((player) => player.id === entry.playerId)?.name ?? "Spieler" })] }, `${entry.playerId}-${entry.card.id}`))) }), state.round.phase === "bidding" && isTurn ? (_jsxs("div", { className: "action-panel", children: [_jsx("h3", { children: "Spiel ansagen" }), _jsx("div", { className: "action-grid", children: availableBidOptions.map((contract) => (_jsx("button", { onClick: () => actions.sendAction({ type: "bid", contract }), children: formatContract(contract) }, formatContract(contract)))) })] })) : null, state.round.phase === "doubling" && isTurn ? (_jsxs("div", { className: "action-panel", children: [_jsx("h3", { children: "Ansagen" }), _jsx("div", { className: "action-grid compact", children: ["pass", "kontra", "retour", "stoss", "spritze"].map((declaration) => (_jsx("button", { onClick: () => actions.sendAction({ type: "declare", declaration: declaration }), children: declaration }, declaration))) })] })) : null] }), _jsxs("div", { className: "bottom-area", children: [_jsx(Seat, { player: self, position: "bottom", active: state.round.turnPlayerId === self?.id, winner: recentWinnerId === self?.id }), _jsx("div", { className: "hand-row", children: hand.map((card, index) => (_jsx("button", { className: `card-button ${state.round.phase === "playing" && isTurn ? "playable" : ""}`, style: { animationDelay: `${index * 50}ms` }, onClick: () => actions.sendAction({ type: "play", cardId: card.id }), disabled: state.round.phase !== "playing" || !isTurn, children: _jsx(CardFace, { card: card }) }, card.id))) }), state.round.phase === "round_over" && isHost ? (_jsx("button", { className: "next-round", onClick: () => actions.sendAction({ type: "new_round" }), children: "N\u00E4chste Runde" })) : null] })] })] }));
}
function ConfigPanel({ state, onChange, onStart }) {
    const [config, setConfig] = useState(state.config);
    useEffect(() => {
        setConfig(state.config);
    }, [state.config]);
    return (_jsxs("div", { className: "config-panel", children: [_jsx("h3", { children: "Lobby-Konfiguration" }), _jsxs("label", { children: ["Bot-St\u00E4rke", _jsxs("select", { value: config.botStrength, onChange: (event) => setConfig({ ...config, botStrength: event.target.value }), children: [_jsx("option", { value: "leicht", children: "Leicht" }), _jsx("option", { value: "mittel", children: "Mittel" }), _jsx("option", { value: "stark", children: "Stark" })] })] }), _jsx("div", { className: "toggle-grid", children: Object.entries(config.rules).map(([key, value]) => (_jsxs("label", { className: "toggle", children: [_jsx("input", { type: "checkbox", checked: value, onChange: (event) => setConfig({
                                ...config,
                                rules: {
                                    ...config.rules,
                                    [key]: event.target.checked
                                }
                            }) }), _jsx("span", { children: humanizeRule(key) })] }, key))) }), _jsxs("div", { className: "config-actions", children: [_jsx("button", { onClick: () => onChange(config), children: "Konfiguration speichern" }), _jsx("button", { className: "secondary", onClick: onStart, children: "Spiel starten" })] })] }));
}
function Seat({ player, position, active, winner }) {
    if (!player) {
        return null;
    }
    return (_jsxs("div", { className: `seat ${position} ${active ? "active" : ""} ${winner ? "winner" : ""}`, children: [_jsx("strong", { children: player.name }), _jsxs("span", { children: [player.handCount, " Karten ", player.isBot ? "• Bot" : ""] }), position !== "bottom" ? (_jsx("div", { className: `seat-stack ${position}`, children: Array.from({ length: Math.min(player.handCount, 4) }).map((_, index) => (_jsx(CardBack, { offset: index }, `${player.id}-back-${index}`))) })) : null] }));
}
function CardFace({ card }) {
    return (_jsx("div", { className: "card-face svg-card", children: _jsx(CardSvg, { card: card, className: "card-svg" }) }));
}
function CardBack({ offset }) {
    return (_jsx("div", { className: "card-back", style: {
            backgroundImage: `url(${cardBack})`,
            transform: `translateX(${offset * 10}px) translateY(${offset * 2}px) rotate(${offset * 2 - 3}deg)`
        } }));
}
function formatContract(contract) {
    if (contract.kind === "pass") {
        return "Weiter";
    }
    if (contract.kind === "rufspiel") {
        return `Rufspiel ${suitNames[contract.calledAceSuit]}`;
    }
    if (contract.suit) {
        return `${contract.kind} ${suitNames[contract.suit]}`;
    }
    return contract.kind;
}
function phaseLabel(phase) {
    return ({
        waiting: "Lobby",
        bidding: "Spielansage",
        doubling: "Ansagen",
        playing: "Stichspiel",
        round_over: "Runde beendet"
    }[phase] ?? phase);
}
function seatAtOffset(players, ownSeat, offset) {
    return players.find((player) => player.seat === (ownSeat + offset) % 4);
}
function humanizeRule(key) {
    return ({
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
    }[key] ?? key);
}
function trickPositionClass(players, ownSeat, playerId) {
    const player = players.find((entry) => entry.id === playerId);
    if (!player) {
        return "from-center";
    }
    const offset = (player.seat - ownSeat + 4) % 4;
    return ({
        0: "from-bottom",
        1: "from-right",
        2: "from-top",
        3: "from-left"
    }[offset] ?? "from-center");
}
//# sourceMappingURL=App.js.map