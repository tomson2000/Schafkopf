export type Suit = "eichel" | "gras" | "herz" | "schelln";
export type Rank = "7" | "8" | "9" | "U" | "O" | "K" | "10" | "A";
export type BotStrength = "leicht" | "mittel" | "stark";
export type RoundPhase = "waiting" | "bidding" | "doubling" | "playing" | "round_over";

export type ContractKind =
  | "pass"
  | "rufspiel"
  | "wenz"
  | "geier"
  | "solo"
  | "farbwenz"
  | "farbsolo"
  | "ramsch";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  botStrength?: BotStrength;
  seat: number;
}

export interface RulesConfig {
  allowRufspiel: boolean;
  allowWenz: boolean;
  allowGeier: boolean;
  allowSolo: boolean;
  allowFarbsolo: boolean;
  allowFarbwenz: boolean;
  allowRamsch: boolean;
  allowKontraRetour: boolean;
  allowStoss: boolean;
  allowSpritze: boolean;
  countLaufende: boolean;
}

export interface Contract {
  kind: ContractKind;
  suit?: Suit;
  callerId?: string;
  partnerId?: string;
  calledAceSuit?: Suit;
}

export interface BidChoice {
  playerId: string;
  contract: Contract;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface Trick {
  leaderId: string;
  cards: PlayedCard[];
  winnerId?: string;
}

export interface TeamInfo {
  re: string[];
  kontra: string[];
}

export interface RoundResult {
  winners: string[];
  losers: string[];
  pointsByPlayer: Record<string, number>;
  trickPointsByTeam: {
    re: number;
    kontra: number;
  };
  scoreDelta: Record<string, number>;
  summary: string;
}

export interface RoundState {
  dealerIndex: number;
  phase: RoundPhase;
  turnPlayerId?: string;
  hands: Record<string, Card[]>;
  talon: Card[];
  bids: BidChoice[];
  contract?: Contract;
  declarations: {
    kontraBy?: string;
    retourBy?: string;
    stossBy: string[];
    spritzeBy: string[];
    passed: string[];
  };
  teams: TeamInfo;
  currentTrick: Trick;
  completedTricks: Trick[];
  scores: Record<string, number>;
  result?: RoundResult;
}

export interface LobbyState {
  roomCode: string;
  hostId: string;
  players: Player[];
  matchScores: Record<string, number>;
  config: {
    botStrength: BotStrength;
    rules: RulesConfig;
  };
  round: RoundState;
  createdAt: number;
}

export interface PublicPlayerView extends Player {
  handCount: number;
  hand?: Card[];
}

export interface PublicState {
  selfId: string;
  roomCode: string;
  hostId: string;
  players: PublicPlayerView[];
  matchScores: Record<string, number>;
  config: LobbyState["config"];
  round: RoundState;
}

export interface PlayerAction {
  type: "bid" | "declare" | "play" | "new_round";
  contract?: Contract;
  declaration?: "pass" | "kontra" | "retour" | "stoss" | "spritze";
  cardId?: string;
}

export const DEFAULT_RULES: RulesConfig = {
  allowRufspiel: true,
  allowWenz: true,
  allowGeier: true,
  allowSolo: true,
  allowFarbsolo: true,
  allowFarbwenz: true,
  allowRamsch: true,
  allowKontraRetour: true,
  allowStoss: true,
  allowSpritze: true,
  countLaufende: true
};
