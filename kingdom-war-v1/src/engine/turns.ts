// ============================================================
// KINGDOM WAR — Turn Engine
// Referência: UC-09, UC-02, UC-03, UC-04
// ============================================================

import { GamePhase } from '../types';
import type { GameState, Player, TerritoryId, TroopUnit, TroopClass } from '../types';
import { TURN_DURATION_SECONDS, MIN_TROOPS_PER_TERRITORY } from '../constants';
import { drawCard } from './cards';
import { applyTurnStart } from './economy';
import { evaluateSecretObjectives } from './victory';

// ------------------------------------------------------------
// Sequência de fases no turno
// ------------------------------------------------------------

const PHASE_SEQUENCE: GamePhase[] = [
  GamePhase.Distribution,
  GamePhase.Attack,
  GamePhase.Reposition,
];

export function nextPhase(current: GamePhase): GamePhase | null {
  const idx = PHASE_SEQUENCE.indexOf(current);
  if (idx === -1 || idx === PHASE_SEQUENCE.length - 1) return null; // fim do turno
  return PHASE_SEQUENCE[idx + 1];
}

// ------------------------------------------------------------
// Avança para a próxima fase ou próximo jogador
// UC-09 §3: ao encerrar Fase 3, saca carta se conquistou território
// ------------------------------------------------------------

export function advancePhase(state: GameState): GameState {
  const { turn, players, deck } = state;
  const next = nextPhase(turn.phase);

  if (next !== null) {
    // Ainda dentro do turno atual
    return {
      ...state,
      turn: {
        ...turn,
        phase: next,
        timeRemaining: TURN_DURATION_SECONDS,
      },
    };
  }

  // Fim da Fase 3 — encerra turno
  let updatedDeck = { ...deck };
  let updatedPlayers = [...players];
  const currentPlayer = updatedPlayers.find((p) => p.id === turn.currentPlayerId)!;

  // UC-09 §3: se conquistou território, saca carta
  if (currentPlayer.hasConqueredThisTurn) {
    const { deck: newDeck, card } = drawCard(updatedDeck);
    updatedDeck = newDeck;

    if (card) {
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === currentPlayer.id
          ? { ...p, hand: [...p.hand, card], hasConqueredThisTurn: false }
          : p
      );
    }
  } else {
    // Limpa flag de conquista
    updatedPlayers = updatedPlayers.map((p) =>
      p.id === currentPlayer.id ? { ...p, hasConqueredThisTurn: false } : p
    );
  }

  // Determina próximo jogador ativo
  const activeIds = updatedPlayers.filter((p) => p.isActive).map((p) => p.id);
  const currentIdx = activeIds.indexOf(turn.currentPlayerId);
  const nextPlayerId = activeIds[(currentIdx + 1) % activeIds.length];

  // Aplica ganhos de início de turno ao próximo jogador
  const nextPlayer = updatedPlayers.find((p) => p.id === nextPlayerId)!;
  const { updatedPlayer: nextPlayerAfterTurn, troopsGained } = applyTurnStart(
    nextPlayer,
    state.territories
  );

  updatedPlayers = updatedPlayers.map((p) =>
    p.id === nextPlayerId ? nextPlayerAfterTurn : p
  );

  // Avalia objetivos secretos
  updatedPlayers = evaluateSecretObjectives({ ...state, players: updatedPlayers });

  return {
    ...state,
    players: updatedPlayers,
    deck: updatedDeck,
    turnNumber: state.turnNumber + (nextPlayerId === activeIds[0] ? 1 : 0),
    turn: {
      ...turn,
      currentPlayerId: nextPlayerId,
      phase: GamePhase.Distribution,
      timeRemaining: TURN_DURATION_SECONDS,
      troopsToDistribute: troopsGained + turn.troopsToDistribute, // mantém sobras
    },
  };
}

// ------------------------------------------------------------
// Decrementa o timer — chamado a cada segundo pelo interval
// UC-09 §2: ao atingir 0 avança fase automaticamente
// ------------------------------------------------------------

export function tickTimer(state: GameState): GameState {
  if (state.turn.timeRemaining <= 0) {
    return advancePhase(state);
  }
  return {
    ...state,
    turn: {
      ...state.turn,
      timeRemaining: state.turn.timeRemaining - 1,
    },
  };
}

// ------------------------------------------------------------
// Valida redistribuição de tropas (UC-04)
// ------------------------------------------------------------

export interface RepositionValidation {
  valid: boolean;
  reason?: string;
}

export function validateReposition(
  fromOwnerId: string | null,
  toOwnerId: string | null,
  playerId: string,
  fromAdjacentIds: string[],
  toTerritoryId: string,
  fromTroopCount: number,
  quantity: number
): RepositionValidation {
  if (fromOwnerId !== playerId || toOwnerId !== playerId) {
    return { valid: false, reason: 'Ambos os territórios devem pertencer ao jogador.' };
  }
  if (!fromAdjacentIds.includes(toTerritoryId)) {
    return { valid: false, reason: 'Territórios não são adjacentes.' };
  }
  if (quantity <= 0) {
    return { valid: false, reason: 'Quantidade inválida.' };
  }
  // UC-04 FA-04A: deve restar ao menos 1 unidade no território de origem
  if (fromTroopCount - quantity < MIN_TROOPS_PER_TERRITORY) {
    return {
      valid: false,
      reason: `Deve restar ao menos ${MIN_TROOPS_PER_TERRITORY} tropa no território de origem.`,
    };
  }
  return { valid: true };
}

// ------------------------------------------------------------
// Helpers de contagem de tropas
// ------------------------------------------------------------

export function countTroops(troops: TroopUnit[]): number {
  return troops.reduce((sum, u) => sum + u.quantity, 0);
}

export function addTroops(
  troops: TroopUnit[],
  troopClass: TroopClass,
  quantity: number
): TroopUnit[] {
  const existing = troops.find((u) => u.class === troopClass);
  if (existing) {
    return troops.map((u) =>
      u.class === troopClass ? { ...u, quantity: u.quantity + quantity } : u
    );
  }
  return [...troops, { class: troopClass, quantity }];
}

export function removeTroops(
  troops: TroopUnit[],
  quantity: number
): TroopUnit[] {
  // Remove da classe com menor prioridade estratégica primeiro
  // (simplificação: remove proporcionalmente)
  let remaining = quantity;
  return troops
    .map((u) => {
      if (remaining <= 0) return u;
      const toRemove = Math.min(remaining, u.quantity);
      remaining -= toRemove;
      return { ...u, quantity: u.quantity - toRemove };
    })
    .filter((u) => u.quantity > 0);
}
