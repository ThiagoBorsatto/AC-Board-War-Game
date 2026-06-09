// ============================================================
// KINGDOM WAR — Territory Data
// Fonte: Conquista_de_cada_território.docx
// ViewBox compartilhado: 0 0 1195 1715
// Centróides calculados a partir dos transforms + dimensões SVG
// ============================================================

import type { AdjacencyMap } from '../engine/init';
import type { TerritoryId } from '../types';

// ------------------------------------------------------------
// Mapa de adjacências (quem pode atacar quem)
// Referência direta do documento oficial — NÃO inferido visualmente
// ------------------------------------------------------------

export const ADJACENCY_MAP: AdjacencyMap = {
  'territorio-1':  ['territorio-2',  'territorio-3',  'territorio-31'],
  'territorio-2':  ['territorio-1',  'territorio-3',  'territorio-4',  'territorio-6',  'territorio-8'],
  'territorio-3':  ['territorio-1',  'territorio-2',  'territorio-8',  'territorio-9',  'territorio-31'],
  'territorio-4':  ['territorio-2',  'territorio-3',  'territorio-5'],
  'territorio-5':  ['territorio-4',  'territorio-6',  'territorio-7'],
  'territorio-6':  ['territorio-2',  'territorio-4',  'territorio-5',  'territorio-7',  'territorio-8'],
  'territorio-7':  ['territorio-5',  'territorio-6',  'territorio-8',  'territorio-18', 'territorio-19', 'territorio-20', 'territorio-21'],
  'territorio-8':  ['territorio-2',  'territorio-3',  'territorio-6',  'territorio-7',  'territorio-9',  'territorio-16', 'territorio-18'],
  'territorio-9':  ['territorio-3',  'territorio-8',  'territorio-10', 'territorio-31'],
  'territorio-10': ['territorio-9',  'territorio-11', 'territorio-14', 'territorio-15', 'territorio-16'],
  'territorio-11': ['territorio-10', 'territorio-12', 'territorio-13', 'territorio-14', 'territorio-27'],
  'territorio-12': ['territorio-11', 'territorio-13', 'territorio-30'],
  'territorio-13': ['territorio-11', 'territorio-12', 'territorio-26', 'territorio-28', 'territorio-29', 'territorio-30'],
  'territorio-14': ['territorio-10', 'territorio-11', 'territorio-15', 'territorio-27'],
  'territorio-15': ['territorio-10', 'territorio-14', 'territorio-17', 'territorio-26', 'territorio-27'],
  'territorio-16': ['territorio-8',  'territorio-10', 'territorio-15', 'territorio-17', 'territorio-18'],
  'territorio-17': ['territorio-15', 'territorio-16', 'territorio-18', 'territorio-19', 'territorio-25', 'territorio-26'],
  'territorio-18': ['territorio-7',  'territorio-8',  'territorio-16', 'territorio-17', 'territorio-19'],
  'territorio-19': ['territorio-7',  'territorio-17', 'territorio-18', 'territorio-20', 'territorio-24', 'territorio-25'],
  'territorio-20': ['territorio-7',  'territorio-19', 'territorio-21', 'territorio-22', 'territorio-23', 'territorio-24'],
  'territorio-21': ['territorio-7',  'territorio-20', 'territorio-22'],
  'territorio-22': ['territorio-20', 'territorio-21', 'territorio-23'],
  'territorio-23': ['territorio-20', 'territorio-22', 'territorio-24'],
  'territorio-24': ['territorio-19', 'territorio-20', 'territorio-23', 'territorio-25'],
  'territorio-25': ['territorio-17', 'territorio-19', 'territorio-24', 'territorio-26', 'territorio-28'],
  'territorio-26': ['territorio-13', 'territorio-15', 'territorio-17', 'territorio-25', 'territorio-27', 'territorio-28'],
  'territorio-27': ['territorio-11', 'territorio-14', 'territorio-15', 'territorio-26'],
  'territorio-28': ['territorio-13', 'territorio-25', 'territorio-26', 'territorio-29', 'territorio-30'],
  'territorio-29': ['territorio-13', 'territorio-28', 'territorio-30'],
  'territorio-30': ['territorio-12', 'territorio-13', 'territorio-29'],
  'territorio-31': ['territorio-1',  'territorio-3',  'territorio-9'],
};

// ------------------------------------------------------------
// IDs de todos os territórios
// ------------------------------------------------------------

export const ALL_TERRITORY_IDS: TerritoryId[] = Array.from(
  { length: 31 },
  (_, i) => `territorio-${i + 1}`
);

// ------------------------------------------------------------
// Metadados visuais de cada território
// tx/ty = offset do transform SVG
// w/h   = dimensões da imagem embarcada
// cx/cy = centróide calculado (tx + w/2, ty + h/2)
// Usado para posicionar labels, ícones de tropa e indicadores
// ------------------------------------------------------------

export interface TerritoryMeta {
  id: TerritoryId;
  tx: number;
  ty: number;
  w: number;
  h: number;
  cx: number; // centróide X no viewBox 1195x1715
  cy: number; // centróide Y no viewBox 1195x1715
}

export const TERRITORY_META: Record<TerritoryId, TerritoryMeta> = {
  'territorio-1':  { id: 'territorio-1',  tx: 192, ty: 1593, w: 198, h: 108, cx: 291,  cy: 1647 },
  'territorio-2':  { id: 'territorio-2',  tx: 411, ty: 1272, w: 221, h: 351, cx: 522,  cy: 1448 },
  'territorio-3':  { id: 'territorio-3',  tx: 114, ty: 1182, w: 387, h: 419, cx: 308,  cy: 1392 },
  'territorio-4':  { id: 'territorio-4',  tx: 602, ty: 1465, w: 300, h: 159, cx: 752,  cy: 1544 },
  'territorio-5':  { id: 'territorio-5',  tx: 784, ty: 1373, w: 354, h: 220, cx: 961,  cy: 1483 },
  'territorio-6':  { id: 'territorio-6',  tx: 609, ty: 1303, w: 340, h: 189, cx: 779,  cy: 1398 },
  'territorio-7':  { id: 'territorio-7',  tx: 635, ty: 1049, w: 379, h: 292, cx: 824,  cy: 1195 },
  'territorio-8':  { id: 'territorio-8',  tx: 350, ty:  975, w: 387, h: 369, cx: 544,  cy: 1160 },
  'territorio-9':  { id: 'territorio-9',  tx:  55, ty:  953, w: 391, h: 255, cx: 250,  cy: 1080 },
  'territorio-10': { id: 'territorio-10', tx:  84, ty:  512, w: 374, h: 495, cx: 271,  cy:  760 },
  'territorio-11': { id: 'territorio-11', tx: 166, ty:  183, w: 413, h: 502, cx: 372,  cy:  434 },
  'territorio-12': { id: 'territorio-12', tx: 300, ty:   79, w: 443, h: 300, cx: 522,  cy:  229 },
  'territorio-13': { id: 'territorio-13', tx: 404, ty:  334, w: 222, h: 283, cx: 515,  cy:  476 },
  'territorio-14': { id: 'territorio-14', tx: 366, ty:  593, w: 142, h: 266, cx: 437,  cy:  726 },
  'territorio-15': { id: 'territorio-15', tx: 453, ty:  723, w: 140, h: 157, cx: 523,  cy:  802 },
  'territorio-16': { id: 'territorio-16', tx: 430, ty:  875, w: 128, h: 121, cx: 494,  cy:  936 },
  'territorio-17': { id: 'territorio-17', tx: 527, ty:  815, w: 174, h: 156, cx: 614,  cy:  893 },
  'territorio-18': { id: 'territorio-18', tx: 553, ty:  928, w: 178, h: 168, cx: 642,  cy: 1012 },
  'territorio-19': { id: 'territorio-19', tx: 692, ty:  834, w: 173, h: 255, cx: 778,  cy:  962 },
  'territorio-20': { id: 'territorio-20', tx: 785, ty:  952, w: 174, h: 181, cx: 872,  cy: 1042 },
  'territorio-21': { id: 'territorio-21', tx: 862, ty: 1037, w: 219, h: 143, cx: 972,  cy: 1108 },
  'territorio-22': { id: 'territorio-22', tx: 934, ty:  953, w: 154, h: 109, cx: 1011, cy: 1008 },
  'territorio-23': { id: 'territorio-23', tx: 910, ty:  804, w: 173, h: 171, cx: 996,  cy:  890 },
  'territorio-24': { id: 'territorio-24', tx: 823, ty:  805, w: 113, h: 170, cx: 880,  cy:  890 },
  'territorio-25': { id: 'territorio-25', tx: 639, ty:  641, w: 224, h: 288, cx: 751,  cy:  785 },
  'territorio-26': { id: 'territorio-26', tx: 545, ty:  579, w: 146, h: 265, cx: 618,  cy:  712 },
  'territorio-27': { id: 'territorio-27', tx: 492, ty:  617, w: 105, h: 114, cx: 544,  cy:  674 },
  'territorio-28': { id: 'territorio-28', tx: 597, ty:  392, w: 345, h: 334, cx: 770,  cy:  559 },
  'territorio-29': { id: 'territorio-29', tx: 605, ty:  278, w: 330, h: 185, cx: 770,  cy:  370 },
  'territorio-30': { id: 'territorio-30', tx: 561, ty:  156, w: 277, h: 229, cx: 700,  cy:  270 },
  'territorio-31': { id: 'territorio-31', tx:  45, ty: 1178, w: 241, h: 453, cx:  90,  cy: 1500 },
};

// ------------------------------------------------------------
// Posições das fortalezas por índice de jogador (0–5)
// Distribuídas geometricamente para equilíbrio no mapa
// ------------------------------------------------------------

export const FORTRESS_POSITIONS: TerritoryId[] = [
  'territorio-3',  // Jogador 0 — extremo sudoeste
  'territorio-5',  // Jogador 1 — extremo sudeste
  'territorio-10', // Jogador 2 — oeste central
  'territorio-12', // Jogador 3 — extremo norte
  'territorio-22', // Jogador 4 — extremo leste
  'territorio-28', // Jogador 5 — nordeste central
];
