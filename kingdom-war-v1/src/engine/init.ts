// ============================================================
// KINGDOM WAR — Initialization Engine
// Referência: UC-08
// ============================================================

import {
  GamePhase,
  GameStatus,
  TroopClass,
  UpgradeLevel,
  CardSymbol,
  ObjectiveType,
} from '../types';
import type {
  GameState,
  Player,
  Territory,
  TerritoryId,
  SecretObjective,
} from '../types';
import {
  STARTING_GOLD,
  TURN_DURATION_SECONDS,
  PLAYER_COLORS,
  getInitialTroopCount,
} from '../constants';
import { generateDeck, shuffle } from './cards';
import { applyTurnStart } from './economy';

// ------------------------------------------------------------
// Mapa de adjacências — será preenchido com os dados reais dos SVGs
// Estrutura: Record<territoryId, adjacentIds[]>
// Por ora exposto como importável para o futuro módulo de mapa
// ------------------------------------------------------------

export type AdjacencyMap = Record<TerritoryId, TerritoryId[]>;

// ------------------------------------------------------------
// Posições fixas das fortalezas por jogador
// Definidas em src/data/territories.ts (FORTRESS_POSITIONS)
// Importadas aqui para centralizar a lógica de inicialização
// ------------------------------------------------------------

import { FORTRESS_POSITIONS } from '../data/territories';
const FORTRESS_TERRITORY_BY_PLAYER_INDEX: TerritoryId[] = FORTRESS_POSITIONS;

// ------------------------------------------------------------
// Objetivos secretos disponíveis na partida
// ------------------------------------------------------------

function generateObjectivePool(
  playerIds: string[],
  totalTerritories: number
): SecretObjective[] {
  const objectives: SecretObjective[] = [
    {
      id: 'obj-conquer-18',
      type: 'CONQUER_N_TERRITORIES',
      description: 'Conquiste 18 territórios.',
      isFulfilled: false,
      targetCount: 18,
    },
    {
      id: 'obj-conquer-24',
      type: 'CONQUER_N_TERRITORIES',
      description: 'Conquiste 24 territórios.',
      isFulfilled: false,
      targetCount: 24,
    },
    {
      id: 'obj-survival',
      type: 'SURVIVAL',
      description: 'Seja o último jogador ativo.',
      isFulfilled: false,
    },
  ];

  // Adiciona objetivo de eliminação para cada jogador
  playerIds.forEach((id, i) => {
    objectives.push({
      id: `obj-eliminate-${id}`,
      type: 'ELIMINATE_PLAYER',
      description: `Elimine o jogador ${i + 1}.`,
      isFulfilled: false,
      targetPlayerId: id,
    });
  });

  return shuffle(objectives);
}

// ------------------------------------------------------------
// UC-08 — Inicializa o estado completo da partida
// ------------------------------------------------------------

export function initializeGame(
  playerSetups: { id: string; name: string; color?: string }[],
  territoryIds: TerritoryId[],
  adjacencyMap: AdjacencyMap
): GameState {
  const numPlayers = playerSetups.length;

  // 1. Cria os jogadores
  const players: Player[] = playerSetups.map((setup, i) => ({
    id: setup.id,
    name: setup.name,
    color: setup.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length],
    isActive: true,
    gold: STARTING_GOLD,
    upgradeLevel: {
      [TroopClass.Infantry]: UpgradeLevel.Base,
      [TroopClass.Artillery]: UpgradeLevel.Base,
      [TroopClass.Cavalry]: UpgradeLevel.Base,
    },
    hand: [],
    secretObjective: { id: '', type: 'SURVIVAL', description: '', isFulfilled: false },
    hasConqueredThisTurn: false,
    territoryCount: 0,
    totalTroops: 0,
  }));

  // 2. Distribui territórios aleatoriamente (round-robin embaralhado)
  const shuffledTerritories = shuffle([...territoryIds]);
  const territoryOwners: Record<TerritoryId, string> = {};

  shuffledTerritories.forEach((tid, i) => {
    territoryOwners[tid] = players[i % numPlayers].id;
  });

  // 3. Cria os objetos Territory com 1 unidade de Infantaria base
  const territories: Record<TerritoryId, Territory> = {};

  territoryIds.forEach((tid) => {
    territories[tid] = {
      id: tid,
      name: formatTerritoryName(tid),
      adjacentIds: adjacencyMap[tid] ?? [],
      ownerId: territoryOwners[tid] ?? null,
      troops: [{ class: TroopClass.Infantry, quantity: 1 }],
      hasFortress: false,
      fortressIntegrity: 0,
    };
  });

  // 4. Posiciona fortalezas
  players.forEach((p, i) => {
    const fortressId = FORTRESS_TERRITORY_BY_PLAYER_INDEX[i];
    if (territories[fortressId]) {
      territories[fortressId] = {
        ...territories[fortressId],
        hasFortress: true,
        fortressIntegrity: 100,
        ownerId: p.id, // fortaleza sempre começa com seu dono
      };
    }
  });

  // 5. Gera o deck (UC-08 §9)
  const deck = generateDeck(territoryIds);

  // 6. Atribui objetivos secretos únicos
  const objectivePool = generateObjectivePool(
    players.map((p) => p.id),
    territoryIds.length
  );

  const playersWithObjectives = players.map((p, i) => ({
    ...p,
    secretObjective: objectivePool[i % objectivePool.length],
  }));

  // 7. Determina primeiro jogador (sorteio)
  const firstPlayerIndex = Math.floor(Math.random() * numPlayers);
  const firstPlayerId = playersWithObjectives[firstPlayerIndex].id;

  // 8. Aplica distribuição inicial de tropas para o primeiro jogador
  const ownedByFirst = Object.values(territories).filter(
    (t) => t.ownerId === firstPlayerId
  ).length;
  const initialTroops = getInitialTroopCount(ownedByFirst);

  // Atualiza contagens de território em todos os jogadores
  const finalPlayers = playersWithObjectives.map((p) => ({
    ...p,
    territoryCount: Object.values(territories).filter((t) => t.ownerId === p.id).length,
    totalTroops: Object.values(territories)
      .filter((t) => t.ownerId === p.id)
      .reduce((sum, t) => sum + t.troops.reduce((s, u) => s + u.quantity, 0), 0),
  }));

  return {
    status: GameStatus.Playing,
    players: finalPlayers,
    territories,
    deck,
    winner: null,
    turnNumber: 1,
    turn: {
      currentPlayerId: firstPlayerId,
      phase: GamePhase.Distribution,
      timeRemaining: TURN_DURATION_SECONDS,
      troopsToDistribute: initialTroops,
      globalTradeCount: 0,
    },
  };
}

// ------------------------------------------------------------
// Formata o ID do território em nome legível
// "territorio-1" → "Território 1"
// ------------------------------------------------------------

function formatTerritoryName(id: TerritoryId): string {
  const num = id.replace('territorio-', '');
  return `Território ${num}`;
}
