// ============================================================
// KINGDOM WAR — App Root
// ============================================================

import React from 'react';
import { GameProvider, useGame } from './store/GameContext';
import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';
import { GameStatus } from './types';

function AppInner() {
  const { state } = useGame();

  switch (state.status) {
    case GameStatus.MainMenu:
    case GameStatus.Setup:
      return <SetupScreen />;

    case GameStatus.Playing:
      return <GameScreen />;

    case GameStatus.GameOver:
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0d0d0d',
          color: '#c9a84c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Palatino Linotype", serif',
          gap: '16px',
        }}>
          <h1 style={{ fontSize: 'clamp(32px,6vw,56px)', margin: 0, letterSpacing: '0.12em' }}>
            👑 FIM DE BATALHA
          </h1>
          <p style={{ color: '#7a6a4a', letterSpacing: '0.2em', fontSize: '14px' }}>
            Vencedor: {state.players.find((p) => p.id === state.winner)?.name ?? '—'}
          </p>
          <button
            style={{
              marginTop: '16px',
              padding: '12px 32px',
              background: 'linear-gradient(135deg,#c9a84c,#a07830)',
              border: 'none',
              borderRadius: '4px',
              color: '#0d0d0d',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.12em',
              fontFamily: '"Palatino Linotype",serif',
            }}
            onClick={() => window.location.reload()}
          >
            ↩ VOLTAR AO MENU
          </button>
        </div>
      );

    default:
      return <SetupScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}
