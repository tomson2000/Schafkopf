import { Card, Rank, Suit } from "./types.js";

const SUITS: Suit[] = ["eichel", "gras", "herz", "schelln"];
const RANKS: Rank[] = ["7", "8", "9", "U", "O", "K", "10", "A"];

export const CARD_POINTS: Record<Rank, number> = {
  "7": 0,
  "8": 0,
  "9": 0,
  U: 2,
  O: 3,
  K: 4,
  "10": 10,
  A: 11
};

export const DISPLAY_SUITS: Record<Suit, string> = {
  eichel: "Eichel",
  gras: "Gras",
  herz: "Herz",
  schelln: "Schelln"
};

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank
    }))
  );
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function sortCards(cards: Card[]): Card[] {
  const suitOrder: Suit[] = ["eichel", "gras", "herz", "schelln"];
  const rankOrder: Rank[] = ["7", "8", "9", "K", "10", "A", "U", "O"];
  return [...cards].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) {
      return suitDiff;
    }
    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
  });
}
