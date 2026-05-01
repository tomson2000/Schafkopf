import { Card, Contract, Rank, Suit } from "./types.js";

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

export function sortCards(cards: Card[], contract?: Contract): Card[] {
  const suitOrder: Suit[] = ["eichel", "gras", "herz", "schelln"];
  const rankOrder: Rank[] = ["A", "10", "K", "O", "U", "9", "8", "7"];
  return [...cards].sort((a, b) => {
    if (contract) {
      const aTrump = isSortTrump(a, contract);
      const bTrump = isSortTrump(b, contract);
      if (aTrump !== bTrump) {
        return aTrump ? -1 : 1;
      }
      if (aTrump && bTrump) {
        return trumpSortValue(a, contract) - trumpSortValue(b, contract);
      }
    }

    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) {
      return suitDiff;
    }
    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
  });
}

function isSortTrump(card: Card, contract: Contract): boolean {
  if (card.rank === "O") {
    return true;
  }
  if (card.rank === "U") {
    return contract.kind !== "geier";
  }
  if (contract.kind === "geier" || contract.kind === "wenz") {
    return false;
  }
  if (contract.kind === "farbwenz" || contract.kind === "solo" || contract.kind === "farbsolo") {
    return card.suit === contract.suit;
  }
  return card.suit === "herz";
}

function trumpSortValue(card: Card, contract: Contract): number {
  const suitOrder: Suit[] = ["eichel", "gras", "herz", "schelln"];
  const rankOrder: Rank[] = ["A", "10", "K", "9", "8", "7"];
  if (card.rank === "O") {
    return suitOrder.indexOf(card.suit);
  }
  if (card.rank === "U") {
    return 10 + suitOrder.indexOf(card.suit);
  }
  return 20 + rankOrder.indexOf(card.rank);
}
