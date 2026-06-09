// ============================================================
// KINGDOM WAR — TroopSelector
// Modal para selecionar classe e quantidade de tropas
// Usado na: Distribuição (UC-02) e início do Ataque (UC-03)
// ============================================================

import React, { useState } from 'react';
import { TroopClass, UpgradeLevel } from '../types';
import type { Player } from '../types';
import { BASE_STATS, UPGRADE_BONUS, UPGRADE_LEVEL_NAME } from '../constants';
import { getEffectiveStats } from '../engine/combat';

interface TroopSelectorProps {
  mode: 'distribute' | 'attack';
  player: Player;
  maxQuantity: number;    // tropas disponíveis para alocar (distribute) ou count-1 (attack)
  onConfirm: (troopClass: TroopClass, quantity: number) => void;
  onCancel: () => void;
  territoryName?: string;
}

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

const CLASS_DESC: Record<TroopClass, string> = {
  [TroopClass.Infantry]:  'Alta defesa. Ideal para segurar territórios.',
  [TroopClass.Artillery]: 'Maior força bruta. Esmaga defesas.',
  [TroopClass.Cavalry]:   'Alta velocidade. Mobilidade ofensiva.',
};

export function TroopSelector({
  mode,
  player,
  maxQuantity,
  onConfirm,
  onCancel,
  territoryName,
}: TroopSelectorProps) {
  const [selectedClass, setSelectedClass] = useState<TroopClass>(TroopClass.Infantry);
  const [quantity, setQuantity] = useState(1);

  const effectiveStats = getEffectiveStats(selectedClass, player.upgradeLevel[selectedClass]);
  const upgradeLevel = player.upgradeLevel[selectedClass];

  const handleQuantityChange = (delta: number) => {
    setQuantity((q) => Math.max(1, Math.min(maxQuantity, q + delta)));
  };

  return (
    <div style={styles.backdrop} onClick={onCancel}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>{mode === 'attack' ? '⚔' : '⚙'}</span>
          <div style={styles.headerText}>
            <span style={styles.headerTitle}>
              {mode === 'attack' ? 'ESCOLHER TROPA DE ATAQUE' : 'DISTRIBUIR TROPAS'}
            </span>
            {territoryName && (
              <span style={styles.headerSub}>
                → {territoryName.replace('territorio-', 'Território ')}
              </span>
            )}
          </div>
        </div>

        {/* Classe selector */}
        <div style={styles.classGrid}>
          {([TroopClass.Infantry, TroopClass.Artillery, TroopClass.Cavalry] as TroopClass[]).map((cls) => {
            const lvl = player.upgradeLevel[cls];
            const stats = getEffectiveStats(cls, lvl);
            const isSelected = cls === selectedClass;

            return (
              <button
                key={cls}
                style={{
                  ...styles.classCard,
                  borderColor: isSelected ? player.color : '#1e1e1e',
                  background: isSelected ? `${player.color}15` : '#0f0f0f',
                  boxShadow: isSelected ? `0 0 12px ${player.color}30` : 'none',
                }}
                onClick={() => { setSelectedClass(cls); setQuantity(1); }}
              >
                <span style={styles.classIcon}>{CLASS_ICON[cls]}</span>
                <span style={{ ...styles.className, color: isSelected ? '#f0e6c8' : '#7a6a4a' }}>
                  {CLASS_LABEL[cls]}
                </span>
                <span style={styles.classUpgrade}>
                  {UPGRADE_LEVEL_NAME[lvl]}
                </span>
                <div style={styles.miniStats}>
                  <span style={styles.miniStat} title="Força">⚔{stats.force}</span>
                  <span style={styles.miniStat} title="Defesa">🛡{stats.defense}</span>
                  <span style={styles.miniStat} title="Velocidade">💨{stats.speed}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats detalhados da classe selecionada */}
        <div style={styles.statsDetail}>
          <div style={styles.statsRow}>
            {[
              { label: 'FORÇA',     val: effectiveStats.force,   icon: '⚔', color: '#e63946' },
              { label: 'DEFESA',    val: effectiveStats.defense,  icon: '🛡', color: '#4a7ab5' },
              { label: 'VELOCIDADE', val: effectiveStats.speed,   icon: '💨', color: '#2dc653' },
            ].map(({ label, val, icon, color }) => (
              <div key={label} style={styles.statBox}>
                <span style={{ ...styles.statIcon, color }}>{icon}</span>
                <span style={{ ...styles.statValue, color }}>{val}</span>
                <span style={styles.statName}>{label}</span>
              </div>
            ))}
          </div>
          <p style={styles.classDesc}>{CLASS_DESC[selectedClass]}</p>
        </div>

        {/* Quantidade (só na distribuição) */}
        {mode === 'distribute' && (
          <div style={styles.quantityRow}>
            <span style={styles.quantityLabel}>QUANTIDADE</span>
            <div style={styles.quantityControl}>
              <button
                style={styles.qBtn}
                onClick={() => handleQuantityChange(-5)}
                disabled={quantity <= 1}
              >−5</button>
              <button
                style={styles.qBtn}
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >−</button>
              <span style={styles.qValue}>{quantity}</span>
              <button
                style={styles.qBtn}
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= maxQuantity}
              >+</button>
              <button
                style={styles.qBtn}
                onClick={() => setQuantity(maxQuantity)}
                disabled={quantity >= maxQuantity}
              >MAX</button>
            </div>
            <span style={styles.quantityAvail}>
              {maxQuantity} disponíveis
            </span>
          </div>
        )}

        {/* Botões */}
        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onCancel}>CANCELAR</button>
          <button
            style={{
              ...styles.confirmBtn,
              backgroundColor: player.color,
              color: '#0d0d0d',
            }}
            onClick={() => onConfirm(selectedClass, quantity)}
          >
            {mode === 'attack' ? `⚔ ATACAR COM ${CLASS_LABEL[selectedClass]}` : `✓ ALOCAR ${quantity} TROPAS`}
          </button>
        </div>
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
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(3px)',
  },
  panel: {
    background: 'linear-gradient(160deg, #100e0a 0%, #0a0a0a 100%)',
    border: '1px solid #c9a84c25',
    borderRadius: '12px',
    padding: '24px',
    width: '90vw',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: { fontSize: '18px', color: '#c9a84c' },
  headerText: { display: 'flex', flexDirection: 'column', gap: '2px' },
  headerTitle: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', color: '#c9a84c', fontFamily: 'monospace' },
  headerSub: { fontSize: '11px', color: '#4a4030', fontFamily: 'monospace' },

  classGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  classCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  classIcon: { fontSize: '20px' },
  className: { fontSize: '11px', fontWeight: 700, fontFamily: '"Palatino Linotype", serif', transition: 'color 0.15s' },
  classUpgrade: { fontSize: '9px', color: '#4a4030', letterSpacing: '0.05em', fontFamily: 'monospace' },
  miniStats: { display: 'flex', gap: '4px', marginTop: '2px' },
  miniStat: { fontSize: '9px', color: '#3a3a3a', fontFamily: 'monospace' },

  statsDetail: {
    background: '#080808',
    border: '1px solid #1a1a1a',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statsRow: { display: 'flex', gap: '0', justifyContent: 'space-around' },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  statIcon: { fontSize: '14px' },
  statValue: { fontSize: '22px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 },
  statName: { fontSize: '8px', color: '#3a3a3a', letterSpacing: '0.15em', fontFamily: 'monospace' },
  classDesc: { fontSize: '11px', color: '#5a5040', margin: 0, textAlign: 'center', fontFamily: '"Palatino Linotype", serif', fontStyle: 'italic' },

  quantityRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  quantityLabel: { fontSize: '9px', letterSpacing: '0.2em', color: '#4a4030', fontFamily: 'monospace' },
  quantityControl: { display: 'flex', alignItems: 'center', gap: '6px' },
  qBtn: {
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#7a6a4a',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 700,
    transition: 'all 0.15s',
  },
  qValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 900,
    color: '#f0e6c8',
    fontFamily: 'monospace',
    lineHeight: 1,
  },
  quantityAvail: { fontSize: '10px', color: '#3a3a3a', fontFamily: 'monospace', textAlign: 'right' },

  btnRow: { display: 'flex', gap: '8px' },
  cancelBtn: {
    flex: '0 0 auto',
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#4a4030',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontFamily: 'monospace',
  },
  confirmBtn: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 900,
    letterSpacing: '0.08em',
    fontFamily: 'monospace',
    transition: 'all 0.15s',
  },
};
