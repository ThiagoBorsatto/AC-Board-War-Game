// ============================================================
// KINGDOM WAR — Persistence (LocalStorage)
// Referência: UC-07, UC-08 §8, UC-09 §4, UC-13 §5
// ============================================================

import type { GameState } from '../types';

const STORAGE_KEY = 'kingdom-war-state';

// ------------------------------------------------------------
// Salva o estado no LocalStorage
// UC-09 §4: chamado ao final de cada turno completo
// UC-08 §8: chamado na inicialização
// ------------------------------------------------------------

export function saveToLocalStorage(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // UC-08 FA-08A: falha silenciosa; o jogo continua sem persistência
    console.warn('[KingdomWar] Falha ao salvar estado no LocalStorage:', err);
  }
}

// ------------------------------------------------------------
// Carrega o estado salvo do LocalStorage
// UC-07 §1: detectado no carregamento da aplicação
// Retorna null se não houver estado ou se estiver corrompido
// ------------------------------------------------------------

export function loadFromLocalStorage(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GameState;

    // Validação mínima de integridade (UC-07 FA-07B)
    if (!parsed.players || !parsed.territories || !parsed.turn) {
      console.warn('[KingdomWar] Estado salvo inválido ou incompleto. Descartando.');
      clearLocalStorage();
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('[KingdomWar] Falha ao carregar estado do LocalStorage:', err);
    clearLocalStorage();
    return null;
  }
}

// ------------------------------------------------------------
// Remove o estado salvo
// UC-13 §5: chamado ao encerrar a partida
// ------------------------------------------------------------

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silencioso
  }
}

// ------------------------------------------------------------
// Verifica se existe um estado salvo (sem carregar)
// Usado para exibir o aviso na tela inicial (UC-07 §2)
// ------------------------------------------------------------

export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
