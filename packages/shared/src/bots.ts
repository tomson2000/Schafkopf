import { CARD_POINTS } from "./cards.js";
import { availableContracts, determineTrickWinner, getLegalCards, isTrump } from "./engine.js";
import { BotStrength, Card, LobbyState, PlayerAction } from "./types.js";

export function chooseBotAction(lobby: LobbyState, playerId: string, strength: BotStrength): PlayerAction | null {
  switch (lobby.round.phase) {
    case "bidding":
      return {
        type: "bid",
        contract: chooseContract(lobby, playerId, strength)
      };
    case "doubling":
      return {
        type: "declare",
        declaration: chooseDeclaration(lobby, playerId, strength)
      };
    case "playing":
      return {
        type: "play",
        cardId: chooseCard(lobby, playerId, strength)?.id
      };
    case "round_over":
      return {
        type: "new_round"
      };
    default:
      return null;
  }
}

function chooseContract(lobby: LobbyState, playerId: string, strength: BotStrength) {
  const hand = lobby.round.hands[playerId] ?? [];
  const contracts = availableContracts(lobby, playerId);
  const scored = contracts.map((contract) => ({
    contract,
    score: evaluateContract(hand, contract.kind, contract.suit, contract.calledAceSuit)
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const threshold = strength === "leicht" ? 58 : strength === "mittel" ? 72 : 82;
  return best.score >= threshold ? best.contract : { kind: "pass" as const };
}

function evaluateContract(hand: Card[], kind: string, suit?: string, calledAceSuit?: string) {
  const trumpCount = hand.filter((card) => {
    if (kind === "wenz") {
      return card.rank === "U";
    }
    if (kind === "geier") {
      return card.rank === "O";
    }
    if (kind === "farbwenz") {
      return card.rank === "U" || card.suit === suit;
    }
    if (kind === "solo" || kind === "farbsolo") {
      return card.rank === "O" || card.rank === "U" || card.suit === suit;
    }
    if (kind === "rufspiel") {
      return card.rank === "O" || card.rank === "U" || card.suit === "herz";
    }
    return false;
  }).length;
  const points = hand.reduce((sum, card) => sum + CARD_POINTS[card.rank], 0);
  const aces = hand.filter((card) => card.rank === "A").length;
  const suitBonus = calledAceSuit ? (hand.some((card) => card.suit === calledAceSuit && card.rank === "10") ? 8 : 0) : 0;
  return points + trumpCount * 12 + aces * 4 + suitBonus;
}

function chooseDeclaration(lobby: LobbyState, playerId: string, strength: BotStrength) {
  const hand = lobby.round.hands[playerId] ?? [];
  const power = hand.reduce((sum, card) => sum + CARD_POINTS[card.rank] + (isTrump(card, lobby.round.contract!) ? 3 : 0), 0);
  if (strength !== "leicht" && lobby.config.rules.allowKontraRetour && !lobby.round.declarations.kontraBy && power > 42) {
    return "kontra";
  }
  if (strength === "stark" && lobby.config.rules.allowStoss && lobby.round.declarations.kontraBy && power > 50) {
    return "stoss";
  }
  return "pass";
}

function chooseCard(lobby: LobbyState, playerId: string, strength: BotStrength): Card | undefined {
  const hand = lobby.round.hands[playerId] ?? [];
  const lead = lobby.round.currentTrick.cards[0]?.card;
  const legal = getLegalCards(hand, lead, lobby.round.contract!);
  if (legal.length === 0) {
    return undefined;
  }
  if (strength === "leicht") {
    return legal[Math.floor(Math.random() * legal.length)];
  }
  const currentTrick = lobby.round.currentTrick.cards;
  const candidateScores = legal.map((card) => {
    const simulated = [...currentTrick, { playerId, card }];
    const winsNow = simulated.length > 0 && determineTrickWinner(simulated, lobby.round.contract!) === playerId;
    const risk = isTrump(card, lobby.round.contract!) ? 10 : 0;
    const value = CARD_POINTS[card.rank];
    const score = (winsNow ? 25 : 0) - risk - value + (strength === "stark" ? (value === 0 ? 8 : 0) : 0);
    return { card, score };
  });
  candidateScores.sort((a, b) => b.score - a.score);
  return candidateScores[0].card;
}
