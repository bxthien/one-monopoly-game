export type VesselToken =
  | 'ONE_APUS'
  | 'ONE_MAGENTA'
  | 'GANTRY_CRANE'
  | 'REEFER_TRUCK'
  | 'PILOT_BOAT'
  | 'BUNKER_BARGE';

export type TileType =
  | 'GO'
  | 'PORT'
  | 'SERVICE_LINE'
  | 'INFRA'
  | 'TAX'
  | 'CUSTOMS_HOLD'
  | 'FREE_ANCHOR'
  | 'GO_TO_HOLD'
  | 'MARKET_CARD'
  | 'OPS_CARD';

export type LoopGroup =
  | 'INTRA_ASIA'
  | 'MIDDLE_EAST'
  | 'MEDITERRANEAN'
  | 'NORTH_EUROPE'
  | 'TRANS_PACIFIC_WEST'
  | 'TRANS_PACIFIC_EAST'
  | 'LATIN_AMERICA'
  | 'GLOBAL_HUB';

export interface BoardTile {
  id: number;
  code: string;
  name: string;
  type: TileType;
  group?: LoopGroup;
  price?: number;
  rentTiers?: [number, number, number, number, number, number]; // [base, 1c, 2c, 3c, 4c, mega]
  buildCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
}

export interface PropertyState {
  ownerId: string | null;
  containerLevel: number; // 0..4 (Containers), 5 = Mega Terminal
  isMortgaged: boolean;
}

export interface Player {
  id: string;
  name: string;
  token: VesselToken;
  balance: number;
  position: number;
  inHold: boolean;
  holdTurns: number;
  customsClearancePasses: number;
  isBankrupt: boolean;
  bankruptTo?: string | 'BANK';
  isOnline: boolean;
}

export type CardType = 'MARKET' | 'OPS';

export type CardEffectType =
  | 'CASH'
  | 'MOVE_TO'
  | 'MOVE_STEPS'
  | 'GO_TO_HOLD'
  | 'GET_PASS'
  | 'PAY_PER_CONTAINER'
  | 'COLLECT_FROM_PLAYERS'
  | 'PAY_PLAYERS';

export interface CardEffect {
  type: CardEffectType;
  amount?: number;
  targetTile?: number;
  steps?: number;
  perContainerAmount?: number;
  perMegaTerminalAmount?: number;
}

export interface GameCard {
  id: string;
  type: CardType;
  title: string;
  description: string;
  effect: CardEffect;
}

export type TurnPhase =
  | 'WAIT_FOR_ROLL'
  | 'AWAITING_BUY_DECISION'
  | 'AWAITING_DEBT_RESOLUTION'
  | 'END_OF_TURN';

export interface DebtInfo {
  creditorId: string | 'BANK';
  amount: number;
  reason: string;
  tileId?: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  activePlayerIndex: number;
  properties: Record<number, PropertyState>;
  phase: TurnPhase;
  dice: [number, number];
  consecutiveDoubles: number;
  hasRolled: boolean;
  marketDeck: string[]; // Card IDs
  opsDeck: string[]; // Card IDs
  pendingDebt: DebtInfo | null;
  winnerId: string | null;
  turnCount: number;
  gameStarted: boolean;
}

export type GameAction =
  | { type: 'ROLL_DICE'; forcedDice?: [number, number] }
  | { type: 'BUY_PROPERTY' }
  | { type: 'SKIP_BUY' }
  | { type: 'BUILD_CONTAINER'; tileId: number }
  | { type: 'SELL_CONTAINER'; tileId: number }
  | { type: 'MORTGAGE_TILE'; tileId: number }
  | { type: 'UNMORTGAGE_TILE'; tileId: number }
  | { type: 'PAY_HOLD_FINE' }
  | { type: 'USE_CLEARANCE_PASS' }
  | { type: 'SETTLE_DEBT' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'END_TURN' };

export type GameEvent =
  | { type: 'DICE_ROLLED'; playerId: string; dice: [number, number]; isDouble: boolean }
  | { type: 'SHIP_STEPPED'; playerId: string; from: number; to: number }
  | { type: 'PASSED_GO'; playerId: string; reward: number }
  | { type: 'SENT_TO_HOLD'; playerId: string; reason: string }
  | { type: 'RELEASED_FROM_HOLD'; playerId: string; method: 'DICE_DOUBLE' | 'FINE' | 'PASS' }
  | { type: 'TILE_PURCHASED'; playerId: string; tileId: number; price: number }
  | { type: 'CONTAINER_BUILT'; playerId: string; tileId: number; newLevel: number; cost: number }
  | { type: 'CONTAINER_SOLD'; playerId: string; tileId: number; newLevel: number; refund: number }
  | { type: 'TILE_MORTGAGED'; playerId: string; tileId: number; amount: number }
  | { type: 'TILE_UNMORTGAGED'; playerId: string; tileId: number; cost: number }
  | { type: 'DEMURRAGE_PAID'; debtorId: string; creditorId: string; tileId: number; amount: number }
  | { type: 'TAX_PAID'; playerId: string; tileId: number; amount: number }
  | { type: 'CARD_DRAWN'; playerId: string; card: GameCard }
  | { type: 'DEBT_CREATED'; debtorId: string; creditorId: string | 'BANK'; amount: number; reason: string }
  | { type: 'DEBT_SETTLED'; debtorId: string; creditorId: string | 'BANK'; amount: number }
  | { type: 'BALANCE_CHANGED'; playerId: string; newBalance: number; delta: number; reason: string }
  | { type: 'PLAYER_BANKRUPT'; debtorId: string; creditorId: string | 'BANK' }
  | { type: 'GAME_OVER'; winnerId: string };

export interface EngineResult {
  state: GameState;
  events: GameEvent[];
}
