// ============================================================
// KINGDOM WAR — GameScreen v2
// Layout: painel esquerdo fixo (400px) + mapa direito
// BUG FIX 4: remanejamento com quantidade customizada
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { GamePhase } from '../types';
import type { TerritoryId, TroopClass, Territory } from '../types';
import { TroopClass as TC } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase } from '../store/GameContext';
import { MapView } from './MapView';
import { LeftPanel } from './LeftPanel';
import { countTroops } from '../engine/turns';
import { ADJACENCY_MAP } from '../data/territories';

export function GameScreen() {
  const { state, dispatch } = useGame();
  const currentPlayer = useCurrentPlayer();
  const phase = useTurnPhase();

  const [selectedFrom, setSelectedFrom] = useState<TerritoryId | null>(null);
  const [attackingClass, setAttackingClass] = useState<TroopClass | null>(null);
  const [repositionQty, setRepositionQty] = useState(1);
  const [notification, setNotification] = useState<{ msg: string; type: 'info' | 'win' | 'loss' } | null>(null);

  // Limpa seleção ao trocar de fase ou jogador
  useEffect(() => {
    setSelectedFrom(null);
    setAttackingClass(null);
    setRepositionQty(1);
  }, [phase, state.turn.currentPlayerId]);

  const notify = useCallback((msg: string, type: 'info' | 'win' | 'loss' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2800);
  }, []);

  const getDominantClass = (t?: Territory): TC => {
    if (!t || t.troops.length === 0) return TC.Infantry;
    return [...t.troops].sort((a, b) => b.quantity - a.quantity)[0].class;
  };

  // Calcula alvos de ataque para o território selecionado
  // BUG FIX 1: usa adjacentIds do estado (não refaz o lookup no ADJACENCY_MAP)
  // para garantir consistência — mas mantemos fallback no ADJACENCY_MAP caso o estado
  // não tenha sido populado ainda
  const attackableIds: TerritoryId[] = selectedFrom
    ? (
        state.territories[selectedFrom]?.adjacentIds.length
          ? state.territories[selectedFrom].adjacentIds
          : (ADJACENCY_MAP[selectedFrom] ?? [])
      ).filter(id => {
        const t = state.territories[id];
        return t && t.ownerId !== currentPlayer?.id;
      })
    : [];

  const repositionableIds: TerritoryId[] = selectedFrom
    ? (
        state.territories[selectedFrom]?.adjacentIds.length
          ? state.territories[selectedFrom].adjacentIds
          : (ADJACENCY_MAP[selectedFrom] ?? [])
      ).filter(id => {
        const t = state.territories[id];
        return t && t.ownerId === currentPlayer?.id;
      })
    : [];

  const handleTerritoryClick = useCallback(
    (id: TerritoryId) => {
      const territory = state.territories[id];
      if (!currentPlayer) return;

      if (phase === GamePhase.Distribution) {
        setSelectedFrom(prev => prev === id ? null : id);
        return;
      }

      if (phase === GamePhase.Attack) {
        if (!selectedFrom) {
          if (territory.ownerId !== currentPlayer.id) return;
          if (countTroops(territory.troops) < 2) {
            notify('Precisa de ao menos 2 tropas para atacar.', 'info');
            return;
          }
          setSelectedFrom(id);
          return;
        }
        if (id === selectedFrom) { setSelectedFrom(null); return; }
        if (territory.ownerId === currentPlayer.id) { setSelectedFrom(id); return; }

        const cls = attackingClass ?? getDominantClass(state.territories[selectedFrom]);
        dispatch({
          type: 'ATTACK',
          payload: { fromId: selectedFrom, toId: id, attackingClass: cls },
        });
        notify(
          `⚔ T${selectedFrom.replace('territorio-','')} atacou T${id.replace('territorio-','')}`,
          territory.ownerId ? 'info' : 'win'
        );
        setSelectedFrom(null);
        setAttackingClass(null);
        return;
      }

      if (phase === GamePhase.Reposition) {
        if (!selectedFrom) {
          if (territory.ownerId !== currentPlayer.id) return;
          setSelectedFrom(id);
          return;
        }
        if (id === selectedFrom) { setSelectedFrom(null); return; }
        if (territory.ownerId !== currentPlayer.id) return;

        const maxQty = countTroops(state.territories[selectedFrom].troops) - 1;
        const qty = Math.min(repositionQty, maxQty);
        if (qty < 1) { notify('Tropas insuficientes para remanejar.', 'info'); return; }

        dispatch({ type: 'REPOSITION', payload: { fromId: selectedFrom, toId: id, quantity: qty } });
        notify(`↔ ${qty} tropa(s) movida(s) para T${id.replace('territorio-','')}`, 'info');
        setSelectedFrom(null);
        setRepositionQty(1);
      }
    },
    [state, currentPlayer, phase, selectedFrom, attackingClass, repositionQty, dispatch, notify]
  );

  return (
    <div style={s.root}>
      {/* Painel esquerdo — menus */}
      <div style={s.leftCol}>
        <LeftPanel
          selectedTerritoryId={selectedFrom}
          attackingClass={attackingClass}
          onAttackingClassChange={setAttackingClass}
          repositionQty={repositionQty}
          onRepositionQtyChange={setRepositionQty}
          attackableIds={attackableIds}
          repositionableIds={repositionableIds}
        />
      </div>

      {/* Coluna direita — mapa */}
      <div style={s.rightCol}>
        <MapView
          onTerritoryClick={handleTerritoryClick}
          selectedFrom={selectedFrom}
          attackableIds={attackableIds}
          repositionableIds={repositionableIds}
        />
      </div>

      {/* Notificação flutuante */}
      {notification && (
        <div style={{
          ...s.notif,
          background: notification.type === 'win'  ? 'rgba(45,198,83,0.95)'
                    : notification.type === 'loss' ? 'rgba(230,57,70,0.95)'
                    : 'rgba(201,168,76,0.95)',
        }}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw', height: '100vh',
    background: '#0a0a08',
    display: 'flex',
    overflow: 'hidden',
    fontFamily: '"Palatino Linotype", Palatino, serif',
    color: '#f0e6c8',
  },
  leftCol: {
    width: '440px',
    flexShrink: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid #2a2a1a',
    background: 'linear-gradient(180deg, #111108 0%, #0d0d0a 100%)',
  },
  rightCol: {
    flex: 1,
    height: '100vh',
    overflow: 'hidden',
    background: '#0a0a08',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
  },
  notif: {
    position: 'fixed',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#0d0d0d',
    padding: '12px 28px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    pointerEvents: 'none',
    zIndex: 200,
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    animation: 'fadeInUp 0.2s ease',
    whiteSpace: 'nowrap',
  },
};
