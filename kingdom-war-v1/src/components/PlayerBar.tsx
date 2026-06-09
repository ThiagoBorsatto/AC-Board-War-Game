// ============================================================
// KINGDOM WAR — PlayerBar
// Barra inferior: todos os jogadores ativos com stats em tempo real
// ============================================================

import React, { useState } from 'react';
import { useGame, useCurrentPlayer, useActivePlayers } from '../store/GameContext';
import { UpgradeLevel, TroopClass } from '../types';
import { UPGRADE_LEVEL_NAME } from '../constants';

export function PlayerBar() {
  const { state } = useGame();
  const currentPlayer = useCurrentPlayer();
  const activePlayers = useActivePlayers();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={styles.root}>
      {activePlayers.map((player) => {
        const isCurrent = player.id === currentPlayer?.id;
        const isExpanded = expandedId === player.id;
        const fortress = Object.values(state.territories).find(
          (t) => t.hasFortress && t.ownerId === player.id
        );

        return (
          <div
            key={player.id}
            style={{
              ...styles.playerCard,
              borderColor: isCurrent ? player.color : '#1e1e16',
              background: isCurrent
                ? `linear-gradient(180deg, ${player.color}18 0%, #0d0d0a 100%)`
                : '#0d0d0a',
              boxShadow: isCurrent ? `0 0 20px ${player.color}30` : 'none',
            }}
            onClick={() => setExpandedId(isExpanded ? null : player.id)}
          >
            {isCurrent && <div style={{ ...styles.activePip, background: player.color }} />}

            <div style={styles.cardHeader}>
              <div style={{ ...styles.colorBadge, backgroundColor: player.color }} />
              <span style={{ ...styles.playerName, color: isCurrent ? '#f0e6c8' : '#4a4030' }}>
                {player.name}
              </span>
            </div>

            <div style={styles.statsRow}>
              {[
                { icon: '🗺', value: player.territoryCount, label: 'terr.' },
                { icon: '⚔', value: player.totalTroops,    label: 'tropas' },
                { icon: '🪙', value: player.gold,           label: 'ouro' },
                { icon: '🃏', value: player.hand.length,    label: 'cartas' },
              ].map(({ icon, value, label }) => (
                <div key={label} style={styles.stat}>
                  <span style={styles.statIcon}>{icon}</span>
                  <span style={{ ...styles.statValue, color: isCurrent ? player.color : '#3a3020' }}>
                    {value}
                  </span>
                  <span style={{ ...styles.statLabel, color: isCurrent ? '#5a5040' : '#2a2018' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {fortress && (
              <div style={styles.fortressRow}>
                <span style={styles.fortressIcon}>🏰</span>
                <div style={styles.fortressBarBg}>
                  <div style={{
                    ...styles.fortressBarFill,
                    width: `${fortress.fortressIntegrity}%`,
                    background: fortress.fortressIntegrity > 50 ? '#2dc653'
                      : fortress.fortressIntegrity > 25 ? '#f4a261' : '#e63946',
                  }} />
                </div>
                <span style={styles.fortressVal}>{fortress.fortressIntegrity}%</span>
              </div>
            )}

            {isExpanded && (
              <div style={styles.upgradesPanel}>
                {([TroopClass.Infantry, TroopClass.Artillery, TroopClass.Cavalry] as TroopClass[]).map((cls) => (
                  <div key={cls} style={styles.upgradeRow}>
                    <span style={styles.upgradeClass}>
                      {cls === TroopClass.Infantry ? '🗡 Infantaria' : cls === TroopClass.Artillery ? '💣 Artilharia' : '🐴 Cavalaria'}
                    </span>
                    <span style={{
                      ...styles.upgradeLevel,
                      color: UPGRADE_COLOR[player.upgradeLevel[cls]],
                    }}>
                      {UPGRADE_LEVEL_NAME[player.upgradeLevel[cls]]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const UPGRADE_COLOR: Record<UpgradeLevel, string> = {
  [UpgradeLevel.Base]:     '#3a3020',
  [UpgradeLevel.Veteran]:  '#7a9a6a',
  [UpgradeLevel.Elite]:    '#4a9eff',
  [UpgradeLevel.Champion]: '#c9a84c',
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '80px',
    background: '#080806',
    borderTop: '1px solid #1e1e16',
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    overflowX: 'auto',
    flexShrink: 0,
  },
  playerCard: {
    flex: '1 1 0',
    minWidth: '140px',
    maxWidth: '220px',
    borderRadius: '6px',
    border: '1px solid',
    padding: '8px 10px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  activePip: {
    position: 'absolute',
    top: '-1px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '32px',
    height: '3px',
    borderRadius: '0 0 3px 3px',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '6px' },
  colorBadge: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  playerName: { fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  statsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' },
  statIcon: { fontSize: '10px', lineHeight: 1 },
  statValue: { fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 },
  statLabel: { fontSize: '8px', letterSpacing: '0.06em', lineHeight: 1 },
  fortressRow: { display: 'flex', alignItems: 'center', gap: '5px' },
  fortressIcon: { fontSize: '10px' },
  fortressBarBg: { flex: 1, height: '4px', background: '#1a1a12', borderRadius: '2px', overflow: 'hidden' },
  fortressBarFill: { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease, background 0.3s' },
  fortressVal: { fontSize: '9px', color: '#3a3020', fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' },
  upgradesPanel: { borderTop: '1px solid #1a1a12', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' },
  upgradeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  upgradeClass: { fontSize: '10px', color: '#4a4030' },
  upgradeLevel: { fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' },
};
