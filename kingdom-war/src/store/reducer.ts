// ============================================================
// KINGDOM WAR — Game Reducer
// Centraliza todas as mutações de estado via actions tipadas
// ============================================================

import { GameStatus, GamePhase } from '../types';
import type { GameState, GameAction, TerritoryId } from '../types';
import { resolveCombat, getDominantClass, validateAttack } from '../engine/combat';
import { advancePhase, tickTimer, validateReposition, countTroops, addTroops, removeTroops } from '../engine/turns';
import { checkVictory, processElimination, shouldEliminate } from '../engine/victory';
import { applyUpgrade } from '../engine/economy';
import { isValidTrade, processTrade, drawCard } from '../engine/cards';
import { initializeGame } from '../engine/init';
import { FORTRESS_DAMAGE_PER_ATTACK, MIN_TROOPS_PER_TERRITORY } from '../constants';
import { saveToLocalStorage } from './persistence';

// ------------------------------------------------------------
// Reducer principal
// ------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    // ----------------------------------------------------------
    // SETUP_GAME — UC-01 + UC-08
    // ----------------------------------------------------------
    case 'SETUP_GAME': {
      // territoryIds e adjacencyMap serão injetados pelo módulo de mapa
      // Por ora o reducer expõe a action; a integração completa ocorre
      // quando o componente de mapa registrar os territórios
      // Placeholder: estado de loading enquanto o mapa não carrega
      return { ...state, status: GameStatus.Setup };
    }

    // ----------------------------------------------------------
    // DISTRIBUTE_TROOPS — UC-02
    // ----------------------------------------------------------
    case 'DISTRIBUTE_TROOPS': {
      const { territoryId, troopClass, quantity } = action.payload;
      const { turn, territories, players } = state;

      if (turn.phase !== GamePhase.Distribution) return state;
      if (turn.troopsToDistribute < quantity) return state;

      const territory = territories[territoryId];
      if (!territory || territory.ownerId !== turn.currentPlayerId) return state;

      const updatedTerritories = {
        ...territories,
        [territoryId]: {
          ...territory,
          troops: addTroops(territory.troops, troopClass, quantity),
        },
      };

      const newState = {
        ...state,
        territories: updatedTerritories,
        turn: {
          ...turn,
          troopsToDistribute: turn.troopsToDistribute - quantity,
        },
      };

      saveToLocalStorage(newState);
      return newState;
    }

    // ----------------------------------------------------------
    // ATTACK — UC-03 + UC-10 + UC-11 + UC-12
    // ----------------------------------------------------------
    case 'ATTACK': {
      const { fromId, toId, attackingClass } = action.payload;
      const { turn, territories, players } = state;

      if (turn.phase !== GamePhase.Attack) return state;

      const fromTerritory = territories[fromId];
      const toTerritory   = territories[toId];

      const validation = validateAttack(
        fromTerritory.ownerId,
        toTerritory.ownerId,
        turn.currentPlayerId,
        fromTerritory.adjacentIds,
        toId,
        countTroops(fromTerritory.troops)
      );

      if (!validation.valid) return state;

      const attackerUpgrade = players.find(
        (p) => p.id === turn.currentPlayerId
      )!.upgradeLevel[attackingClass];

      const defenderClass  = getDominantClass(toTerritory.troops);
      const defenderPlayer = players.find((p) => p.id === toTerritory.ownerId);
      const defenderUpgrade = defenderPlayer?.upgradeLevel[defenderClass] ?? 0;

      const attackerCount = countTroops(fromTerritory.troops);
      const defenderCount = countTroops(toTerritory.troops);

      const result = resolveCombat(
        attackingClass,
        attackerUpgrade,
        attackerCount,
        defenderClass,
        defenderUpgrade,
        defenderCount
      );

      let updatedTerritories = { ...territories };
      let updatedPlayers = [...players];

      // Aplica baixas ao atacante
      updatedTerritories[fromId] = {
        ...fromTerritory,
        troops: removeTroops(fromTerritory.troops, result.attackerLosses),
      };

      if (result.attackerWon) {
        // Transfere território
        updatedTerritories[toId] = {
          ...toTerritory,
          ownerId: turn.currentPlayerId,
          troops: [{ class: attackingClass, quantity: 1 }], // move ao menos 1 tropa
        };

        // Reduz integridade da fortaleza se houver
        if (toTerritory.hasFortress) {
          const newIntegrity = Math.max(
            0,
            toTerritory.fortressIntegrity - FORTRESS_DAMAGE_PER_ATTACK
          );
          updatedTerritories[toId] = {
            ...updatedTerritories[toId],
            fortressIntegrity: newIntegrity,
          };
        }

        // Marca conquista no turno
        updatedPlayers = updatedPlayers.map((p) =>
          p.id === turn.currentPlayerId
            ? { ...p, hasConqueredThisTurn: true }
            : p
        );

        // Verifica eliminação do defensor (UC-12)
        if (defenderPlayer) {
          const defenderFullState = {
            ...state,
            territories: updatedTerritories,
            players: updatedPlayers,
          };

          if (shouldEliminate(defenderPlayer, updatedTerritories)) {
            const elimination = processElimination(
              defenderFullState,
              defenderPlayer.id,
              turn.currentPlayerId
            );
            updatedTerritories = elimination.territories ?? updatedTerritories;
            updatedPlayers = elimination.players ?? updatedPlayers;
          }
        }
      } else {
        // Defensor mantém território; aplica baixas
        updatedTerritories[toId] = {
          ...toTerritory,
          troops: removeTroops(toTerritory.troops, result.defenderLosses),
        };
      }

      // Recalcula caches
      updatedPlayers = updatedPlayers.map((p) => ({
        ...p,
        territoryCount: Object.values(updatedTerritories).filter(
          (t) => t.ownerId === p.id
        ).length,
        totalTroops: Object.values(updatedTerritories)
          .filter((t) => t.ownerId === p.id)
          .reduce((sum, t) => sum + countTroops(t.troops), 0),
      }));

      let newState: GameState = {
        ...state,
        territories: updatedTerritories,
        players: updatedPlayers,
      };

      // Verifica vitória (UC-11)
      const victoryCheck = checkVictory(newState);
      if (victoryCheck.hasWinner) {
        newState = {
          ...newState,
          status: GameStatus.GameOver,
          winner: victoryCheck.winnerId,
        };
      }

      saveToLocalStorage(newState);
      return newState;
    }

    // ----------------------------------------------------------
    // REPOSITION — UC-04
    // ----------------------------------------------------------
    case 'REPOSITION': {
      const { fromId, toId, quantity } = action.payload;
      const { turn, territories } = state;

      if (turn.phase !== GamePhase.Reposition) return state;

      const from = territories[fromId];
      const to   = territories[toId];

      const validation = validateReposition(
        from.ownerId,
        to.ownerId,
        turn.currentPlayerId,
        from.adjacentIds,
        toId,
        countTroops(from.troops),
        quantity
      );

      if (!validation.valid) return state;

      // Move a quantidade de tropas (mantendo composição proporcional)
      const dominantClass = getDominantClass(from.troops);

      const newState = {
        ...state,
        territories: {
          ...territories,
          [fromId]: {
            ...from,
            troops: removeTroops(from.troops, quantity),
          },
          [toId]: {
            ...to,
            troops: addTroops(to.troops, dominantClass, quantity),
          },
        },
      };

      saveToLocalStorage(newState);
      return newState;
    }

    // ----------------------------------------------------------
    // BUY_UPGRADE — UC-05
    // ----------------------------------------------------------
    case 'BUY_UPGRADE': {
      const { troopClass } = action.payload;
      const { players, turn } = state;

      const currentPlayer = players.find((p) => p.id === turn.currentPlayerId)!;

      try {
        const updatedPlayer = applyUpgrade(currentPlayer, troopClass);
        const newState = {
          ...state,
          players: players.map((p) =>
            p.id === turn.currentPlayerId ? updatedPlayer : p
          ),
        };
        saveToLocalStorage(newState);
        return newState;
      } catch {
        return state;
      }
    }

    // ----------------------------------------------------------
    // TRADE_CARDS — UC-14
    // ----------------------------------------------------------
    case 'TRADE_CARDS': {
      const { cardIds } = action.payload;
      const { players, turn, territories } = state;

      if (turn.phase !== GamePhase.Distribution) return state;

      const currentPlayer = players.find((p) => p.id === turn.currentPlayerId)!;
      const selectedCards = currentPlayer.hand.filter((c) => cardIds.includes(c.id));

      if (selectedCards.length !== 3) return state;

      const triplet = selectedCards as [typeof selectedCards[0], typeof selectedCards[0], typeof selectedCards[0]];

      if (!isValidTrade(triplet)) return state;

      const ownedTerritoryIds = Object.values(territories)
        .filter((t) => t.ownerId === currentPlayer.id)
        .map((t) => t.id);

      const tradeResult = processTrade(triplet, turn.globalTradeCount, ownedTerritoryIds);

      // Remove cartas da mão e coloca no descarte
      const { deck: updatedDeck } = state;
      const newDiscardPile = [...updatedDeck.discard, ...triplet];
      const newHand = currentPlayer.hand.filter((c) => !cardIds.includes(c.id));

      const newState = {
        ...state,
        deck: { ...updatedDeck, discard: newDiscardPile },
        players: players.map((p) =>
          p.id === currentPlayer.id ? { ...p, hand: newHand } : p
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

    // ----------------------------------------------------------
    // ADVANCE_PHASE — manual (UC-09 FA-09B)
    // ----------------------------------------------------------
    case 'ADVANCE_PHASE': {
      const newState = advancePhase(state);
      saveToLocalStorage(newState);
      return newState;
    }

    // ----------------------------------------------------------
    // TICK_TIMER — chamado pelo interval a cada segundo
    // ----------------------------------------------------------
    case 'TICK_TIMER': {
      return tickTimer(state);
    }

    // ----------------------------------------------------------
    // LOAD_SAVED_STATE — UC-07
    // ----------------------------------------------------------
    case 'LOAD_SAVED_STATE': {
      return action.payload;
    }

    // ----------------------------------------------------------
    // CLEAR_SAVED_STATE — UC-13
    // ----------------------------------------------------------
    case 'CLEAR_SAVED_STATE': {
      localStorage.removeItem('kingdom-war-state');
      return { ...state, status: GameStatus.MainMenu };
    }

    default:
      return state;
  }
}
