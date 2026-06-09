// ============================================================
// KINGDOM WAR — Victory & Elimination Engine
// Referência: UC-11, UC-12, RN-11.1
// ============================================================

import type { GameState, Player, Territory, TerritoryId } from '../types';
import { GameStatus } from '../types';

// ------------------------------------------------------------
// RN-11.1 — Verifica se um jogador deve ser eliminado
// Condições:
//   (a) Fortaleza com integridade zero
//   (b) Sem territórios E sem tropas
// ------------------------------------------------------------

export function shouldEliminate(
  player: Player,
  territories: Record<TerritoryId, Territory>
): boolean {
  // Condição (a): fortaleza destruída
  const fortress = Object.values(territories).find(
    (t) => t.hasFortress && t.ownerId === player.id
  );

  if (fortress && fortress.fortressIntegrity <= 0) {
    return true;
  }

  // Condição (b): sem território e sem tropas
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
// UC-12 — Processa a eliminação de um jogador
// Transfere territórios, tropas e cartas ao conquistador
// Retorna o novo estado parcial
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

  // Transfere todos os territórios ao conquistador
  Object.keys(updatedTerritories).forEach((id) => {
    if (updatedTerritories[id].ownerId === eliminatedPlayerId) {
      updatedTerritories[id] = {
        ...updatedTerritories[id],
        ownerId: conquerorPlayerId,
        // Tropas do eliminado viram tropas do conquistador (mantidas no território)
      };
    }
  });

  // Transfere cartas da mão (UC-12 §3)
  conqueror.hand = [...conqueror.hand, ...eliminated.hand];
  eliminated.hand = [];
  eliminated.isActive = false;

  // Recalcula contagens de território
  updatedPlayers.forEach((p) => {
    p.territoryCount = Object.values(updatedTerritories).filter(
      (t) => t.ownerId === p.id
    ).length;
    p.totalTroops = Object.values(updatedTerritories)
      .filter((t) => t.ownerId === p.id)
      .reduce((sum, t) => sum + t.troops.reduce((s, u) => s + u.quantity, 0), 0);
  });

  return {
    players: updatedPlayers,
    territories: updatedTerritories,
  };
}

// ------------------------------------------------------------
// UC-11 — Verifica condições de vitória
// Retorna o playerId do vencedor ou null
// ------------------------------------------------------------

export interface VictoryCheck {
  hasWinner: boolean;
  winnerId: string | null;
  condition: 'SURVIVAL' | 'SECRET_OBJECTIVE' | null;
}

export function checkVictory(state: GameState): VictoryCheck {
  const activePlayers = state.players.filter((p) => p.isActive);

  // Condição 1: apenas 1 jogador restante
  if (activePlayers.length === 1) {
    return {
      hasWinner: true,
      winnerId: activePlayers[0].id,
      condition: 'SURVIVAL',
    };
  }

  // Condição 2: objetivo secreto cumprido
  for (const player of activePlayers) {
    if (player.secretObjective.isFulfilled) {
      return {
        hasWinner: true,
        winnerId: player.id,
        condition: 'SECRET_OBJECTIVE',
      };
    }
  }

  return { hasWinner: false, winnerId: null, condition: null };
}

// ------------------------------------------------------------
// Verifica e atualiza cumprimento dos objetivos secretos
// ------------------------------------------------------------

export function evaluateSecretObjectives(
  state: GameState
): GameState['players'] {
  return state.players.map((player) => {
    if (!player.isActive) return player;

    const obj = player.secretObjective;
    let isFulfilled = obj.isFulfilled;

    switch (obj.type) {
      case 'CONQUER_N_TERRITORIES': {
        const count = Object.values(state.territories).filter(
          (t) => t.ownerId === player.id
        ).length;
        isFulfilled = count >= (obj.targetCount ?? 0);
        break;
      }

      case 'ELIMINATE_PLAYER': {
        const target = state.players.find((p) => p.id === obj.targetPlayerId);
        isFulfilled = target ? !target.isActive : false;
        break;
      }

      case 'HOLD_CONTINENTS': {
        // Validação por continente é feita no mapa; aqui placeholder
        // A lógica real depende de quais territórios formam cada continente
        isFulfilled = false;
        break;
      }

      case 'SURVIVAL': {
        // Avaliado diretamente em checkVictory
        isFulfilled = false;
        break;
      }
    }

    return {
      ...player,
      secretObjective: { ...obj, isFulfilled },
    };
  });
}
