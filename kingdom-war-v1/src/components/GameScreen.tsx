// ============================================================
// KINGDOM WAR — GameScreen
// Tela principal de jogo: mapa + HUD + painéis de ação
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { GamePhase } from '../types';
import type { TerritoryId, TroopClass, Territory } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase } from '../store/GameContext';
import { MapView } from './MapView';
import { HUD } from './HUD';
import { PlayerBar } from './PlayerBar';
import { ActionPanel } from './ActionPanel';
import { countTroops } from '../engine/turns';
import { ADJACENCY_MAP } from '../data/territories';
import { TroopClass as TC } from '../types';

// ------------------------------------------------------------
// GameScreen
// ------------------------------------------------------------

export function GameScreen() {
  const { state, dispatch } = useGame();
  const currentPlayer = useCurrentPlayer();
  const phase = useTurnPhase();

  const [selectedFrom, setSelectedFrom] = useState<TerritoryId | null>(null);
  const [attackingClass, setAttackingClass] = useState<TroopClass | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Limpa seleção ao trocar de fase ou jogador
  useEffect(() => {
    setSelectedFrom(null);
    setAttackingClass(null);
  }, [phase, state.turn.currentPlayerId]);

  // Notificação temporária
  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // Territórios atacáveis a partir do selecionado
  const attackableIds: TerritoryId[] = selectedFrom
    ? (ADJACENCY_MAP[selectedFrom] ?? []).filter((id) => {
        const t = state.territories[id];
        return t?.ownerId !== currentPlayer?.id;
      })
    : [];

  // Territórios para remanejamento
  const repositionableIds: TerritoryId[] = selectedFrom
    ? (ADJACENCY_MAP[selectedFrom] ?? []).filter((id) => {
        const t = state.territories[id];
        return t?.ownerId === currentPlayer?.id;
      })
    : [];

  // Helper: classe dominante de um território
  const getDominantClass = (t?: Territory): TC => {
    if (!t || t.troops.length === 0) return TC.Infantry;
    return [...t.troops].sort((a, b) => b.quantity - a.quantity)[0].class;
  };

  // Handler de clique no mapa
  const handleTerritoryClick = useCallback(
    (id: TerritoryId) => {
      const territory = state.territories[id];
      if (!currentPlayer) return;

      if (phase === GamePhase.Distribution) {
        setSelectedFrom((prev) => (prev === id ? null : id));
        return;
      }

      if (phase === GamePhase.Attack) {
        if (!selectedFrom) {
          if (territory.ownerId !== currentPlayer.id) return;
          if (countTroops(territory.troops) < 2) {
            notify('Precisa de ao menos 2 tropas para atacar.');
            return;
          }
          setSelectedFrom(id);
          return;
        }
        if (id === selectedFrom) { setSelectedFrom(null); return; }
        if (territory.ownerId === currentPlayer.id) { setSelectedFrom(id); return; }

        dispatch({
          type: 'ATTACK',
          payload: {
            fromId: selectedFrom,
            toId: id,
            attackingClass: attackingClass ?? getDominantClass(state.territories[selectedFrom]),
          },
        });
        notify(`Ataque: T${selectedFrom.replace('territorio-', '')} → T${id.replace('territorio-', '')}`);
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

        const fromTroops = countTroops(state.territories[selectedFrom].troops);
        const qty = Math.max(1, Math.floor((fromTroops - 1) / 2));
        dispatch({
          type: 'REPOSITION',
          payload: { fromId: selectedFrom, toId: id, quantity: qty },
        });
        notify(`${qty} tropa(s) remanejada(s).`);
        setSelectedFrom(null);
      }
    },
    [state, currentPlayer, phase, selectedFrom, attackingClass, dispatch, notify]
  );

  return (
    <div style={styles.root}>
      <HUD />
      <div style={styles.centerRow}>
        <div style={styles.mapContainer}>
          <MapView
            onTerritoryClick={handleTerritoryClick}
            selectedFrom={selectedFrom}
            attackableIds={attackableIds}
            repositionableIds={repositionableIds}
          />
        </div>
        <ActionPanel
          selectedTerritoryId={selectedFrom}
          onAttackingClassChange={setAttackingClass}
          attackingClass={attackingClass}
        />
      </div>
      <PlayerBar />
      {notification && <div style={styles.notification}>{notification}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    background: '#0a0a08',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '"Palatino Linotype", Palatino, serif',
    color: '#f0e6c8',
  },
  centerRow: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },
  mapContainer: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: '#0a0a08',
  },
  notification: {
    position: 'fixed',
    bottom: '96px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(201,168,76,0.95)',
    color: '#0d0d0d',
    padding: '10px 24px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    pointerEvents: 'none',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
};
