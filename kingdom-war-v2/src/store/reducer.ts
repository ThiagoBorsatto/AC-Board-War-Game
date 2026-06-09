// ============================================================
// KINGDOM WAR — Game Reducer v2
// Fix: ataque sempre mantém ≥1 tropa no origem
// Fix: remanejamento com quantidade customizada
// ============================================================

import { GameStatus, GamePhase } from '../types';
import type { GameState, GameAction, TerritoryId } from '../types';
import { resolveCombat, getDominantClass, validateAttack } from '../engine/combat';
import { advancePhase, tickTimer, validateReposition, countTroops, addTroops, removeTroops } from '../engine/turns';
import { checkVictory, processElimination, shouldEliminate } from '../engine/victory';
import { applyUpgrade } from '../engine/economy';
import { isValidTrade, processTrade, drawCard } from '../engine/cards';
import { FORTRESS_DAMAGE_PER_ATTACK } from '../constants';
import { saveToLocalStorage } from './persistence';

// ── Helper: garante mínimo de tropas num território ──────────
function ensureMinTroops(
  troops: ReturnType<typeof removeTroops>
): ReturnType<typeof removeTroops> {
  const total = troops.reduce((s, u) => s + u.quantity, 0);
  if (total >= 1) return troops;
  // Adiciona 1 Infantaria de emergência
  return [{ class: 'INFANTRY' as any, quantity: 1 }];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'SETUP_GAME':
      return { ...state, status: GameStatus.Setup };

    // ── DISTRIBUIR TROPAS ────────────────────────────────────
    case 'DISTRIBUTE_TROOPS': {
      const { territoryId, troopClass, quantity } = action.payload;
      const { turn, territories } = state;

      if (turn.phase !== GamePhase.Distribution) return state;
      if (turn.troopsToDistribute < quantity || quantity <= 0) return state;

      const territory = territories[territoryId];
      if (!territory || territory.ownerId !== turn.currentPlayerId) return state;

      const newState = {
        ...state,
        territories: {
          ...territories,
          [territoryId]: {
            ...territory,
            troops: addTroops(territory.troops, troopClass, quantity),
          },
        },
        turn: { ...turn, troopsToDistribute: turn.troopsToDistribute - quantity },
      };
      saveToLocalStorage(newState);
      return newState;
    }

    // ── ATAQUE ───────────────────────────────────────────────
    case 'ATTACK': {
      const { fromId, toId, attackingClass } = action.payload;
      const { turn, territories, players } = state;

      if (turn.phase !== GamePhase.Attack) return state;

      const fromTerritory = territories[fromId];
      const toTerritory   = territories[toId];
      if (!fromTerritory || !toTerritory) return state;

      // BUG FIX 1: usa adjacentIds do território no estado (populado pelo initializeGame)
      const validation = validateAttack(
        fromTerritory.ownerId,
        toTerritory.ownerId,
        turn.currentPlayerId,
        fromTerritory.adjacentIds,
        toId,
        countTroops(fromTerritory.troops)
      );
      if (!validation.valid) return state;

      const attackerPlayer  = players.find(p => p.id === turn.currentPlayerId)!;
      const defenderPlayer  = players.find(p => p.id === toTerritory.ownerId);
      const defenderClass   = getDominantClass(toTerritory.troops);
      const attackerUpgrade = attackerPlayer.upgradeLevel[attackingClass];
      const defenderUpgrade = defenderPlayer?.upgradeLevel[defenderClass] ?? 0;

      const attackerCount = countTroops(fromTerritory.troops);
      const defenderCount = countTroops(toTerritory.troops);

      const result = resolveCombat(
        attackingClass, attackerUpgrade, attackerCount,
        defenderClass,  defenderUpgrade, defenderCount
      );

      let updatedTerritories = { ...territories };
      let updatedPlayers     = [...players];

      if (result.attackerWon) {
        // BUG FIX 2: atacante perde baixas mas mantém ≥1 no território de origem
        const afterLosses = removeTroops(fromTerritory.troops, result.attackerLosses);
        updatedTerritories[fromId] = {
          ...fromTerritory,
          troops: ensureMinTroops(afterLosses),
        };

        // Conquistou o território
        updatedTerritories[toId] = {
          ...toTerritory,
          ownerId: turn.currentPlayerId,
          troops: [{ class: attackingClass, quantity: 1 }],
          ...(toTerritory.hasFortress ? {
            fortressIntegrity: Math.max(0, toTerritory.fortressIntegrity - FORTRESS_DAMAGE_PER_ATTACK),
          } : {}),
        };

        updatedPlayers = updatedPlayers.map(p =>
          p.id === turn.currentPlayerId ? { ...p, hasConqueredThisTurn: true } : p
        );

        // Verifica eliminação
        if (defenderPlayer) {
          const tempState = { ...state, territories: updatedTerritories, players: updatedPlayers };
          if (shouldEliminate(defenderPlayer, updatedTerritories)) {
            const elim = processElimination(tempState, defenderPlayer.id, turn.currentPlayerId);
            updatedTerritories = elim.territories ?? updatedTerritories;
            updatedPlayers     = elim.players     ?? updatedPlayers;
          }
        }
      } else {
        // Atacante perdeu
        // BUG FIX 2: garante que o território de origem mantém ≥1 tropa
        const afterAttackerLoss = removeTroops(fromTerritory.troops, result.attackerLosses);
        updatedTerritories[fromId] = {
          ...fromTerritory,
          troops: ensureMinTroops(afterAttackerLoss),
        };
        // Defensor recebe baixas mas mantém ≥1
        const afterDefenderLoss = removeTroops(toTerritory.troops, result.defenderLosses);
        updatedTerritories[toId] = {
          ...toTerritory,
          troops: ensureMinTroops(afterDefenderLoss),
        };
      }

      // Recalcula caches
      updatedPlayers = updatedPlayers.map(p => ({
        ...p,
        territoryCount: Object.values(updatedTerritories).filter(t => t.ownerId === p.id).length,
        totalTroops: Object.values(updatedTerritories)
          .filter(t => t.ownerId === p.id)
          .reduce((s, t) => s + countTroops(t.troops), 0),
      }));

      let newState: GameState = { ...state, territories: updatedTerritories, players: updatedPlayers };

      const victoryCheck = checkVictory(newState);
      if (victoryCheck.hasWinner) {
        newState = { ...newState, status: GameStatus.GameOver, winner: victoryCheck.winnerId };
      }

      saveToLocalStorage(newState);
      return newState;
    }

    // ── REMANEJAMENTO ────────────────────────────────────────
    case 'REPOSITION': {
      const { fromId, toId, quantity } = action.payload;
      const { turn, territories } = state;

      if (turn.phase !== GamePhase.Reposition) return state;

      const from = territories[fromId];
      const to   = territories[toId];
      if (!from || !to) return state;

      const validation = validateReposition(
        from.ownerId, to.ownerId, turn.currentPlayerId,
        from.adjacentIds, toId, countTroops(from.troops), quantity
      );
      if (!validation.valid) return state;

      const dominantClass = getDominantClass(from.troops);

      const newState = {
        ...state,
        territories: {
          ...territories,
          [fromId]: { ...from, troops: removeTroops(from.troops, quantity) },
          [toId]:   { ...to,   troops: addTroops(to.troops, dominantClass, quantity) },
        },
      };
      saveToLocalStorage(newState);
      return newState;
    }

    // ── COMPRAR UPGRADE ──────────────────────────────────────
    case 'BUY_UPGRADE': {
      const { troopClass } = action.payload;
      const currentPlayer = state.players.find(p => p.id === state.turn.currentPlayerId)!;
      try {
        const updated = applyUpgrade(currentPlayer, troopClass);
        const newState = {
          ...state,
          players: state.players.map(p => p.id === state.turn.currentPlayerId ? updated : p),
        };
        saveToLocalStorage(newState);
        return newState;
      } catch { return state; }
    }

    // ── TROCAR CARTAS ────────────────────────────────────────
    case 'TRADE_CARDS': {
      const { cardIds } = action.payload;
      const { players, turn, territories, deck } = state;

      if (turn.phase !== GamePhase.Distribution) return state;

      const currentPlayer = players.find(p => p.id === turn.currentPlayerId)!;
      const selected = currentPlayer.hand.filter(c => cardIds.includes(c.id));
      if (selected.length !== 3) return state;

      const triplet = selected as [typeof selected[0], typeof selected[0], typeof selected[0]];
      if (!isValidTrade(triplet)) return state;

      const ownedIds = Object.values(territories)
        .filter(t => t.ownerId === currentPlayer.id).map(t => t.id);

      const tradeResult = processTrade(triplet, turn.globalTradeCount, ownedIds);

      const newState = {
        ...state,
        deck: { ...deck, discard: [...deck.discard, ...triplet] },
        players: players.map(p =>
          p.id === currentPlayer.id
            ? { ...p, hand: p.hand.filter(c => !cardIds.includes(c.id)) }
            : p
        ),
        turn: {
          ...turn,
          troopsToDistribute: turn.troopsToDistribute + tradeResult.troopsGained,
          globalTradeCount: tradeResult.newGlobalTradeCount,
        },
      };
      saveToLocalStorage(newState);
      return newState;
    }

    case 'ADVANCE_PHASE': {
      const newState = advancePhase(state);
      saveToLocalStorage(newState);
      return newState;
    }

    case 'TICK_TIMER':
      return tickTimer(state);

    case 'LOAD_SAVED_STATE':
      return action.payload;

    case 'CLEAR_SAVED_STATE':
      localStorage.removeItem('kingdom-war-state');
      return { ...state, status: GameStatus.MainMenu };

    default:
      return state;
  }
}
