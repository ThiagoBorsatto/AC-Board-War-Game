// ============================================================
// KINGDOM WAR — HUD (Head-Up Display)
// Barra superior: jogador ativo, fase, timer, turno
// ============================================================

import React from 'react';
import { GamePhase } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase, useTimer } from '../store/GameContext';

const PHASE_LABEL: Record<GamePhase, string> = {
  [GamePhase.Distribution]: '⚙ DISTRIBUIÇÃO',
  [GamePhase.Attack]:       '⚔ ATAQUE',
  [GamePhase.Reposition]:   '↔ REMANEJAMENTO',
};

const PHASE_COLOR: Record<GamePhase, string> = {
  [GamePhase.Distribution]: '#4a9eff',
  [GamePhase.Attack]:       '#e63946',
  [GamePhase.Reposition]:   '#2dc653',
};

export function HUD() {
  const { state, dispatch } = useGame();
  const currentPlayer = useCurrentPlayer();
  const phase = useTurnPhase();
  const timer = useTimer();

  if (!currentPlayer) return null;

  const isUrgent = timer <= 10;
  const phasePct = (timer / 60) * 100;

  return (
    <div style={styles.root}>
      {/* Jogador ativo */}
      <div style={styles.playerSection}>
        <div style={{
          ...styles.playerDot,
          backgroundColor: currentPlayer.color,
          boxShadow: `0 0 12px ${currentPlayer.color}80`,
        }} />
        <div style={styles.playerInfo}>
          <span style={styles.playerName}>{currentPlayer.name}</span>
          <span style={styles.playerStats}>
            {currentPlayer.territoryCount} territórios · {currentPlayer.totalTroops} tropas · {currentPlayer.gold}🪙
          </span>
        </div>
      </div>

      {/* Centro: fase + timer + turno */}
      <div style={styles.centerSection}>
        <span style={{
          ...styles.phaseLabel,
          color: PHASE_COLOR[phase],
          borderColor: PHASE_COLOR[phase] + '40',
        }}>
          {PHASE_LABEL[phase]}
        </span>
        <div style={styles.timerBox}>
          <span style={{
            ...styles.timerNum,
            color: isUrgent ? '#e63946' : '#f0e6c8',
          }}>
            {String(timer).padStart(2, '0')}
          </span>
          <div style={styles.timerBarBg}>
            <div style={{
              ...styles.timerBarFill,
              width: `${phasePct}%`,
              background: isUrgent ? '#e63946' : PHASE_COLOR[phase],
            }} />
          </div>
        </div>
        <span style={styles.turnLabel}>Turno {state.turnNumber}</span>
      </div>

      {/* Ações rápidas */}
      <div style={styles.actionsSection}>
        {phase === GamePhase.Distribution && state.turn.troopsToDistribute > 0 && (
          <div style={styles.troopsBadge}>
            <span style={styles.troopsBadgeNum}>{state.turn.troopsToDistribute}</span>
            <span style={styles.troopsBadgeLabel}>tropas</span>
          </div>
        )}
        <button
          style={styles.advanceBtn}
          onClick={() => dispatch({ type: 'ADVANCE_PHASE' })}
        >
          {phase === GamePhase.Reposition ? '✓ Encerrar Turno' : '→ Próxima Fase'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '60px',
    background: 'linear-gradient(180deg, #151510 0%, #0d0d0a 100%)',
    borderBottom: '1px solid #2a2a1a',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '16px',
    flexShrink: 0,
    zIndex: 10,
  },
  playerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '220px',
  },
  playerDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  playerName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#f0e6c8',
    letterSpacing: '0.05em',
    lineHeight: 1,
  },
  playerStats: {
    fontSize: '10px',
    color: '#5a5040',
    letterSpacing: '0.04em',
    lineHeight: 1,
  },
  centerSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
  },
  phaseLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    border: '1px solid',
    padding: '2px 10px',
    borderRadius: '2px',
    lineHeight: 1.4,
  },
  timerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    width: '80px',
  },
  timerNum: {
    fontSize: '22px',
    fontWeight: 900,
    fontFamily: 'monospace',
    lineHeight: 1,
    transition: 'color 0.3s',
  },
  timerBarBg: {
    width: '80px',
    height: '3px',
    background: '#1a1a1a',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.9s linear, background 0.3s',
  },
  turnLabel: {
    fontSize: '9px',
    color: '#3a3020',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  actionsSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '220px',
    justifyContent: 'flex-end',
  },
  troopsBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(74,158,255,0.1)',
    border: '1px solid #4a9eff40',
    borderRadius: '4px',
    padding: '4px 10px',
    lineHeight: 1,
  },
  troopsBadgeNum: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#4a9eff',
    fontFamily: 'monospace',
  },
  troopsBadgeLabel: {
    fontSize: '9px',
    color: '#4a9eff80',
    letterSpacing: '0.15em',
  },
  advanceBtn: {
    background: 'rgba(201,168,76,0.08)',
    border: '1px solid #c9a84c30',
    color: '#c9a84c',
    borderRadius: '4px',
    padding: '6px 14px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    fontFamily: '"Palatino Linotype", serif',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
};
