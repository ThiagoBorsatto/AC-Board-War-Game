// ============================================================
// KINGDOM WAR — MapView v2
// BUG FIX 3: overlay sem vazar — usa filter CSS no <image>
// Badge pulse via SVG circle, não rect
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
          if (selectedFrom === null) return t?.ownerId === currentPlayer.id && countTroops(t.troops) >= 2;
          if (id === selectedFrom) return true;
          if (t?.ownerId === currentPlayer.id) return true; // troca origem
          return attackableIds.includes(id);
        case GamePhase.Reposition:
          if (selectedFrom === null) return t?.ownerId === currentPlayer.id;
          if (id === selectedFrom) return true;
          return repositionableIds.includes(id);
        default:
          return false;
      }
    },
    [isPlaying, currentPlayer, phase, territories, selectedFrom, attackableIds, repositionableIds]
  );

  // BUG FIX 3: filter CSS aplicado direto no <image> — não vaza para fora do shape SVG
  const getImageFilter = (tState: ReturnType<typeof getTerritoryState>): string => {
    switch (tState) {
      case 'selected':    return 'brightness(1.6) saturate(1.8) drop-shadow(0 0 6px rgba(255,255,255,0.8))';
      case 'attackable':  return 'brightness(0.7) saturate(2) sepia(0.4) hue-rotate(-20deg) drop-shadow(0 0 4px rgba(230,57,70,0.9))';
      case 'reposition':  return 'brightness(1.3) saturate(1.5) hue-rotate(180deg) drop-shadow(0 0 4px rgba(74,158,255,0.9))';
      case 'owned':       return 'brightness(1.05)';
      default:            return 'none';
    }
  };

  return (
    <svg
      viewBox="0 0 1195 1715"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* Background */}
      <image href={BG_HREF} x={0} y={0} width={1195} height={1715} preserveAspectRatio="xMidYMid meet" />

      {/* Territories */}
      {TERRITORY_IMAGE_DATA.map(({ id, href, tx, ty, w, h }) => {
        const territory = territories[id as TerritoryId];
        if (!territory) return null;

        const tState    = getTerritoryState(id as TerritoryId);
        const clickable = isClickable(id as TerritoryId);
        const owner     = territory.ownerId ? playerMap[territory.ownerId] : null;
        const meta      = TERRITORY_META[id as TerritoryId];
        const troopCount = countTroops(territory.troops);

        return (
          <g
            key={id}
            id={id}
            onClick={clickable ? () => onTerritoryClick(id as TerritoryId) : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
          >
            {/* BUG FIX 3: filter direto na image — sem rect de overlay */}
            <image
              href={href}
              x={tx} y={ty}
              width={w} height={h}
              style={{
                filter: getImageFilter(tState),
                transition: 'filter 0.2s ease',
              }}
            />

            {/* Badge de dono */}
            {owner && (
              <g style={{ pointerEvents: 'none' }}>
                {/* Sombra */}
                <circle cx={meta.cx + 1} cy={meta.cy + 1} r={20} fill="rgba(0,0,0,0.6)" />
                {/* Círculo principal */}
                <circle
                  cx={meta.cx} cy={meta.cy} r={20}
                  fill={owner.color}
                  stroke={tState === 'selected' ? '#fff' : 'rgba(0,0,0,0.7)'}
                  strokeWidth={tState === 'selected' ? 3 : 1.5}
                />
                {/* Número de tropas */}
                <text
                  x={meta.cx} y={meta.cy + 6}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="15"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {troopCount}
                </text>

                {/* Fortaleza badge */}
                {territory.hasFortress && (
                  <>
                    <circle cx={meta.cx + 20} cy={meta.cy - 18} r={10} fill="#ffd700" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                    <text x={meta.cx + 20} y={meta.cy - 14} textAnchor="middle" fill="#333" fontSize="11">🏰</text>
                    {/* Barra de integridade */}
                    <rect x={meta.cx - 20} y={meta.cy + 24} width={40} height={5} fill="rgba(0,0,0,0.5)" rx={2} />
                    <rect
                      x={meta.cx - 20} y={meta.cy + 24}
                      width={40 * (territory.fortressIntegrity / 100)} height={5}
                      fill={territory.fortressIntegrity > 50 ? '#2dc653' : territory.fortressIntegrity > 25 ? '#f4a261' : '#e63946'}
                      rx={2}
                    />
                  </>
                )}
              </g>
            )}

            {/* Território sem dono */}
            {!owner && (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={meta.cx} cy={meta.cy} r={14} fill="rgba(180,180,180,0.6)" stroke="#666" strokeWidth={1} />
                <text x={meta.cx} y={meta.cy + 5} textAnchor="middle" fill="#333" fontSize="11" fontWeight="bold">?</text>
              </g>
            )}

            {/* Pulse nos alvos atacáveis — no badge, não no território */}
            {tState === 'attackable' && (
              <circle
                cx={meta.cx} cy={meta.cy} r={24}
                fill="none"
                stroke="#e63946"
                strokeWidth={2.5}
                opacity={0.9}
                style={{ pointerEvents: 'none' }}
              >
                <animate attributeName="r" values="20;30;20" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Pulse nos destinos de remanejamento */}
            {tState === 'reposition' && (
              <circle
                cx={meta.cx} cy={meta.cy} r={24}
                fill="none"
                stroke="#4a9eff"
                strokeWidth={2}
                opacity={0.8}
                style={{ pointerEvents: 'none' }}
              >
                <animate attributeName="r" values="20;28;20" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
