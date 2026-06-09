// ============================================================
// KINGDOM WAR — Cards Engine
// Referência: UC-14, RN-14.1, RN-14.2, UC-08 §9
// ============================================================

import { CardSymbol } from '../types';
import type { Card, Deck, Player, TerritoryId } from '../types';
import {
  STANDARD_SYMBOLS,
  WILDCARD_COUNT,
  getCardTradeValue,
  MAX_CARDS_IN_HAND,
} from '../constants';

// ------------------------------------------------------------
// Gera o deck inicial da partida (UC-08 §9)
// 1 carta por território + 2 curingas
// Símbolo atribuído aleatoriamente entre os 3 padrões
// ------------------------------------------------------------

export function generateDeck(territoryIds: TerritoryId[]): Deck {
  const cards: Card[] = territoryIds.map((tid, i) => ({
    id: `card-${i}`,
    symbol: STANDARD_SYMBOLS[i % STANDARD_SYMBOLS.length] as CardSymbol,
    territoryId: tid,
  }));

  // Embaralha antes de atribuir símbolos aleatórios
  shuffle(cards);

  // Reaplica símbolos após embaralhamento para garantir aleatoriedade real
  cards.forEach((card, i) => {
    card.symbol = STANDARD_SYMBOLS[Math.floor(Math.random() * STANDARD_SYMBOLS.length)];
  });

  // Adiciona curingas
  for (let i = 0; i < WILDCARD_COUNT; i++) {
    cards.push({
      id: `wildcard-${i}`,
      symbol: CardSymbol.Wildcard,
      territoryId: null,
    });
  }

  shuffle(cards);

  return { draw: cards, discard: [] };
}

// ------------------------------------------------------------
// Saca uma carta do topo do deck
// Se o deck estiver vazio, reembaralha o descarte (UC-09 §3)
// ------------------------------------------------------------

export function drawCard(deck: Deck): { deck: Deck; card: Card | null } {
  let updatedDeck = { ...deck, draw: [...deck.draw], discard: [...deck.discard] };

  if (updatedDeck.draw.length === 0) {
    if (updatedDeck.discard.length === 0) return { deck: updatedDeck, card: null };
    // Reembaralha descarte como novo draw
    updatedDeck.draw = shuffle([...updatedDeck.discard]);
    updatedDeck.discard = [];
  }

  const card = updatedDeck.draw[0];
  updatedDeck.draw = updatedDeck.draw.slice(1);
  return { deck: updatedDeck, card };
}

// ------------------------------------------------------------
// RN-14.1 — Valida se 3 cartas formam uma combinação permitida
// Regras:
//   (a) 3 iguais
//   (b) 3 diferentes (1 de cada símbolo padrão)
//   (c) Curinga substitui qualquer símbolo
// ------------------------------------------------------------

export function isValidTrade(cards: [Card, Card, Card]): boolean {
  const symbols = cards.map((c) => c.symbol);
  const wildcards = symbols.filter((s) => s === CardSymbol.Wildcard).length;
  const nonWild = symbols.filter((s) => s !== CardSymbol.Wildcard);

  // Com 2 ou mais curingas qualquer combinação é válida
  if (wildcards >= 2) return true;

  // Com 1 curinga: os outros 2 devem ser iguais OU já existe 1 de cada tipo nos 2 restantes
  if (wildcards === 1) {
    const [a, b] = nonWild;
    // Iguais entre si → com curinga formamos 3 iguais
    if (a === b) return true;
    // Diferentes entre si → com curinga temos os 3 símbolos diferentes
    return a !== b;
  }

  // Sem curinga: 3 iguais
  if (nonWild[0] === nonWild[1] && nonWild[1] === nonWild[2]) return true;

  // Sem curinga: 3 diferentes
  const unique = new Set(nonWild);
  if (unique.size === 3) return true;

  return false;
}

// ------------------------------------------------------------
// FA-14B — Bônus por território ocupado
// +2 tropas para cada carta trocada cujo território pertence ao jogador
// ------------------------------------------------------------

export function calcTerritoryBonus(
  cards: [Card, Card, Card],
  ownedTerritoryIds: TerritoryId[]
): number {
  const ownedSet = new Set(ownedTerritoryIds);
  return cards.filter(
    (c) => c.territoryId !== null && ownedSet.has(c.territoryId)
  ).length * 2;
}

// ------------------------------------------------------------
// Processa uma troca de cartas válida
// Retorna as tropas ganhas (base + bônus territorial)
// ------------------------------------------------------------

export interface TradeResult {
  troopsGained: number;
  territoryBonus: number;
  newGlobalTradeCount: number;
}

export function processTrade(
  cards: [Card, Card, Card],
  globalTradeCount: number,
  ownedTerritoryIds: TerritoryId[]
): TradeResult {
  const baseTroops = getCardTradeValue(globalTradeCount);
  const territoryBonus = calcTerritoryBonus(cards, ownedTerritoryIds);

  return {
    troopsGained: baseTroops + territoryBonus,
    territoryBonus,
    newGlobalTradeCount: globalTradeCount + 1,
  };
}

// ------------------------------------------------------------
// Verifica se um jogador está com mão cheia (UC-09 FA-09C)
// ------------------------------------------------------------

export function hasFullHand(player: Player): boolean {
  return player.hand.length >= MAX_CARDS_IN_HAND;
}

// ------------------------------------------------------------
// Utilitário: embaralhamento Fisher-Yates
// ------------------------------------------------------------

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
