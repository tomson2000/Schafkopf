import { CARD_POINTS, createDeck, shuffle, sortCards } from "./cards.js";
import {
  BotStrength,
  Card,
  Contract,
  ContractKind,
  LobbyState,
  Player,
  PlayerAction,
  PublicState,
  RoundResult,
  RoundState,
  Suit,
  TeamInfo,
  DEFAULT_RULES
} from "./types.js";

const CONTRACT_STRENGTH: Record<ContractKind, number> = {
  pass: 0,
  rufspiel: 10,
  wenz: 20,
  geier: 25,
  farbwenz: 30,
  solo: 35,
  farbsolo: 35,
  ramsch: 1
};

const OBER_ORDER: Suit[] = ["eichel", "gras", "herz", "schelln"];
const UNTER_ORDER: Suit[] = ["eichel", "gras", "herz", "schelln"];
const SUIT_ORDER: Suit[] = ["eichel", "gras", "herz", "schelln"];

export function createInitialLobby(hostId: string, roomCode: string, hostName: string): LobbyState {
  const hostPlayer: Player = {
    id: hostId,
    name: hostName,
    isBot: false,
    connected: true,
    seat: 0
  };
  return {
    roomCode,
    hostId,
    players: [hostPlayer],
    matchScores: {
      [hostPlayer.id]: 0
    },
    config: {
      botStrength: "mittel",
      rules: { ...DEFAULT_RULES }
    },
    round: createEmptyRound(0, [hostPlayer.id]),
    createdAt: Date.now()
  };
}

export function createEmptyRound(dealerIndex: number, playerIds: string[]): RoundState {
  return {
    dealerIndex,
    phase: "waiting",
    hands: Object.fromEntries(playerIds.map((id) => [id, []])),
    talon: [],
    bids: [],
    declarations: {
      stossBy: [],
      spritzeBy: [],
      passed: []
    },
    teams: {
      re: [],
      kontra: []
    },
    currentTrick: {
      leaderId: playerIds[0] ?? "",
      cards: []
    },
    completedTricks: [],
    scores: Object.fromEntries(playerIds.map((id) => [id, 0]))
  };
}

export function normalizeLobby(lobby: LobbyState): LobbyState {
  const players = lobby.players
    .sort((a, b) => a.seat - b.seat)
    .slice(0, 4)
    .map((player, index) => ({ ...player, seat: index }));
  return {
    ...lobby,
    players,
    matchScores: Object.fromEntries(players.map((p) => [p.id, lobby.matchScores[p.id] ?? 0])),
    round: {
      ...lobby.round,
      scores: Object.fromEntries(players.map((p) => [p.id, lobby.round.scores[p.id] ?? 0]))
    }
  };
}

export function fillBots(lobby: LobbyState): LobbyState {
  const next = normalizeLobby(lobby);
  let seat = next.players.length;
  while (next.players.length < 4) {
    const botId = `bot-${seat}-${Math.random().toString(36).slice(2, 8)}`;
    next.players.push({
      id: botId,
      name: `Bot ${seat + 1}`,
      isBot: true,
      connected: true,
      botStrength: next.config.botStrength,
      seat
    });
    next.matchScores[botId] = next.matchScores[botId] ?? 0;
    seat += 1;
  }
  return next;
}

export function startRound(lobby: LobbyState, random = Math.random): LobbyState {
  const filled = fillBots(lobby);
  const playerIds = filled.players.map((player) => player.id);
  const dealerIndex = (filled.round.dealerIndex + 1) % 4;
  const deck = shuffle(createDeck(), random);
  const hands: Record<string, Card[]> = {};
  playerIds.forEach((id, index) => {
    hands[id] = sortCards(deck.slice(index * 8, index * 8 + 8));
  });
  const firstPlayer = playerIds[(dealerIndex - 1 + playerIds.length) % playerIds.length];
  return {
    ...filled,
    round: {
      dealerIndex,
      phase: "bidding",
      turnPlayerId: firstPlayer,
      hands,
      talon: [],
      bids: [],
      declarations: {
        stossBy: [],
        spritzeBy: [],
        passed: []
      },
      teams: {
        re: [],
        kontra: []
      },
      currentTrick: {
        leaderId: firstPlayer,
        cards: []
      },
      completedTricks: [],
      scores: Object.fromEntries(playerIds.map((id) => [id, filled.round.scores[id] ?? 0]))
    }
  };
}

function nextPlayerId(players: Player[], playerId: string): string {
  const currentIndex = players.findIndex((player) => player.id === playerId);
  return players[(currentIndex - 1 + players.length) % players.length].id;
}

function previousPlayerId(players: Player[], playerId: string): string {
  const currentIndex = players.findIndex((player) => player.id === playerId);
  return players[(currentIndex + 1 + players.length) % players.length].id;
}

export function applyAction(lobby: LobbyState, playerId: string, action: PlayerAction): LobbyState {
  if (action.type === "new_round") {
    return startRound(lobby);
  }
  if (lobby.round.turnPlayerId !== playerId && !(action.type === "declare" && lobby.round.phase === "doubling")) {
    return lobby;
  }
  switch (action.type) {
    case "bid":
      return applyBid(lobby, playerId, action.contract);
    case "declare":
      return applyDeclaration(lobby, playerId, action.declaration ?? "pass");
    case "play":
      return applyPlayedCard(lobby, playerId, action.cardId);
    default:
      return lobby;
  }
}

function applyBid(lobby: LobbyState, playerId: string, contract?: Contract): LobbyState {
  if (lobby.round.phase !== "bidding" || lobby.round.turnPlayerId !== playerId || !contract) {
    return lobby;
  }
  const bids = [...lobby.round.bids, { playerId, contract: { ...contract, callerId: playerId } }];
  const nextTurn = bids.length < 4 ? nextPlayerId(lobby.players, playerId) : undefined;
  const updated: LobbyState = {
    ...lobby,
    round: {
      ...lobby.round,
      bids,
      turnPlayerId: nextTurn
    }
  };
  if (bids.length < 4) {
    return updated;
  }
  const contractWinner = determineWinningBid(updated);
  const finalized = contractWinner
    ? setupContract(updated, contractWinner.playerId, contractWinner.contract)
    : fallbackToRamsch(updated);
  return finalized;
}

function determineWinningBid(lobby: LobbyState) {
  return [...lobby.round.bids].sort((a, b) => CONTRACT_STRENGTH[b.contract.kind] - CONTRACT_STRENGTH[a.contract.kind])[0];
}

function fallbackToRamsch(lobby: LobbyState): LobbyState {
  if (!lobby.config.rules.allowRamsch) {
    return startRound(lobby);
  }
  const firstPlayer = lobby.players[(lobby.round.dealerIndex - 1 + lobby.players.length) % lobby.players.length].id;
  return setupContract(lobby, firstPlayer, {
    kind: "ramsch",
    callerId: firstPlayer
  });
}

function setupContract(lobby: LobbyState, playerId: string, contract: Contract): LobbyState {
  const callerId = playerId;
  const normalizedContract: Contract = { ...contract, callerId };
  if (normalizedContract.kind === "rufspiel" && normalizedContract.calledAceSuit) {
    const aceHolder = lobby.players.find((player) =>
      lobby.round.hands[player.id].some((card) => card.suit === normalizedContract.calledAceSuit && card.rank === "A")
    );
    normalizedContract.partnerId = aceHolder?.id;
  }
  const teams = getTeams(lobby.players, normalizedContract);
  const phase = lobby.config.rules.allowKontraRetour || lobby.config.rules.allowStoss || lobby.config.rules.allowSpritze ? "doubling" : "playing";
  return {
    ...lobby,
    round: {
      ...lobby.round,
      contract: normalizedContract,
      teams,
      phase,
      turnPlayerId: phase === "playing" ? callerId : callerId,
      declarations: {
        stossBy: [],
        spritzeBy: [],
        passed: []
      },
      currentTrick: {
        leaderId: callerId,
        cards: []
      }
    }
  };
}

function getTeams(players: Player[], contract: Contract): TeamInfo {
  if (contract.kind === "ramsch") {
    return {
      re: [],
      kontra: players.map((player) => player.id)
    };
  }
  if (contract.kind === "rufspiel") {
    const partnerId = contract.partnerId;
    return {
      re: [contract.callerId!, partnerId!].filter(Boolean),
      kontra: players.map((player) => player.id).filter((id) => ![contract.callerId, partnerId].includes(id))
    };
  }
  return {
    re: [contract.callerId!],
    kontra: players.map((player) => player.id).filter((id) => id !== contract.callerId)
  };
}

function applyDeclaration(lobby: LobbyState, playerId: string, declaration: "pass" | "kontra" | "retour" | "stoss" | "spritze"): LobbyState {
  if (lobby.round.phase !== "doubling") {
    return lobby;
  }
  if (lobby.round.declarations.passed.includes(playerId)) {
    return lobby;
  }
  const declarations = {
    kontraBy: lobby.round.declarations.kontraBy,
    retourBy: lobby.round.declarations.retourBy,
    stossBy: [...lobby.round.declarations.stossBy],
    spritzeBy: [...lobby.round.declarations.spritzeBy],
    passed: [...lobby.round.declarations.passed, playerId]
  };
  if (declaration === "kontra" && lobby.config.rules.allowKontraRetour && !declarations.kontraBy) {
    declarations.kontraBy = playerId;
  }
  if (declaration === "retour" && lobby.config.rules.allowKontraRetour && declarations.kontraBy && !declarations.retourBy) {
    declarations.retourBy = playerId;
  }
  if (declaration === "stoss" && lobby.config.rules.allowStoss && !declarations.stossBy.includes(playerId)) {
    declarations.stossBy.push(playerId);
  }
  if (declaration === "spritze" && lobby.config.rules.allowSpritze && !declarations.spritzeBy.includes(playerId)) {
    declarations.spritzeBy.push(playerId);
  }
  const everyoneActed = declarations.passed.length >= lobby.players.length;
  return {
    ...lobby,
    round: {
      ...lobby.round,
      phase: everyoneActed ? "playing" : "doubling",
      declarations,
      turnPlayerId: everyoneActed ? lobby.round.contract?.callerId : nextPlayerId(lobby.players, playerId)
    }
  };
}

function applyPlayedCard(lobby: LobbyState, playerId: string, cardId?: string): LobbyState {
  if (lobby.round.phase !== "playing" || !cardId) {
    return lobby;
  }
  const hand = lobby.round.hands[playerId] ?? [];
  const card = hand.find((entry) => entry.id === cardId);
  if (!card) {
    return lobby;
  }
  const legal = getLegalCards(hand, lobby.round.currentTrick.cards[0]?.card, lobby.round.contract!);
  if (!legal.some((entry) => entry.id === card.id)) {
    return lobby;
  }
  const hands = { ...lobby.round.hands, [playerId]: hand.filter((entry) => entry.id !== card.id) };
  const currentTrick = {
    ...lobby.round.currentTrick,
    cards: [...lobby.round.currentTrick.cards, { playerId, card }]
  };
  if (currentTrick.cards.length < 4) {
    return {
      ...lobby,
      round: {
        ...lobby.round,
        hands,
        currentTrick,
        turnPlayerId: nextPlayerId(lobby.players, playerId)
      }
    };
  }
  return {
    ...lobby,
    round: {
      ...lobby.round,
      hands,
      currentTrick,
      turnPlayerId: undefined
    }
  };
}

export function resolveCurrentTrick(lobby: LobbyState): LobbyState {
  const currentTrick = lobby.round.currentTrick;
  if (lobby.round.phase !== "playing" || currentTrick.cards.length !== 4 || !lobby.round.contract) {
    return lobby;
  }
  const winnerId = determineTrickWinner(currentTrick.cards, lobby.round.contract!);
  const finishedTrick = { ...currentTrick, winnerId };
  const completedTricks = [...lobby.round.completedTricks, finishedTrick];
  const scores = { ...lobby.round.scores };
  finishedTrick.cards.forEach(({ card }) => {
    scores[winnerId] = (scores[winnerId] ?? 0) + CARD_POINTS[card.rank];
  });
  const roundDone = completedTricks.length === 8;
  const result = roundDone ? resolveRound(lobby, completedTricks, scores) : undefined;
  const matchScores =
    roundDone && result
      ? Object.fromEntries(lobby.players.map((player) => [player.id, (lobby.matchScores[player.id] ?? 0) + (result.scoreDelta[player.id] ?? 0)]))
      : lobby.matchScores;
  return {
    ...lobby,
    matchScores,
    round: {
      ...lobby.round,
      hands: lobby.round.hands,
      currentTrick: {
        leaderId: winnerId,
        cards: []
      },
      completedTricks,
      turnPlayerId: winnerId,
      scores,
      phase: roundDone ? "round_over" : "playing",
      result
    }
  };
}

export function getPublicState(lobby: LobbyState, selfId: string): PublicState {
  return {
    selfId,
    roomCode: lobby.roomCode,
    hostId: lobby.hostId,
    players: lobby.players.map((player) => ({
      ...player,
      handCount: lobby.round.hands[player.id]?.length ?? 0,
      hand: player.id === selfId ? sortCards(lobby.round.hands[player.id] ?? [], lobby.round.contract) : undefined
    })),
    matchScores: lobby.matchScores,
    config: lobby.config,
    round: lobby.round
  };
}

export function getLegalCards(hand: Card[], leadCard: Card | undefined, contract: Contract): Card[] {
  if (!leadCard) {
    return hand;
  }
  const leadTrump = isTrump(leadCard, contract);
  if (leadTrump) {
    const trumps = hand.filter((card) => isTrump(card, contract));
    return trumps.length ? trumps : hand;
  }
  const suited = hand.filter((card) => !isTrump(card, contract) && card.suit === leadCard.suit);
  return suited.length ? suited : hand;
}

export function isTrump(card: Card, contract: Contract): boolean {
  if (card.rank === "O") {
    return true;
  }
  if (card.rank === "U") {
    return contract.kind !== "geier";
  }
  if (contract.kind === "geier") {
    return false;
  }
  if (contract.kind === "wenz") {
    return false;
  }
  if (contract.kind === "farbwenz") {
    return card.suit === contract.suit;
  }
  if (contract.kind === "solo" || contract.kind === "farbsolo") {
    return card.suit === contract.suit;
  }
  return card.suit === "herz";
}

function trumpOrder(card: Card, contract: Contract): number {
  if (card.rank === "O") {
    return 200 - OBER_ORDER.indexOf(card.suit);
  }
  if (card.rank === "U") {
    return 180 - UNTER_ORDER.indexOf(card.suit);
  }
  if (contract.kind === "geier") {
    return 100 - OBER_ORDER.indexOf(card.suit);
  }
  if (contract.kind === "wenz") {
    return 100 - UNTER_ORDER.indexOf(card.suit);
  }
  if (contract.kind === "farbwenz" && card.suit === contract.suit) {
    return 80 - rankOrder(card.rank);
  }
  if ((contract.kind === "solo" || contract.kind === "farbsolo") && card.suit === contract.suit) {
    return 80 - rankOrder(card.rank);
  }
  if ((contract.kind === "rufspiel" || contract.kind === "ramsch") && card.suit === "herz") {
    return 80 - rankOrder(card.rank);
  }
  return 0;
}

function rankOrder(rank: Card["rank"]): number {
  return ["A", "10", "K", "9", "8", "7"].indexOf(rank);
}

function suitOrderValue(card: Card): number {
  return 50 - SUIT_ORDER.indexOf(card.suit) * 10 - rankOrder(card.rank);
}

export function determineTrickWinner(cards: { playerId: string; card: Card }[], contract: Contract): string {
  const lead = cards[0].card;
  const leadTrump = isTrump(lead, contract);
  const sorted = [...cards].sort((a, b) => {
    const aTrump = isTrump(a.card, contract);
    const bTrump = isTrump(b.card, contract);
    if (aTrump && bTrump) {
      return trumpOrder(b.card, contract) - trumpOrder(a.card, contract);
    }
    if (aTrump !== bTrump) {
      return bTrump ? 1 : -1;
    }
    if (leadTrump) {
      return 0;
    }
    if (a.card.suit === lead.suit && b.card.suit !== lead.suit) {
      return -1;
    }
    if (b.card.suit === lead.suit && a.card.suit !== lead.suit) {
      return 1;
    }
    return suitOrderValue(b.card) - suitOrderValue(a.card);
  });
  return sorted[0].playerId;
}

function resolveRound(lobby: LobbyState, completedTricks = lobby.round.completedTricks, scores = lobby.round.scores): RoundResult {
  const contract = lobby.round.contract!;
  if (contract.kind === "ramsch") {
    const pointsByPlayer = scores;
    const loser = Object.entries(pointsByPlayer).sort((a, b) => b[1] - a[1])[0][0];
    const delta = Object.fromEntries(lobby.players.map((player) => [player.id, player.id === loser ? -30 : 10]));
    return {
      winners: lobby.players.map((player) => player.id).filter((id) => id !== loser),
      losers: [loser],
      pointsByPlayer,
      trickPointsByTeam: { re: 0, kontra: 0 },
      scoreDelta: delta,
      summary: `${getPlayerName(lobby.players, loser)} verliert den Ramsch mit ${pointsByPlayer[loser]} Augen.`
    };
  }
  const teamPoints = {
    re: Object.entries(scores)
      .filter(([playerId]) => lobby.round.teams.re.includes(playerId))
      .reduce((sum, [, value]) => sum + value, 0),
    kontra: Object.entries(scores)
      .filter(([playerId]) => lobby.round.teams.kontra.includes(playerId))
      .reduce((sum, [, value]) => sum + value, 0)
  };
  const declarerWon = teamPoints.re >= 61;
  const winners = declarerWon ? lobby.round.teams.re : lobby.round.teams.kontra;
  const losers = declarerWon ? lobby.round.teams.kontra : lobby.round.teams.re;
  const base = contractBaseValue(contract.kind);
  const declarations = 1
    + Number(Boolean(lobby.round.declarations.kontraBy))
    + Number(Boolean(lobby.round.declarations.retourBy))
    + lobby.round.declarations.stossBy.length
    + lobby.round.declarations.spritzeBy.length;
  const schneider = declarerWon ? teamPoints.kontra <= 30 : teamPoints.re <= 30;
  const schwarz = winners.every((winner) => completedTricks.some((trick) => trick.winnerId === winner)) && losers.every((loser) => !completedTricks.some((trick) => trick.winnerId === loser));
  const laufendeBonus = lobby.config.rules.countLaufende ? countLaufende(lobby.round.hands, contract, lobby.round.teams) * 5 : 0;
  const roundValue = base * declarations + (schneider ? base : 0) + (schwarz ? base : 0) + laufendeBonus;
  const scoreDelta = Object.fromEntries(
    lobby.players.map((player) => [player.id, winners.includes(player.id) ? roundValue : -roundValue / Math.max(1, losers.length)])
  );
  return {
    winners,
    losers,
    pointsByPlayer: scores,
    trickPointsByTeam: teamPoints,
    scoreDelta,
    summary: `${winners.map((id) => getPlayerName(lobby.players, id)).join(", ")} gewinnen ${contract.kind} mit ${teamPoints.re}:${teamPoints.kontra} Augen.`
  };
}

function contractBaseValue(kind: ContractKind): number {
  switch (kind) {
    case "rufspiel":
      return 20;
    case "wenz":
      return 30;
    case "geier":
      return 35;
    case "farbwenz":
      return 40;
    case "solo":
    case "farbsolo":
      return 50;
    case "ramsch":
      return 30;
    default:
      return 0;
  }
}

function countLaufende(hands: Record<string, Card[]>, contract: Contract, teams: TeamInfo): number {
  const targetTeam = teams.re.length ? teams.re : teams.kontra;
  const allCards = targetTeam.flatMap((playerId) => hands[playerId] ?? []);
  const topTrumps = createDeck().filter((card) => isTrump(card, contract)).sort((a, b) => trumpOrder(b, contract) - trumpOrder(a, contract));
  let count = 0;
  for (const card of topTrumps) {
    if (allCards.some((entry) => entry.id === card.id)) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export function availableContracts(lobby: LobbyState, playerId: string): Contract[] {
  const hand = lobby.round.hands[playerId] ?? [];
  const contracts: Contract[] = [{ kind: "pass" }];
  if (lobby.config.rules.allowRufspiel) {
    (["eichel", "gras", "schelln"] as Suit[]).forEach((suit) => {
      if (!hand.some((card) => card.suit === suit && card.rank === "A")) {
        contracts.push({ kind: "rufspiel", calledAceSuit: suit });
      }
    });
  }
  if (lobby.config.rules.allowWenz) {
    contracts.push({ kind: "wenz" });
  }
  if (lobby.config.rules.allowGeier) {
    contracts.push({ kind: "geier" });
  }
  if (lobby.config.rules.allowSolo) {
    (["eichel", "gras", "herz", "schelln"] as Suit[]).forEach((suit) => contracts.push({ kind: "solo", suit }));
  }
  if (lobby.config.rules.allowFarbsolo) {
    (["eichel", "gras", "herz", "schelln"] as Suit[]).forEach((suit) => contracts.push({ kind: "farbsolo", suit }));
  }
  if (lobby.config.rules.allowFarbwenz) {
    (["eichel", "gras", "herz", "schelln"] as Suit[]).forEach((suit) => contracts.push({ kind: "farbwenz", suit }));
  }
  if (lobby.config.rules.allowRamsch) {
    contracts.push({ kind: "ramsch" });
  }
  return contracts;
}

function getPlayerName(players: Player[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? playerId;
}

export function replaceDisconnectedWithBot(lobby: LobbyState, playerId: string, strength: BotStrength): LobbyState {
  return {
    ...lobby,
    players: lobby.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            connected: false,
            isBot: true,
            botStrength: strength,
            name: `${player.name} (Bot)`
          }
        : player
    )
  };
}
