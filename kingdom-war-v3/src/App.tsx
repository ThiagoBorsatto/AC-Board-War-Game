import React from 'react';
import { GameProvider, useGame } from './store/GameContext';
import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';
import { GameStatus } from './types';

function AppInner() {
  const { state, dispatch } = useGame();

  switch (state.status) {
    case GameStatus.MainMenu:
    case GameStatus.Setup:
      return <SetupScreen />;

    case GameStatus.Playing:
      return <GameScreen />;

    case GameStatus.GameOver: {
      const winner = state.players.find(p => p.id === state.winner);
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg,#0d0d0d 0%,#1a1208 40%,#0d0d0d 100%)',
          color: '#c9a84c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Palatino Linotype",serif',
          gap: '20px',
        }}>
          <div style={{ fontSize: '64px' }}>👑</div>
          <h1 style={{ fontSize: 'clamp(32px,6vw,56px)', margin: 0, letterSpacing: '0.12em', textShadow: '0 0 40px #c9a84c60' }}>
            FIM DE BATALHA
          </h1>
          <p style={{ color: '#7a6a4a', letterSpacing: '0.2em', fontSize: '16px', margin: 0 }}>
            Vencedor: <strong style={{ color: '#c9a84c' }}>{winner?.name ?? '—'}</strong>
          </p>

          {/* Placar final */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '380px' }}>
            {[...state.players]
              .sort((a, b) => b.territoryCount - a.territoryCount)
              .map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  background: p.id === state.winner ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${p.id === state.winner ? '#c9a84c40' : '#2a2a1a'}`,
                }}>
                  <span style={{ fontSize: '16px', minWidth: '24px', color: '#5a5040' }}>{i + 1}º</span>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '14px', color: p.isActive ? '#f0e6c8' : '#4a4030' }}>{p.name}</span>
                  <span style={{ fontSize: '12px', color: '#5a5040', fontFamily: 'monospace' }}>
                    {p.territoryCount} terr.
                  </span>
                  {!p.isActive && <span style={{ fontSize: '10px', color: '#e63946', letterSpacing: '0.1em' }}>ELIMINADO</span>}
                  {p.id === state.winner && <span style={{ fontSize: '14px' }}>👑</span>}
                </div>
              ))}
          </div>

          <button
            style={{
              marginTop: '16px',
              padding: '14px 40px',
              background: 'linear-gradient(135deg,#c9a84c,#a07830)',
              border: 'none',
              borderRadius: '6px',
              color: '#0d0d0d',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.12em',
              fontFamily: '"Palatino Linotype",serif',
            }}
            onClick={() => dispatch({ type: 'CLEAR_SAVED_STATE' })}
          >
            ↩ NOVA PARTIDA
          </button>
        </div>
      );
    }

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
