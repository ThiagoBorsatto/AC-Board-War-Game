// ============================================================
// KINGDOM WAR — CombatOverlay
// Exibe resultado de combate após UC-03/UC-10
// ============================================================

import React, { useEffect, useState } from 'react';
import { TroopClass } from '../types';
import type { CombatResult } from '../types';

const CLASS_LABEL: Record<TroopClass, string> = {
  [TroopClass.Infantry]:  'Infantaria',
  [TroopClass.Artillery]: 'Artilharia',
  [TroopClass.Cavalry]:   'Cavalaria',
};

const CLASS_ICON: Record<TroopClass, string> = {
  [TroopClass.Infantry]:  '🗡',
  [TroopClass.Artillery]: '💣',
  [TroopClass.Cavalry]:   '🐴',
};

interface CombatOverlayProps {
  result: CombatResult;
  attackerName: string;
  defenderName: string;
  attackerColor: string;
  defenderColor: string;
  conqueredTerritory?: string;
  onClose: () => void;
}

export function CombatOverlay({
  result,
  attackerName,
  defenderName,
  attackerColor,
  defenderColor,
  conqueredTerritory,
  onClose,
}: CombatOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setVisible(true), 20);
    // Auto-fechar após 3.5s
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  const advLabel =
    result.typeAdvantage === 'ATTACKER' ? '▲ Vantagem de tipo' :
    result.typeAdvantage === 'DEFENDER' ? '▼ Desvantagem de tipo' :
    '— Neutro';

  const advColor =
    result.typeAdvantage === 'ATTACKER' ? '#2dc653' :
    result.typeAdvantage === 'DEFENDER' ? '#e63946' :
    '#7a6a4a';

  return (
    <div
      style={{
        ...styles.backdrop,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
    >
      <div
        style={{
          ...styles.panel,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título */}
        <div style={styles.titleRow}>
          <span style={styles.titleIcon}>{result.attackerWon ? '⚔' : '🛡'}</span>
          <span style={{
            ...styles.title,
            color: result.attackerWon ? '#c9a84c' : '#7a8ab5',
          }}>
            {result.attackerWon ? 'VITÓRIA DO ATACANTE' : 'DEFESA BEM-SUCEDIDA'}
          </span>
        </div>

        {/* VS Row */}
        <div style={styles.vsRow}>
          {/* Atacante */}
          <div style={styles.side}>
            <div style={{ ...styles.sideDot, backgroundColor: attackerColor }} />
            <span style={styles.sideName}>{attackerName}</span>
            <span style={styles.sideClass}>
              {CLASS_ICON[result.attackerClass]} {CLASS_LABEL[result.attackerClass]}
            </span>
            <div style={{ ...styles.lossChip, borderColor: '#e6394640' }}>
              <span style={styles.lossIcon}>↓</span>
              <span style={styles.lossNum}>{result.attackerLosses}</span>
              <span style={styles.lossSub}>baixas</span>
            </div>
          </div>

          {/* VS */}
          <div style={styles.vsCenter}>
            <span style={styles.vsText}>VS</span>
            <span style={{ ...styles.advLabel, color: advColor }}>{advLabel}</span>
          </div>

          {/* Defensor */}
          <div style={{ ...styles.side, alignItems: 'flex-end' }}>
            <div style={{ ...styles.sideDot, backgroundColor: defenderColor }} />
            <span style={styles.sideName}>{defenderName}</span>
            <span style={styles.sideClass}>
              {CLASS_ICON[result.defenderClass]} {CLASS_LABEL[result.defenderClass]}
            </span>
            <div style={{ ...styles.lossChip, borderColor: '#e6394640' }}>
              <span style={styles.lossIcon}>↓</span>
              <span style={styles.lossNum}>{result.defenderLosses}</span>
              <span style={styles.lossSub}>baixas</span>
            </div>
          </div>
        </div>

        {/* Território conquistado */}
        {conqueredTerritory && result.attackerWon && (
          <div style={styles.conquestBadge}>
            <span>🏴</span>
            <span style={styles.conquestText}>
              {conqueredTerritory.replace('territorio-', 'Território ')} conquistado!
            </span>
          </div>
        )}

        {/* Fechar */}
        <button style={styles.closeBtn} onClick={() => { setVisible(false); setTimeout(onClose, 300); }}>
          CONTINUAR
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  panel: {
    background: 'linear-gradient(160deg, #0f0e0a 0%, #0a0a0a 100%)',
    border: '1px solid #c9a84c30',
    borderRadius: '12px',
    padding: '28px 32px',
    minWidth: '360px',
    maxWidth: '480px',
    width: '90vw',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px #c9a84c10',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  titleIcon: { fontSize: '20px' },
  title: {
    fontSize: '16px',
    fontWeight: 900,
    letterSpacing: '0.15em',
    fontFamily: 'monospace',
  },
  vsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  side: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-start',
  },
  sideDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  sideName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#f0e6c8',
    fontFamily: '"Palatino Linotype", serif',
  },
  sideClass: {
    fontSize: '11px',
    color: '#7a6a4a',
    fontFamily: 'monospace',
  },
  lossChip: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '3px',
    border: '1px solid',
    borderRadius: '4px',
    padding: '3px 8px',
    marginTop: '4px',
  },
  lossIcon: { fontSize: '10px', color: '#e63946' },
  lossNum: { fontSize: '18px', fontWeight: 900, color: '#e63946', fontFamily: 'monospace', lineHeight: 1 },
  lossSub: { fontSize: '9px', color: '#5a3030', fontFamily: 'monospace' },
  vsCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '8px',
    minWidth: '80px',
  },
  vsText: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#2a2a2a',
    fontFamily: 'monospace',
  },
  advLabel: {
    fontSize: '9px',
    letterSpacing: '0.05em',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  conquestBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid #c9a84c30',
    borderRadius: '6px',
    padding: '8px 14px',
  },
  conquestText: {
    fontSize: '12px',
    color: '#c9a84c',
    fontFamily: 'monospace',
    letterSpacing: '0.06em',
  },
  closeBtn: {
    background: 'linear-gradient(135deg, #1a1208, #2a1e08)',
    border: '1px solid #c9a84c40',
    borderRadius: '4px',
    color: '#c9a84c',
    padding: '10px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    fontFamily: 'monospace',
    width: '100%',
    transition: 'all 0.15s',
  },
};
