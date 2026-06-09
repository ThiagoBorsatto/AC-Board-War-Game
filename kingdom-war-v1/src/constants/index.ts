// ============================================================
// KINGDOM WAR — Constants
// Referência: doc 0001-26 v1.2 §5.4, §5.5, RN-14.2
// ============================================================

import { TroopClass, UpgradeLevel, CardSymbol } from '../types';
import type { TroopStats } from '../types';

// ------------------------------------------------------------
// Stats base das tropas (sem nenhum upgrade aplicado)
// ------------------------------------------------------------

export const BASE_STATS: Record<TroopClass, TroopStats> = {
  [TroopClass.Infantry]: { force: 5,  defense: 10, speed: 4 },
  [TroopClass.Artillery]: { force: 10, defense: 1,  speed: 3 },
  [TroopClass.Cavalry]:  { force: 7,  defense: 3,  speed: 8 },
};

// ------------------------------------------------------------
// Bônus cumulativos por nível de upgrade (§5.5)
// Cada nível representa o total acumulado sobre o base,
// NÃO o delta do nível anterior.
// ------------------------------------------------------------

export const UPGRADE_BONUS: Record<TroopClass, Record<UpgradeLevel, TroopStats>> = {
  [TroopClass.Infantry]: {
    [UpgradeLevel.Base]:     { force: 0, defense: 0, speed: 0 },
    [UpgradeLevel.Veteran]:  { force: 0, defense: 1, speed: 0 },
    [UpgradeLevel.Elite]:    { force: 1, defense: 2, speed: 0 },
    [UpgradeLevel.Champion]: { force: 1, defense: 3, speed: 1 },
  },
  [TroopClass.Artillery]: {
    [UpgradeLevel.Base]:     { force: 0, defense: 0, speed: 0 },
    [UpgradeLevel.Veteran]:  { force: 1, defense: 0, speed: 0 },
    [UpgradeLevel.Elite]:    { force: 3, defense: 0, speed: 1 },
    [UpgradeLevel.Champion]: { force: 4, defense: 1, speed: 1 },
  },
  [TroopClass.Cavalry]: {
    [UpgradeLevel.Base]:     { force: 0, defense: 0, speed: 0 },
    [UpgradeLevel.Veteran]:  { force: 1, defense: 0, speed: 1 },
    [UpgradeLevel.Elite]:    { force: 1, defense: 1, speed: 2 },
    [UpgradeLevel.Champion]: { force: 2, defense: 1, speed: 3 },
  },
};

// ------------------------------------------------------------
// Custo de upgrade por classe e nível (§5.5 tabela)
// ------------------------------------------------------------

export const UPGRADE_COST: Record<TroopClass, Record<UpgradeLevel, number>> = {
  [TroopClass.Infantry]: {
    [UpgradeLevel.Base]:     0,
    [UpgradeLevel.Veteran]:  100,
    [UpgradeLevel.Elite]:    250,
    [UpgradeLevel.Champion]: 500,
  },
  [TroopClass.Artillery]: {
    [UpgradeLevel.Base]:     0,
    [UpgradeLevel.Veteran]:  120,
    [UpgradeLevel.Elite]:    280,
    [UpgradeLevel.Champion]: 600,
  },
  [TroopClass.Cavalry]: {
    [UpgradeLevel.Base]:     0,
    [UpgradeLevel.Veteran]:  150,
    [UpgradeLevel.Elite]:    320,
    [UpgradeLevel.Champion]: 700,
  },
};

// Nome de exibição de cada nível
export const UPGRADE_LEVEL_NAME: Record<UpgradeLevel, string> = {
  [UpgradeLevel.Base]:     'Base',
  [UpgradeLevel.Veteran]:  'Veterano',
  [UpgradeLevel.Elite]:    'Elite',
  [UpgradeLevel.Champion]: 'Campeão',
};

// ------------------------------------------------------------
// Pedra-Papel-Tesoura entre classes (UC-10)
// Cavalaria > Infantaria > Artilharia > Cavalaria
// Valor: +1 = vantagem, -1 = desvantagem, 0 = neutro
// ------------------------------------------------------------

export const TYPE_ADVANTAGE: Record<TroopClass, Record<TroopClass, number>> = {
  [TroopClass.Cavalry]: {
    [TroopClass.Cavalry]:  0,
    [TroopClass.Infantry]: 1,   // Cavalaria VENCE Infantaria
    [TroopClass.Artillery]: -1, // Cavalaria PERDE para Artilharia
  },
  [TroopClass.Infantry]: {
    [TroopClass.Infantry]: 0,
    [TroopClass.Artillery]: 1,  // Infantaria VENCE Artilharia
    [TroopClass.Cavalry]: -1,   // Infantaria PERDE para Cavalaria
  },
  [TroopClass.Artillery]: {
    [TroopClass.Artillery]: 0,
    [TroopClass.Cavalry]: 1,    // Artilharia VENCE Cavalaria
    [TroopClass.Infantry]: -1,  // Artilharia PERDE para Infantaria
  },
};

// Multiplicador de dano aplicado quando há vantagem/desvantagem de tipo
export const TYPE_ADVANTAGE_MULTIPLIER = 1.5;

// ------------------------------------------------------------
// Progressão de trocas de cartas — RN-14.2
// Índice = número da troca (base 0)
// A partir da 7ª (índice 6+), aplica +5 sobre o anterior
// ------------------------------------------------------------

const CARD_TRADE_BASE_TABLE = [4, 6, 8, 10, 12, 15];

export function getCardTradeValue(globalTradeCount: number): number {
  if (globalTradeCount < CARD_TRADE_BASE_TABLE.length) {
    return CARD_TRADE_BASE_TABLE[globalTradeCount];
  }
  // A partir da 7ª troca: 15 + (n - 6) * 5
  const extra = globalTradeCount - (CARD_TRADE_BASE_TABLE.length - 1);
  return 15 + extra * 5;
}

// ------------------------------------------------------------
// Símbolos de cartas disponíveis para distribuição no deck
// (Curinga é especial, não entra na distribuição base)
// ------------------------------------------------------------

export const STANDARD_SYMBOLS = [
  CardSymbol.Square,
  CardSymbol.Triangle,
  CardSymbol.Circle,
];

export const WILDCARD_COUNT = 2;

// ------------------------------------------------------------
// Economia
// ------------------------------------------------------------

export const STARTING_GOLD = 500;         // UC-08
export const GOLD_BASE_PER_TURN = 10;     // valor base de ouro por turno (ajustável)
export const GOLD_PER_TERRITORY = 5;      // bônus por território controlado (UC-05)

// ------------------------------------------------------------
// Turno
// ------------------------------------------------------------

export const TURN_DURATION_SECONDS = 60;
export const MIN_TROOPS_PER_TERRITORY = 1; // território nunca pode ficar vazio
export const MIN_TROOPS_TO_ATTACK = 2;     // precisa ter ao menos 2 para atacar
export const MAX_CARDS_IN_HAND = 6;        // UC-09 FA-09C: troca obrigatória ao atingir 6
export const FORCED_TRADE_THRESHOLD = 6;  // mesmo valor, alias semântico

// ------------------------------------------------------------
// Fortaleza
// ------------------------------------------------------------

export const FORTRESS_MAX_INTEGRITY = 100;
export const FORTRESS_DAMAGE_PER_ATTACK = 17; // ~17 por ataque → 6 ataques para destruir (6×17=102 ≥ 100)

// ------------------------------------------------------------
// Distribuição inicial de tropas
// Baseado no número de territórios controlados no início
// ------------------------------------------------------------

export function getInitialTroopCount(territoryCount: number): number {
  // Regra clássica do WAR adaptada
  return Math.max(3, Math.floor(territoryCount / 2));
}

// Tropas base recebidas por turno (além do ouro)
export function getTurnBaseTroops(territoryCount: number): number {
  return Math.max(3, Math.floor(territoryCount / 3));
}

// ------------------------------------------------------------
// Cores padrão dos jogadores
// ------------------------------------------------------------

export const PLAYER_COLORS = [
  '#E63946', // Vermelho
  '#457B9D', // Azul
  '#2DC653', // Verde
  '#F4A261', // Laranja
  '#A8DADC', // Ciano
  '#9B5DE5', // Roxo
];
