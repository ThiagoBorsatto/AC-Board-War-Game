// ============================================================
// KINGDOM WAR — Game Context (React)
// Provider que envolve toda a aplicação e expõe estado + dispatch
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

import { GameStatus } from '../types';
import type { GameState, GameAction } from '../types';
import { gameReducer } from './reducer';
import { loadFromLocalStorage } from './persistence';
import { TURN_DURATION_SECONDS } from '../constants';

// ------------------------------------------------------------
// Estado inicial vazio (antes de qualquer partida)
// ------------------------------------------------------------

const INITIAL_STATE: GameState = {
  status: GameStatus.MainMenu,
  players: [],
  territories: {},
  turn: {
    currentPlayerId: '',
    phase: 'DISTRIBUTION' as any,
    timeRemaining: TURN_DURATION_SECONDS,
    troopsToDistribute: 0,
    globalTradeCount: 0,
  },
  deck: { draw: [], discard: [] },
  winner: null,
  turnNumber: 0,
};

// ------------------------------------------------------------
// Tipos do contexto
// ------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  hasSavedGame: boolean;
}

// ------------------------------------------------------------
// Criação do contexto
// ------------------------------------------------------------

const GameContext = createContext<GameContextValue | null>(null);

// ------------------------------------------------------------
// Provider
// ------------------------------------------------------------

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const savedState = loadFromLocalStorage();
  const [state, dispatch] = useReducer(
    gameReducer,
    savedState ?? INITIAL_STATE
  );

  // Timer — tick a cada segundo enquanto a partida estiver rodando
  useEffect(() => {
    if (state.status !== GameStatus.Playing) return;

    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, state.turn.currentPlayerId, state.turn.phase]);

  const value: GameContextValue = {
    state,
    dispatch,
    hasSavedGame: savedState !== null,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// ------------------------------------------------------------
// Hook de acesso ao contexto
// ------------------------------------------------------------

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame deve ser usado dentro de <GameProvider>.');
  }
  return ctx;
}

// ------------------------------------------------------------
// Hooks seletores (evitam re-render desnecessário)
// ------------------------------------------------------------

export function useCurrentPlayer() {
  const { state } = useGame();
  return state.players.find((p) => p.id === state.turn.currentPlayerId) ?? null;
}

export function useTerritory(id: string) {
  const { state } = useGame();
  return state.territories[id] ?? null;
}

export function useActivePlayers() {
  const { state } = useGame();
  return state.players.filter((p) => p.isActive);
}

export function useTurnPhase() {
  const { state } = useGame();
  return state.turn.phase;
}

export function useTimer() {
  const { state } = useGame();
  return state.turn.timeRemaining;
}
