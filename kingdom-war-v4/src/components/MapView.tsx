// ============================================================
// KINGDOM WAR — MapView v3
// ViewBox: 1920x1080 (widescreen background)
// Mapa centrado: offset X=584, escala Y=1080/1715
// Overlay: filter CSS no <image> — sem vazar
// ============================================================

import React, { useCallback, useMemo } from 'react';
import { GamePhase, GameStatus } from '../types';
import type { Territory, Player, TerritoryId } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase } from '../store/GameContext';
import { TERRITORY_META } from '../data/territories';
import { BG_HREF, TERRITORY_IMAGE_DATA } from '../data/svgData';
import { countTroops } from '../engine/turns';

interface MapViewProps {
  onTerritoryClick: (id: TerritoryId) => void;
  selectedFrom: TerritoryId | null;
  attackableIds: TerritoryId[];
  repositionableIds: TerritoryId[];
}

// ── Constantes de layout ──────────────────────────────────────
// Background original: 1195×1715 → escalonado para 1080px de altura
const ORIG_W = 1195;
const ORIG_H = 1715;
const MAP_H  = 1080;
const MAP_SCALE = MAP_H / ORIG_H;           // ~0.6297
const MAP_W  = Math.round(ORIG_W * MAP_SCALE); // ~752
const CANVAS_W = 1920;
const CANVAS_H = 1080;
const MAP_OFFSET_X = Math.round((CANVAS_W - MAP_W) / 2); // ~584

// Converte coordenadas do sistema original (1195×1715) para o novo canvas
function sx(x: number) { return MAP_OFFSET_X + x * MAP_SCALE; }
function sy(y: number) { return y * MAP_SCALE; }

export function MapView({
  onTerritoryClick,
  selectedFrom,
  attackableIds,
  repositionableIds,
}: MapViewProps) {
  const { state } = useGame();
  const currentPlayer = useCurrentPlayer();
  const phase = useTurnPhase();
  const { territories, players, status } = state;
  const isPlaying = status === GameStatus.Playing;

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach(p => { map[p.id] = p; });
    return map;
  }, [players]);

  const getTerritoryState = useCallback(
    (id: TerritoryId): 'selected' | 'attackable' | 'reposition' | 'owned' | 'neutral' => {
      if (id === selectedFrom) return 'selected';
      if (attackableIds.includes(id)) return 'attackable';
      if (repositionableIds.includes(id)) return 'reposition';
      const t = territories[id];
      if (t?.ownerId === currentPlayer?.id) return 'owned';
      return 'neutral';
    },
    [selectedFrom, attackableIds, repositionableIds, territories, currentPlayer]
  );

  const isClickable = useCallback(
    (id: TerritoryId): boolean => {
      if (!isPlaying || !currentPlayer) return false;
      const t = territories[id];
      switch (phase) {
        case GamePhase.Distribution:
          return t?.ownerId === currentPlayer.id;
        case GamePhase.Attack:
          if (!selectedFrom) return t?.ownerId === currentPlayer.id && countTroops(t.troops) >= 2;
          if (id === selectedFrom) return true;
          if (t?.ownerId === currentPlayer.id) return true;
          return attackableIds.includes(id);
        case GamePhase.Reposition:
          if (!selectedFrom) return t?.ownerId === currentPlayer.id;
          if (id === selectedFrom) return true;
          return repositionableIds.includes(id);
        default: return false;
      }
    },
    [isPlaying, currentPlayer, phase, territories, selectedFrom, attackableIds, repositionableIds]
  );

  const getImageFilter = (tState: ReturnType<typeof getTerritoryState>): string => {
    switch (tState) {
      case 'selected':   return 'brightness(1.6) saturate(1.8) drop-shadow(0 0 6px rgba(255,255,255,0.8))';
      case 'attackable': return 'brightness(0.7) saturate(2) sepia(0.4) hue-rotate(-20deg) drop-shadow(0 0 5px rgba(255,80,90,0.95))';
      case 'reposition': return 'brightness(1.3) saturate(1.5) hue-rotate(180deg) drop-shadow(0 0 5px rgba(74,180,255,0.95))';
      case 'owned':      return 'brightness(1.05)';
      default:           return 'none';
    }
  };

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Background widescreen 1920×1080 */}
      <image
        href={BG_HREF}
        x={0} y={0}
        width={CANVAS_W} height={CANVAS_H}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* Territórios — reposicionados no novo sistema de coordenadas */}
      {TERRITORY_IMAGE_DATA.map(({ id, href, tx, ty, w, h }) => {
        const territory = territories[id as TerritoryId];
        if (!territory) return null;

        const tState    = getTerritoryState(id as TerritoryId);
        const clickable = isClickable(id as TerritoryId);
        const owner     = territory.ownerId ? playerMap[territory.ownerId] : null;
        const meta      = TERRITORY_META[id as TerritoryId];
        const troopCount = countTroops(territory.troops);

        // Posição no novo canvas
        const nx = sx(tx);
        const ny = sy(ty);
        const nw = w * MAP_SCALE;
        const nh = h * MAP_SCALE;
        // Centróide
        const cx = sx(meta.cx);
        const cy = sy(meta.cy);

        return (
          <g
            key={id}
            id={id}
            onClick={clickable ? () => onTerritoryClick(id as TerritoryId) : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
          >
            <image
              href={href}
              x={nx} y={ny}
              width={nw} height={nh}
              style={{
                filter: getImageFilter(tState),
                transition: 'filter 0.2s ease',
              }}
            />

            {/* Badge de dono */}
            {owner && (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={cx+1} cy={cy+1} r={14} fill="rgba(0,0,0,0.65)" />
                <circle
                  cx={cx} cy={cy} r={14}
                  fill={owner.color}
                  stroke={tState === 'selected' ? '#fff' : 'rgba(0,0,0,0.8)'}
                  strokeWidth={tState === 'selected' ? 2.5 : 1.5}
                />
                <text
                  x={cx} y={cy + 5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {troopCount}
                </text>

                {territory.hasFortress && (
                  <>
                    <circle cx={cx+14} cy={cy-12} r={8} fill="#ffd700" stroke="rgba(0,0,0,0.6)" strokeWidth={1} />
                    <text x={cx+14} y={cy-8} textAnchor="middle" fill="#333" fontSize="9">🏰</text>
                    <rect x={cx-14} y={cy+18} width={28} height={4} fill="rgba(0,0,0,0.5)" rx={2} />
                    <rect
                      x={cx-14} y={cy+18}
                      width={28 * (territory.fortressIntegrity / 100)} height={4}
                      fill={territory.fortressIntegrity > 50 ? '#4ade80' : territory.fortressIntegrity > 25 ? '#fbbf24' : '#ff5566'}
                      rx={2}
                    />
                  </>
                )}
              </g>
            )}

            {/* Território sem dono */}
            {!owner && (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={cx} cy={cy} r={10} fill="rgba(180,180,180,0.6)" stroke="#666" strokeWidth={1} />
                <text x={cx} y={cy+4} textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold">?</text>
              </g>
            )}

            {/* Pulse — atacável */}
            {tState === 'attackable' && (
              <circle cx={cx} cy={cy} r={18} fill="none" stroke="#ff5566" strokeWidth={2.5} opacity={0.9} style={{ pointerEvents: 'none' }}>
                <animate attributeName="r" values="14;22;14" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Pulse — remanejamento */}
            {tState === 'reposition' && (
              <circle cx={cx} cy={cy} r={18} fill="none" stroke="#4ab4ff" strokeWidth={2} opacity={0.8} style={{ pointerEvents: 'none' }}>
                <animate attributeName="r" values="14;20;14" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
