// ============================================================
// KINGDOM WAR — SetupScreen
// UC-01: Configuração de partida para 4–6 jogadores
// Estética: medieval dark strategy — ouro/carvão/sangue
// ============================================================

import React, { useState, useCallback } from 'react';
import { useGame } from '../store/GameContext';
import { initializeGame } from '../engine/init';
import { ADJACENCY_MAP, ALL_TERRITORY_IDS } from '../data/territories';
import { PLAYER_COLORS } from '../constants';
import { GameStatus } from '../types';
import type { GameState } from '../types';
import { saveToLocalStorage } from '../store/persistence';

// ------------------------------------------------------------
// Tipos locais
// ------------------------------------------------------------

interface PlayerSlot {
  name: string;
  color: string;
  active: boolean;
}

const DEFAULT_SLOTS: PlayerSlot[] = [
  { name: 'Jogador 1', color: PLAYER_COLORS[0], active: true },
  { name: 'Jogador 2', color: PLAYER_COLORS[1], active: true },
  { name: 'Jogador 3', color: PLAYER_COLORS[2], active: true },
  { name: 'Jogador 4', color: PLAYER_COLORS[3], active: true },
  { name: 'Jogador 5', color: PLAYER_COLORS[4], active: false },
  { name: 'Jogador 6', color: PLAYER_COLORS[5], active: false },
];

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------

export function SetupScreen() {
  const { dispatch, hasSavedGame } = useGame();
  const [slots, setSlots] = useState<PlayerSlot[]>(DEFAULT_SLOTS);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const activePlayers = slots.filter((s) => s.active);
  const canStart = activePlayers.length >= 4 && activePlayers.length <= 6;

  // Atualiza nome de um slot
  const setName = useCallback((idx: number, name: string) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, name } : s)));
    if (name.trim()) setErrors((prev) => { const e = { ...prev }; delete e[idx]; return e; });
  }, []);

  // Alterna cor de um slot (cicla entre as cores disponíveis)
  const cycleColor = useCallback((idx: number) => {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const usedColors = prev.filter((_, j) => j !== idx).map((p) => p.color);
        const available = PLAYER_COLORS.filter((c) => !usedColors.includes(c));
        const current = PLAYER_COLORS.indexOf(s.color);
        const next = available.find((c) => PLAYER_COLORS.indexOf(c) > current) ?? available[0] ?? s.color;
        return { ...s, color: next };
      })
    );
  }, []);

  // Ativa/desativa slot (mínimo 4, máximo 6)
  const toggleSlot = useCallback((idx: number) => {
    setSlots((prev) => {
      const active = prev.filter((s) => s.active).length;
      const slot = prev[idx];
      if (slot.active && active <= 4) return prev; // mínimo 4
      if (!slot.active && active >= 6) return prev; // máximo 6
      return prev.map((s, i) => (i === idx ? { ...s, active: !s.active } : s));
    });
  }, []);

  // Inicia a partida
  const handleStart = useCallback(() => {
    const newErrors: Record<number, string> = {};
    slots.forEach((s, i) => {
      if (s.active && !s.name.trim()) newErrors[i] = 'Nome obrigatório';
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const playerSetups = slots
      .filter((s) => s.active)
      .map((s, i) => ({
        id: `player-${i}`,
        name: s.name.trim(),
        color: s.color,
      }));

    const gameState: GameState = initializeGame(
      playerSetups,
      ALL_TERRITORY_IDS,
      ADJACENCY_MAP
    );

    saveToLocalStorage(gameState);
    dispatch({ type: 'LOAD_SAVED_STATE', payload: gameState });
  }, [slots, dispatch]);

  // Continua partida salva
  const handleContinue = useCallback(() => {
    // GameContext já carregou o estado salvo no mount — só muda o status
    // O estado foi carregado via loadFromLocalStorage no Provider
    // Aqui apenas forçamos o re-render para a tela de jogo
    // O GameProvider já tem o estado correto
  }, []);

  return (
    <div style={styles.root}>
      {/* Grain overlay */}
      <div style={styles.grain} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.crownRow}>
          <span style={styles.crownIcon}>⚔</span>
          <span style={styles.crownIcon}>👑</span>
          <span style={styles.crownIcon}>⚔</span>
        </div>
        <h1 style={styles.title}>KINGDOM WAR</h1>
        <p style={styles.subtitle}>Estratégia & Conquista</p>
        <div style={styles.divider} />
      </div>

      {/* Aviso de partida salva */}
      {hasSavedGame && (
        <div style={styles.savedBanner}>
          <span style={styles.savedIcon}>💾</span>
          <span style={styles.savedText}>Partida em andamento detectada</span>
          <button style={styles.continueBtn} onClick={handleContinue}>
            Continuar
          </button>
          <button
            style={styles.discardBtn}
            onClick={() => dispatch({ type: 'CLEAR_SAVED_STATE' })}
          >
            Descartar
          </button>
        </div>
      )}

      {/* Player slots */}
      <div style={styles.slotsSection}>
        <p style={styles.slotsLabel}>
          COMANDANTES — {activePlayers.length} de 4–6
        </p>

        <div style={styles.slotGrid}>
          {slots.map((slot, idx) => {
            const isActive = slot.active;
            const hasError = !!errors[idx];
            const isHovered = hoveredSlot === idx;

            return (
              <div
                key={idx}
                style={{
                  ...styles.slot,
                  ...(isActive ? styles.slotActive : styles.slotInactive),
                  ...(isHovered && isActive ? styles.slotHovered : {}),
                  borderColor: isActive ? slot.color : '#333',
                  boxShadow: isActive
                    ? `0 0 16px ${slot.color}40, inset 0 0 24px rgba(0,0,0,0.4)`
                    : 'inset 0 0 24px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={() => setHoveredSlot(idx)}
                onMouseLeave={() => setHoveredSlot(null)}
              >
                {/* Número do slot */}
                <span style={{ ...styles.slotNumber, color: isActive ? slot.color : '#444' }}>
                  {idx + 1}
                </span>

                {isActive ? (
                  <>
                    {/* Cor — clica para trocar */}
                    <button
                      style={{ ...styles.colorDot, backgroundColor: slot.color }}
                      onClick={() => cycleColor(idx)}
                      title="Trocar cor"
                    />

                    {/* Nome */}
                    <input
                      style={{
                        ...styles.nameInput,
                        borderBottomColor: hasError ? '#e63946' : slot.color,
                        color: '#f0e6c8',
                      }}
                      value={slot.name}
                      onChange={(e) => setName(idx, e.target.value)}
                      maxLength={20}
                      placeholder="Nome do jogador"
                    />

                    {/* Erro */}
                    {hasError && (
                      <span style={styles.errorMsg}>{errors[idx]}</span>
                    )}

                    {/* Remover (só se > 4 ativos) */}
                    {activePlayers.length > 4 && (
                      <button
                        style={styles.removeBtn}
                        onClick={() => toggleSlot(idx)}
                        title="Remover jogador"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  /* Slot inativo — botão para adicionar */
                  <button
                    style={styles.addBtn}
                    onClick={() => toggleSlot(idx)}
                    disabled={activePlayers.length >= 6}
                  >
                    <span style={styles.addIcon}>+</span>
                    <span style={styles.addText}>Adicionar Jogador</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Regras rápidas */}
      <div style={styles.rulesRow}>
        {[
          { icon: '⚔', text: 'Combate por atributos' },
          { icon: '🏰', text: '6 ataques destroem fortaleza' },
          { icon: '🃏', text: 'Trocas progressivas de cartas' },
          { icon: '🎯', text: 'Objetivos secretos' },
        ].map((r) => (
          <div key={r.text} style={styles.ruleChip}>
            <span>{r.icon}</span>
            <span style={styles.ruleText}>{r.text}</span>
          </div>
        ))}
      </div>

      {/* Botão iniciar */}
      <button
        style={{
          ...styles.startBtn,
          ...(canStart ? styles.startBtnActive : styles.startBtnDisabled),
        }}
        onClick={handleStart}
        disabled={!canStart}
      >
        {canStart
          ? `⚔ INICIAR BATALHA — ${activePlayers.length} JOGADORES`
          : `Selecione entre 4 e 6 jogadores`}
      </button>

      <p style={styles.footer}>Kingdom War · 0001-26 · UniSENAI</p>
    </div>
  );
}

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1208 40%, #0d0d0d 100%)',
    color: '#f0e6c8',
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 64px',
    position: 'relative',
    overflowX: 'hidden',
  },
  grain: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    position: 'relative',
    zIndex: 1,
  },
  crownRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    fontSize: '20px',
    marginBottom: '8px',
    opacity: 0.7,
  },
  crownIcon: { display: 'inline-block' },
  title: {
    fontSize: 'clamp(36px, 8vw, 72px)',
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: '#c9a84c',
    textShadow: '0 0 40px #c9a84c60, 0 2px 0 #000',
    margin: 0,
    lineHeight: 1,
    fontFamily: '"Trajan Pro", "Palatino Linotype", serif',
  },
  subtitle: {
    fontSize: '13px',
    letterSpacing: '0.35em',
    color: '#7a6a4a',
    textTransform: 'uppercase',
    marginTop: '8px',
    marginBottom: '16px',
  },
  divider: {
    width: '200px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #c9a84c80, transparent)',
    margin: '0 auto',
  },

  savedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid #c9a84c40',
    borderRadius: '8px',
    padding: '12px 20px',
    marginBottom: '24px',
    width: '100%',
    maxWidth: '640px',
    zIndex: 1,
  },
  savedIcon: { fontSize: '18px' },
  savedText: { flex: 1, fontSize: '13px', color: '#c9a84c' },
  continueBtn: {
    background: '#c9a84c',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.05em',
  },
  discardBtn: {
    background: 'transparent',
    color: '#666',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '6px 14px',
    fontSize: '12px',
    cursor: 'pointer',
  },

  slotsSection: {
    width: '100%',
    maxWidth: '720px',
    zIndex: 1,
    marginBottom: '32px',
  },
  slotsLabel: {
    fontSize: '11px',
    letterSpacing: '0.3em',
    color: '#5a5040',
    textTransform: 'uppercase',
    marginBottom: '16px',
    textAlign: 'center',
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
  },
  slot: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '6px',
    border: '1px solid',
    transition: 'all 0.2s ease',
    position: 'relative',
    minHeight: '56px',
  },
  slotActive: {
    background: 'rgba(255,255,255,0.03)',
  },
  slotInactive: {
    background: 'rgba(0,0,0,0.3)',
    opacity: 0.5,
  },
  slotHovered: {
    background: 'rgba(255,255,255,0.05)',
    transform: 'translateY(-1px)',
  },
  slotNumber: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    minWidth: '16px',
    fontFamily: 'monospace',
  },
  colorDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.15s',
  },
  nameInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid',
    outline: 'none',
    fontSize: '15px',
    padding: '2px 0',
    fontFamily: '"Palatino Linotype", serif',
  },
  errorMsg: {
    position: 'absolute',
    bottom: '-18px',
    left: '60px',
    fontSize: '10px',
    color: '#e63946',
    letterSpacing: '0.05em',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#444',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 4px',
    lineHeight: 1,
    transition: 'color 0.15s',
  },
  addBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#444',
    transition: 'color 0.2s',
  },
  addIcon: { fontSize: '20px', lineHeight: 1 },
  addText: {
    fontSize: '12px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },

  rulesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '32px',
    zIndex: 1,
    maxWidth: '720px',
    width: '100%',
  },
  ruleChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid #c9a84c25',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '12px',
  },
  ruleText: { color: '#7a6a4a', letterSpacing: '0.04em' },

  startBtn: {
    padding: '16px 48px',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '"Palatino Linotype", serif',
    zIndex: 1,
    marginBottom: '24px',
  },
  startBtnActive: {
    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
    color: '#0d0d0d',
    boxShadow: '0 0 32px #c9a84c50, 0 4px 12px rgba(0,0,0,0.5)',
  },
  startBtnDisabled: {
    background: '#1a1a1a',
    color: '#333',
    cursor: 'not-allowed',
    border: '1px solid #222',
  },

  footer: {
    fontSize: '10px',
    color: '#2a2a2a',
    letterSpacing: '0.2em',
    zIndex: 1,
  },
};
