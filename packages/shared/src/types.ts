export const VESSEL_TOKENS = [
  'ONE_APUS',
  'ONE_MAGENTA',
  'GANTRY_CRANE',
  'CONTAINER_TRUCK',
  'FREIGHT_TRAIN',
  'REEFER_TRUCK',
  'PILOT_BOAT',
  'BUNKER_BARGE',
] as const;

export type VesselToken = (typeof VESSEL_TOKENS)[number];

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
  rentTiers?: [number, number, number, number, number, number]; // [base, 1c, 2c, 3c, 4c, ONE Innovation]
  buildCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
}

export interface SlotCharterAgreement {
  partnerId: string; // The partner sharing the slot
  active: boolean; // True until a 3rd party triggers the split
}

export interface PropertyState {
  ownerId: string | null;
  containerLevel: number; // 0..4 (Lô Container Magenta), 5 = Siêu tàu ONE Innovation (24.000 TEU)
  isMortgaged: boolean;
  hasGreenFleet?: boolean; // Nâng cấp Tàu Nhiên liệu Xanh (Methanol / Ammonia)
  slotCharter?: SlotCharterAgreement | null; // Cơ chế "As ONE, We Can"
}

export interface SecretMissionCard {
  id: string;
  title: string;
  description: string;
  reward: number;
  isCompleted: boolean;
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
  secretMission?: SecretMissionCard;
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
  | 'AWAITING_SLOT_CHARTER_RESPONSE'
  | 'AWAITING_DEBT_RESOLUTION'
  | 'END_OF_TURN';

export type CharterRent =
  | { type: 'DISCOUNT' }
  | { type: 'SPLIT'; partnerId: string };

export interface DebtInfo {
  creditorId: string | 'BANK';
  amount: number;
  reason: string;
  tileId?: number;
  charterRent?: CharterRent;
}

export interface PendingSlotCharter {
  requesterId: string;
  ownerId: string;
  tileId: number;
  originalRent: number;
  discountedRent: number;
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
  pendingSlotCharter: PendingSlotCharter | null;
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
  | { type: 'UPGRADE_GREEN_FLEET'; tileId: number }
  | { type: 'PROPOSE_SLOT_CHARTER'; tileId: number }
  | { type: 'RESPOND_SLOT_CHARTER'; accept: boolean }
  | { type: 'CLAIM_MISSION_REWARD' }
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
  | { type: 'GREEN_FLEET_UPGRADED'; playerId: string; tileId: number; cost: number }
  | { type: 'SLOT_CHARTER_PROPOSED'; requesterId: string; ownerId: string; tileId: number }
  | { type: 'SLOT_CHARTER_ACCEPTED'; requesterId: string; ownerId: string; tileId: number; rentPaid: number }
  | { type: 'SLOT_CHARTER_REJECTED'; requesterId: string; ownerId: string; tileId: number }
  | { type: 'SLOT_CHARTER_RENT_SPLIT'; visitorId: string; ownerId: string; partnerId: string; tileId: number; splitAmount: number; ownerAmount: number }
  | { type: 'MISSION_COMPLETED'; playerId: string; mission: SecretMissionCard; reward: number }
  | { type: 'TILE_MORTGAGED'; playerId: string; tileId: number; amount: number }
  | { type: 'TILE_UNMORTGAGED'; playerId: string; tileId: number; cost: number }
  | { type: 'DEMURRAGE_PAID'; debtorId: string; creditorId: string; tileId: number; amount: number }
  | { type: 'TAX_PAID'; playerId: string; tileId: number; amount: number }
  | { type: 'CARBON_TAX_EXEMPTED'; playerId: string; tileId: number; reason: string }
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
