// ============================================================
// KINGDOM WAR — Types & Interfaces
// Documento de referência: 0001-26 v1.2
// ============================================================

// ------------------------------------------------------------
// Enums
// ------------------------------------------------------------

export enum TroopClass {
  Infantry = 'INFANTRY',
  Artillery = 'ARTILLERY',
  Cavalry = 'CAVALRY',
}

export enum CardSymbol {
  Square = 'SQUARE',
  Triangle = 'TRIANGLE',
  Circle = 'CIRCLE',
  Wildcard = 'WILDCARD',
}

export enum GamePhase {
  Distribution = 'DISTRIBUTION', // Fase 1
  Attack = 'ATTACK',             // Fase 2
  Reposition = 'REPOSITION',     // Fase 3
}

export enum GameStatus {
  MainMenu = 'MAIN_MENU',
  Setup = 'SETUP',
  Playing = 'PLAYING',
  GameOver = 'GAME_OVER',
}

export enum UpgradeLevel {
  Base = 0,
  Veteran = 1,   // Veterano
  Elite = 2,     // Elite
  Champion = 3,  // Campeão
}

// ------------------------------------------------------------
// Stats
// ------------------------------------------------------------

export interface TroopStats {
  force: number;
  defense: number;
  speed: number;
}

// ------------------------------------------------------------
// Troop Unit
// ------------------------------------------------------------

export interface TroopUnit {
  class: TroopClass;
  quantity: number;
}

// ------------------------------------------------------------
// Territory
// ------------------------------------------------------------

/** ID segue o padrão "territorio-{n}" conforme SVGs */
export type TerritoryId = string;

export interface Territory {
  id: TerritoryId;           // ex: "territorio-1"
  name: string;
  adjacentIds: TerritoryId[]; // territórios que pode atacar/remanejamento
  ownerId: string | null;    // playerId ou null (não ocupado)
  troops: TroopUnit[];       // unidades presentes
  hasFortress: boolean;      // fortaleza posicionada aqui
  fortressIntegrity: number; // 0–100; chega a 0 = jogador eliminado
}

// ------------------------------------------------------------
// Card (UC-14)
// ------------------------------------------------------------

export interface Card {
  id: string;
  symbol: CardSymbol;
  territoryId: TerritoryId | null; // null = Curinga
}

export interface Deck {
  draw: Card[];    // baralho principal
  discard: Card[]; // pilha de descarte
}

// ------------------------------------------------------------
// Player
// ------------------------------------------------------------

export interface Player {
  id: string;
  name: string;
  color: string;           // hex, único por jogador
  isActive: boolean;       // false = eliminado
  gold: number;
  upgradeLevel: Record<TroopClass, UpgradeLevel>;
  hand: Card[];            // cartas na mão (máx 5 normalmente, 6 = troca obrigatória)
  secretObjective: SecretObjective;
  hasConqueredThisTurn: boolean; // flag UC-09/UC-03
  territoryCount: number;  // cache atualizado pelo engine
  totalTroops: number;     // cache atualizado pelo engine
}

// ------------------------------------------------------------
// Secret Objective (UC-06)
// ------------------------------------------------------------

export type ObjectiveType =
  | 'ELIMINATE_PLAYER'      // eliminar jogador específico
  | 'CONQUER_N_TERRITORIES' // conquistar X territórios
  | 'HOLD_CONTINENTS'       // controlar continentes específicos
  | 'SURVIVAL';             // objetivo padrão: ser o último

export interface SecretObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  isFulfilled: boolean;
  // payload flexível dependendo do tipo
  targetPlayerId?: string;
  targetCount?: number;
  targetContinents?: string[];
}

// ------------------------------------------------------------
// Turn & Phase State
// ------------------------------------------------------------

export interface TurnState {
  currentPlayerId: string;
  phase: GamePhase;
  timeRemaining: number;    // segundos, 0–60
  troopsToDistribute: number;
  globalTradeCount: number; // UC-14 RN-14.2 — contador global de trocas
}

// ------------------------------------------------------------
// Game State (raiz do estado)
// ------------------------------------------------------------

export interface GameState {
  status: GameStatus;
  players: Player[];
  territories: Record<TerritoryId, Territory>;
  turn: TurnState;
  deck: Deck;
  winner: string | null;   // playerId do vencedor
  turnNumber: number;
}

// ------------------------------------------------------------
// Combat (UC-10)
// ------------------------------------------------------------

export interface CombatResult {
  attackerLosses: number;
  defenderLosses: number;
  attackerWon: boolean;
  attackerClass: TroopClass;
  defenderClass: TroopClass;
  typeAdvantage: 'ATTACKER' | 'DEFENDER' | 'NEUTRAL';
}

// ------------------------------------------------------------
// Actions (Reducer)
// ------------------------------------------------------------

export type GameAction =
  | { type: 'SETUP_GAME'; payload: { players: Pick<Player, 'id' | 'name' | 'color'>[] } }
  | { type: 'DISTRIBUTE_TROOPS'; payload: { territoryId: TerritoryId; troopClass: TroopClass; quantity: number } }
  | { type: 'ATTACK'; payload: { fromId: TerritoryId; toId: TerritoryId; attackingClass: TroopClass } }
  | { type: 'REPOSITION'; payload: { fromId: TerritoryId; toId: TerritoryId; quantity: number } }
  | { type: 'BUY_UPGRADE'; payload: { troopClass: TroopClass } }
  | { type: 'TRADE_CARDS'; payload: { cardIds: [string, string, string] } }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'TICK_TIMER' }
  | { type: 'LOAD_SAVED_STATE'; payload: GameState }
  | { type: 'CLEAR_SAVED_STATE' };
