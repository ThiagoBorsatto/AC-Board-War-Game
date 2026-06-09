// ============================================================
// KINGDOM WAR — Combat Engine
// Referência: UC-10, UC-03
// ============================================================

import {
  TroopClass,
  UpgradeLevel,
  type TroopStats,
  type CombatResult,
  type Player,
} from '../types';
import {
  BASE_STATS,
  UPGRADE_BONUS,
  TYPE_ADVANTAGE,
  TYPE_ADVANTAGE_MULTIPLIER,
} from '../constants';

// ------------------------------------------------------------
// Calcula stats efetivos de uma tropa considerando upgrade
// ------------------------------------------------------------

export function getEffectiveStats(
  troopClass: TroopClass,
  upgradeLevel: UpgradeLevel
): TroopStats {
  const base = BASE_STATS[troopClass];
  const bonus = UPGRADE_BONUS[troopClass][upgradeLevel];
  return {
    force:   base.force   + bonus.force,
    defense: base.defense + bonus.defense,
    speed:   base.speed   + bonus.speed,
  };
}

// ------------------------------------------------------------
// Determina vantagem de tipo entre atacante e defensor
// Retorna: 'ATTACKER' | 'DEFENDER' | 'NEUTRAL'
// ------------------------------------------------------------

export function getTypeAdvantage(
  attackerClass: TroopClass,
  defenderClass: TroopClass
): CombatResult['typeAdvantage'] {
  const value = TYPE_ADVANTAGE[attackerClass][defenderClass];
  if (value > 0) return 'ATTACKER';
  if (value < 0) return 'DEFENDER';
  return 'NEUTRAL';
}

// ------------------------------------------------------------
// Resolve um combate entre atacante e defensor
// UC-10: sem RNG — resultado determinístico por stats
//
// Fórmula:
//   powerScore = force * (1 + speed * 0.05)
//   Se vantagem de tipo → powerScore do lado favorecido × 1.5
//   Vencedor = maior powerScore
//   Baixas = diferença proporcional ao powerScore do perdedor
// ------------------------------------------------------------

export function resolveCombat(
  attackerClass: TroopClass,
  attackerUpgrade: UpgradeLevel,
  attackerCount: number,
  defenderClass: TroopClass,
  defenderUpgrade: UpgradeLevel,
  defenderCount: number
): CombatResult {
  const atkStats = getEffectiveStats(attackerClass, attackerUpgrade);
  const defStats = getEffectiveStats(defenderClass, defenderUpgrade);

  // Power score base: força amplificada pela velocidade
  let atkPower = atkStats.force * (1 + atkStats.speed * 0.05);
  let defPower = defStats.defense * (1 + defStats.speed * 0.05);

  const typeAdv = getTypeAdvantage(attackerClass, defenderClass);

  if (typeAdv === 'ATTACKER') {
    atkPower *= TYPE_ADVANTAGE_MULTIPLIER;
  } else if (typeAdv === 'DEFENDER') {
    defPower *= TYPE_ADVANTAGE_MULTIPLIER;
  }

  // Poder total = poder unitário × quantidade de tropas
  const totalAtkPower = atkPower * attackerCount;
  const totalDefPower = defPower * defenderCount;

  // UC-10 FA-10A: empate favorece o defensor
  const attackerWon = totalAtkPower > totalDefPower;

  // Cálculo de baixas:
  // Perdedor perde proporcional à diferença de poder
  // Vencedor perde uma fração menor (resistência)
  const powerRatio = attackerWon
    ? totalAtkPower / Math.max(totalDefPower, 1)
    : totalDefPower / Math.max(totalAtkPower, 1);

  let attackerLosses: number;
  let defenderLosses: number;

  if (attackerWon) {
    // Defensor perde tudo (território é conquistado)
    defenderLosses = defenderCount;
    // Atacante perde proporcional à resistência do defensor
    attackerLosses = Math.max(
      1,
      Math.floor(attackerCount / powerRatio)
    );
    // Nunca perde mais do que tem (menos 1 — precisa ocupar território)
    attackerLosses = Math.min(attackerLosses, attackerCount - 1);
  } else {
    // Atacante perde tudo
    attackerLosses = attackerCount;
    // Defensor perde proporcional
    defenderLosses = Math.max(
      0,
      Math.floor(defenderCount / powerRatio)
    );
  }

  return {
    attackerLosses,
    defenderLosses,
    attackerWon,
    attackerClass,
    defenderClass,
    typeAdvantage: typeAdv,
  };
}

// ------------------------------------------------------------
// Retorna a classe dominante das tropas de um território
// (a que tem maior quantidade; desempate por ordem de força)
// ------------------------------------------------------------

export function getDominantClass(
  troops: { class: TroopClass; quantity: number }[]
): TroopClass {
  if (troops.length === 0) return TroopClass.Infantry;

  const sorted = [...troops].sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    // Desempate por força base
    return BASE_STATS[b.class].force - BASE_STATS[a.class].force;
  });

  return sorted[0].class;
}

// ------------------------------------------------------------
// Valida se um ataque pode ser iniciado (UC-03 pré-condições)
// ------------------------------------------------------------

export interface AttackValidation {
  valid: boolean;
  reason?: string;
}

export function validateAttack(
  fromTerritoryOwnerId: string | null,
  toTerritoryOwnerId: string | null,
  attackerPlayerId: string,
  adjacentIds: string[],
  toTerritoryId: string,
  fromTroopCount: number
): AttackValidation {
  if (fromTerritoryOwnerId !== attackerPlayerId) {
    return { valid: false, reason: 'Território de origem não pertence ao jogador.' };
  }
  if (toTerritoryOwnerId === attackerPlayerId) {
    return { valid: false, reason: 'Não é possível atacar seu próprio território.' };
  }
  if (!adjacentIds.includes(toTerritoryId)) {
    return { valid: false, reason: 'Território de destino não é adjacente.' };
  }
  if (fromTroopCount < 2) {
    return { valid: false, reason: 'É necessário ao menos 2 tropas para atacar.' };
  }
  return { valid: true };
}
