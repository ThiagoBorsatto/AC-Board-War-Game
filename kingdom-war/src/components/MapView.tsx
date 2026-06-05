// ============================================================
// KINGDOM WAR — MapView Component
// SVG interativo com todos os 31 territórios
// ViewBox compartilhado: 0 0 1195 1715
// ============================================================

import React, { useCallback, useMemo } from 'react';
import { GamePhase, GameStatus } from '../types';
import type { Territory, Player, TerritoryId } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase } from '../store/GameContext';
import { TERRITORY_META } from '../data/territories';
import { BG_HREF, TERRITORY_IMAGE_DATA } from '../data/svgData';
import { countTroops } from '../engine/turns';

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface MapViewProps {
  onTerritoryClick: (id: TerritoryId) => void;
  selectedFrom: TerritoryId | null;   // território de origem selecionado
  attackableIds: TerritoryId[];        // territórios que podem ser atacados
  repositionableIds: TerritoryId[];    // territórios para remanejamento
}

// ------------------------------------------------------------
// Cores por estado de território
// ------------------------------------------------------------

const OVERLAY_OPACITY = {
  owned: 0,           // sem overlay — cor do jogador no label
  selected: 0.35,     // território de origem selecionado
  attackable: 0.25,   // alvo de ataque disponível
  reposition: 0.2,    // destino de remanejamento
  neutral: 0,         // território não-interativo no turno atual
};

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------

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

  // Mapeia playerId → Player para lookup rápido
  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  // Determina o estado de interação de cada território
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

  // Determina se o território é clicável no turno atual
  const isClickable = useCallback(
    (id: TerritoryId): boolean => {
      if (!isPlaying || !currentPlayer) return false;
      const t = territories[id];

      switch (phase) {
        case GamePhase.Distribution:
          return t?.ownerId === currentPlayer.id;
        case GamePhase.Attack:
          if (selectedFrom === null) return t?.ownerId === currentPlayer.id && countTroops(t.troops) >= 2;
          if (id === selectedFrom) return true; // deselect
          return attackableIds.includes(id);
        case GamePhase.Reposition:
          if (selectedFrom === null) return t?.ownerId === currentPlayer.id;
          if (id === selectedFrom) return true; // deselect
          return repositionableIds.includes(id);
        default:
          return false;
      }
    },
    [isPlaying, currentPlayer, phase, territories, selectedFrom, attackableIds, repositionableIds]
  );

  return (
    <svg
      viewBox="0 0 1195 1715"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* ── Background ── */}
      <image
        href={BG_HREF}
        x={0}
        y={0}
        width={1195}
        height={1715}
        preserveAspectRatio="xMidYMid meet"
      />

      {/* ── Territory images + overlays + labels ── */}
      {TERRITORY_IMAGE_DATA.map(({ id, href, tx, ty, w, h }) => {
        const territory = territories[id as TerritoryId];
        if (!territory) return null;

        const tState = getTerritoryState(id as TerritoryId);
        const clickable = isClickable(id as TerritoryId);
        const owner = territory.ownerId ? playerMap[territory.ownerId] : null;
        const meta = TERRITORY_META[id as TerritoryId];
        const troopCount = countTroops(territory.troops);

        // Cor do overlay interativo
        const overlayColor =
          tState === 'selected'    ? '#ffffff' :
          tState === 'attackable'  ? '#ff4444' :
          tState === 'reposition'  ? '#44aaff' :
          'transparent';

        const overlayOpacity =
          tState === 'selected'   ? OVERLAY_OPACITY.selected :
          tState === 'attackable' ? OVERLAY_OPACITY.attackable :
          tState === 'reposition' ? OVERLAY_OPACITY.reposition :
          0;

        return (
          <g
            key={id}
            id={id}
            onClick={clickable ? () => onTerritoryClick(id as TerritoryId) : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
          >
            {/* Imagem do território */}
            <image
              href={href}
              x={tx}
              y={ty}
              width={w}
              height={h}
            />

            {/* Overlay de estado interativo */}
            {overlayOpacity > 0 && (
              <rect
                x={tx}
                y={ty}
                width={w}
                height={h}
                fill={overlayColor}
                fillOpacity={overlayOpacity}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Badge de dono (círculo colorido com número de tropas) */}
            {owner && (
              <g style={{ pointerEvents: 'none' }}>
                {/* Sombra do badge */}
                <circle
                  cx={meta.cx}
                  cy={meta.cy}
                  r={18}
                  fill="rgba(0,0,0,0.5)"
                  transform="translate(1,1)"
                />
                {/* Círculo principal */}
                <circle
                  cx={meta.cx}
                  cy={meta.cy}
                  r={18}
                  fill={owner.color}
                  stroke={tState === 'selected' ? '#ffffff' : 'rgba(0,0,0,0.6)'}
                  strokeWidth={tState === 'selected' ? 3 : 1.5}
                />
                {/* Número de tropas */}
                <text
                  x={meta.cx}
                  y={meta.cy + 5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {troopCount}
                </text>

                {/* Ícone de fortaleza */}
                {territory.hasFortress && (
                  <>
                    <circle
                      cx={meta.cx + 18}
                      cy={meta.cy - 16}
                      r={9}
                      fill="#ffd700"
                      stroke="rgba(0,0,0,0.6)"
                      strokeWidth={1}
                    />
                    <text
                      x={meta.cx + 18}
                      y={meta.cy - 12}
                      textAnchor="middle"
                      fill="#333"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      🏰
                    </text>
                    {/* Barra de integridade da fortaleza */}
                    <rect
                      x={meta.cx - 18}
                      y={meta.cy + 22}
                      width={36}
                      height={5}
                      fill="rgba(0,0,0,0.4)"
                      rx={2}
                    />
                    <rect
                      x={meta.cx - 18}
                      y={meta.cy + 22}
                      width={36 * (territory.fortressIntegrity / 100)}
                      height={5}
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
                <circle cx={meta.cx} cy={meta.cy} r={12} fill="rgba(180,180,180,0.7)" stroke="#666" strokeWidth={1} />
                <text x={meta.cx} y={meta.cy + 4} textAnchor="middle" fill="#333" fontSize="10" fontWeight="bold">?</text>
              </g>
            )}

            {/* Pulse animado em territórios atacáveis */}
            {tState === 'attackable' && (
              <circle
                cx={meta.cx}
                cy={meta.cy}
                r={22}
                fill="none"
                stroke="#ff4444"
                strokeWidth={2}
                opacity={0.8}
                style={{ pointerEvents: 'none' }}
              >
                <animate attributeName="r" values="18;26;18" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
