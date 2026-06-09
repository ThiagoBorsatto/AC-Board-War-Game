// ============================================================
// KINGDOM WAR — Victory & Elimination Engine v2
// FIX 1: vitória validada imediatamente dentro de processElimination
// ============================================================

import { GameStatus } from '../types';
import type { GameState, Player, Territory, TerritoryId } from '../types';

// ------------------------------------------------------------
// RN-11.1 — Verifica se um jogador deve ser eliminado
// ------------------------------------------------------------

export function shouldEliminate(
  player: Player,
  territories: Record<TerritoryId, Territory>
): boolean {
  const fortress = Object.values(territories).find(
    (t) => t.hasFortress && t.ownerId === player.id
  );
  if (fortress && fortress.fortressIntegrity <= 0) return true;

  const ownedTerritories = Object.values(territories).filter(
    (t) => t.ownerId === player.id
  );
  if (ownedTerritories.length === 0) {
    const totalTroops = ownedTerritories.reduce(
      (sum, t) => sum + t.troops.reduce((s, u) => s + u.quantity, 0),
      0
    );
    if (totalTroops === 0) return true;
  }
  return false;
}

// ------------------------------------------------------------
// UC-12 — Processa a eliminação + FIX 1: verifica vitória imediata
// ------------------------------------------------------------

export function processElimination(
  state: GameState,
  eliminatedPlayerId: string,
  conquerorPlayerId: string
): Partial<GameState> {
  const updatedTerritories = { ...state.territories };
  const updatedPlayers = state.players.map((p) => ({ ...p, hand: [...p.hand] }));

  const eliminated = updatedPlayers.find((p) => p.id === eliminatedPlayerId)!;
  const conqueror  = updatedPlayers.find((p) => p.id === conquerorPlayerId)!;

  // Transfere territórios ao conquistador
  Object.keys(updatedTerritories).forEach((id) => {
    if (updatedTerritories[id].ownerId === eliminatedPlayerId) {
      updatedTerritories[id] = {
        ...updatedTerritories[id],
        ownerId: conquerorPlayerId,
      };
    }
  });

  // Transfere cartas (UC-12 §3)
  conqueror.hand = [...conqueror.hand, ...eliminated.hand];
  eliminated.hand = [];
  eliminated.isActive = false;

  // Recalcula caches
  updatedPlayers.forEach((p) => {
    p.territoryCount = Object.values(updatedTerritories).filter(t => t.ownerId === p.id).length;
    p.totalTroops    = Object.values(updatedTerritories)
      .filter(t => t.ownerId === p.id)
      .reduce((sum, t) => sum + t.troops.reduce((s, u) => s + u.quantity, 0), 0);
  });

  // FIX 1: avalia objetivos e verifica vitória NO MOMENTO da eliminação
  const stateAfterElim: GameState = { ...state, players: updatedPlayers, territories: updatedTerritories };
  const playersEvaluated = evaluateSecretObjectives(stateAfterElim);
  const victoryCheck = checkVictory({ ...stateAfterElim, players: playersEvaluated });

  return {
    players: playersEvaluated,
    territories: updatedTerritories,
    ...(victoryCheck.hasWinner ? {
      status: GameStatus.GameOver,
      winner: victoryCheck.winnerId,
    } : {}),
  };
}

// ------------------------------------------------------------
// UC-11 — Verifica condições de vitória
// ------------------------------------------------------------

export interface VictoryCheck {
  hasWinner: boolean;
  winnerId: string | null;
  condition: 'SURVIVAL' | 'SECRET_OBJECTIVE' | null;
}

export function checkVictory(state: GameState): VictoryCheck {
  const activePlayers = state.players.filter((p) => p.isActive);

  if (activePlayers.length === 1) {
    return { hasWinner: true, winnerId: activePlayers[0].id, condition: 'SURVIVAL' };
  }

  for (const player of activePlayers) {
    if (player.secretObjective.isFulfilled) {
      return { hasWinner: true, winnerId: player.id, condition: 'SECRET_OBJECTIVE' };
    }
  }

  return { hasWinner: false, winnerId: null, condition: null };
}

// ------------------------------------------------------------
// Avalia cumprimento dos objetivos secretos
// ------------------------------------------------------------

export function evaluateSecretObjectives(state: GameState): GameState['players'] {
  return state.players.map((player) => {
    if (!player.isActive) return player;

    const obj = player.secretObjective;
    let isFulfilled = obj.isFulfilled;

    switch (obj.type) {
      case 'CONQUER_N_TERRITORIES': {
        const count = Object.values(state.territories).filter(t => t.ownerId === player.id).length;
        isFulfilled = count >= (obj.targetCount ?? 0);
        break;
      }
      case 'ELIMINATE_PLAYER': {
        const target = state.players.find(p => p.id === obj.targetPlayerId);
        isFulfilled = target ? !target.isActive : false;
        break;
      }
      case 'HOLD_CONTINENTS': {
        isFulfilled = false;
        break;
      }
      case 'SURVIVAL': {
        isFulfilled = false;
        break;
      }
    }

    return { ...player, secretObjective: { ...obj, isFulfilled } };
  });
}
