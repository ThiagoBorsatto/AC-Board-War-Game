// ============================================================
// KINGDOM WAR — Economy Engine
// Referência: UC-05, UC-08
// ============================================================

import { TroopClass, UpgradeLevel } from '../types';
import type { Player, Territory, TerritoryId } from '../types';
import {
  UPGRADE_COST,
  GOLD_BASE_PER_TURN,
  GOLD_PER_TERRITORY,
  getTurnBaseTroops,
} from '../constants';

// ------------------------------------------------------------
// Calcula o ouro gerado no início do turno do jogador (UC-05 §1)
// Base + bônus por número de territórios
// ------------------------------------------------------------

export function calcTurnGold(territoryCount: number): number {
  return GOLD_BASE_PER_TURN + territoryCount * GOLD_PER_TERRITORY;
}

// ------------------------------------------------------------
// Calcula tropas base recebidas no início do turno
// ------------------------------------------------------------

export function calcTurnTroops(territoryCount: number): number {
  return getTurnBaseTroops(territoryCount);
}

// ------------------------------------------------------------
// Retorna o próximo nível de upgrade disponível para uma classe
// UC-05 FA-05B: retorna null se já for Campeão
// ------------------------------------------------------------

export function getNextUpgradeLevel(
  currentLevel: UpgradeLevel
): UpgradeLevel | null {
  if (currentLevel === UpgradeLevel.Champion) return null;
  return (currentLevel + 1) as UpgradeLevel;
}

// ------------------------------------------------------------
// Valida se o jogador pode comprar o próximo upgrade
// ------------------------------------------------------------

export interface UpgradeValidation {
  canBuy: boolean;
  nextLevel: UpgradeLevel | null;
  cost: number;
  reason?: string;
}

export function validateUpgrade(
  player: Player,
  troopClass: TroopClass
): UpgradeValidation {
  const currentLevel = player.upgradeLevel[troopClass];
  const nextLevel = getNextUpgradeLevel(currentLevel);

  if (nextLevel === null) {
    return {
      canBuy: false,
      nextLevel: null,
      cost: 0,
      reason: 'Classe já está no nível máximo (Campeão).',
    };
  }

  const cost = UPGRADE_COST[troopClass][nextLevel];

  if (player.gold < cost) {
    return {
      canBuy: false,
      nextLevel,
      cost,
      reason: `Ouro insuficiente. Necessário: ${cost}. Disponível: ${player.gold}.`,
    };
  }

  return { canBuy: true, nextLevel, cost };
}

// ------------------------------------------------------------
// Aplica a compra de upgrade ao jogador
// Retorna o jogador atualizado
// ------------------------------------------------------------

export function applyUpgrade(
  player: Player,
  troopClass: TroopClass
): Player {
  const { canBuy, nextLevel, cost } = validateUpgrade(player, troopClass);

  if (!canBuy || nextLevel === null) {
    throw new Error(`Upgrade inválido para classe ${troopClass}.`);
  }

  return {
    ...player,
    gold: player.gold - cost,
    upgradeLevel: {
      ...player.upgradeLevel,
      [troopClass]: nextLevel,
    },
  };
}

// ------------------------------------------------------------
// Aplica ganhos de início de turno ao jogador
// (ouro + tropas base)
// ------------------------------------------------------------

export function applyTurnStart(
  player: Player,
  territories: Record<TerritoryId, Territory>
): { updatedPlayer: Player; troopsGained: number } {
  const ownedCount = Object.values(territories).filter(
    (t) => t.ownerId === player.id
  ).length;

  const goldGained  = calcTurnGold(ownedCount);
  const troopsGained = calcTurnTroops(ownedCount);

  return {
    updatedPlayer: {
      ...player,
      gold: player.gold + goldGained,
      territoryCount: ownedCount,
    },
    troopsGained,
  };
}
