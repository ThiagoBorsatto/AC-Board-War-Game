// ============================================================
// KINGDOM WAR — ActionPanel
// Painel lateral: distribuição, upgrades, cartas, objetivo
// ============================================================

import React, { useState } from 'react';
import { GamePhase, TroopClass, UpgradeLevel, CardSymbol } from '../types';
import type { TerritoryId } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase } from '../store/GameContext';
import { BASE_STATS, UPGRADE_BONUS, UPGRADE_COST, UPGRADE_LEVEL_NAME, getCardTradeValue } from '../constants';
import { validateUpgrade } from '../engine/economy';
import { isValidTrade } from '../engine/cards';
import { countTroops } from '../engine/turns';

interface ActionPanelProps {
  selectedTerritoryId: TerritoryId | null;
  attackingClass: TroopClass | null;
  onAttackingClassChange: (cls: TroopClass) => void;
}

type Tab = 'troops' | 'upgrade' | 'cards' | 'objective';

const CLASS_LIST = [
  { cls: TroopClass.Infantry,  icon: '🗡', name: 'Infantaria' },
  { cls: TroopClass.Artillery, icon: '💣', name: 'Artilharia' },
  { cls: TroopClass.Cavalry,   icon: '🐴', name: 'Cavalaria' },
];

const SYMBOL_ICON: Record<CardSymbol, string> = {
  [CardSymbol.Square]:   '■',
  [CardSymbol.Triangle]: '▲',
  [CardSymbol.Circle]:   '●',
  [CardSymbol.Wildcard]: '★',
};

const UPGRADE_COLOR: Record<UpgradeLevel, string> = {
  [UpgradeLevel.Base]:     '#3a3020',
  [UpgradeLevel.Veteran]:  '#7a9a6a',
  [UpgradeLevel.Elite]:    '#4a9eff',
  [UpgradeLevel.Champion]: '#c9a84c',
};

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
      <span style={{ fontSize: '9px', color: '#4a4030', minWidth: '54px' }}>{label}</span>
      <div style={{ flex: 1, height: '4px', background: '#1a1a12', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '10px', color, fontFamily: 'monospace', minWidth: '16px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function ActionPanel({ selectedTerritoryId, attackingClass, onAttackingClassChange }: ActionPanelProps) {
  const { state, dispatch } = useGame();
  const currentPlayer = useCurrentPlayer();
  const phase = useTurnPhase();
  const [tab, setTab] = useState<Tab>('troops');
  const [distributeClass, setDistributeClass] = useState<TroopClass>(TroopClass.Infantry);
  const [distributeQty, setDistributeQty] = useState(1);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showObjective, setShowObjective] = useState(false);

  if (!currentPlayer) return null;

  const territory = selectedTerritoryId ? state.territories[selectedTerritoryId] : null;

  const handleDistribute = () => {
    if (!selectedTerritoryId) return;
    dispatch({ type: 'DISTRIBUTE_TROOPS', payload: { territoryId: selectedTerritoryId, troopClass: distributeClass, quantity: distributeQty } });
  };

  const toggleCard = (id: string) => {
    setSelectedCards((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const canTrade = selectedCards.length === 3 && (() => {
    const cards = currentPlayer.hand.filter((c) => selectedCards.includes(c.id));
    if (cards.length !== 3) return false;
    return isValidTrade(cards as [typeof cards[0], typeof cards[0], typeof cards[0]]);
  })();

  const handleTrade = () => {
    if (!canTrade) return;
    dispatch({ type: 'TRADE_CARDS', payload: { cardIds: selectedCards as [string, string, string] } });
    setSelectedCards([]);
  };

  const TAB_LIST: { key: Tab; icon: string; label: string }[] = [
    { key: 'troops',    icon: '⚔', label: 'Tropas' },
    { key: 'upgrade',   icon: '⬆', label: 'Upgrade' },
    { key: 'cards',     icon: '🃏', label: `Cartas(${currentPlayer.hand.length})` },
    { key: 'objective', icon: '🎯', label: 'Missão' },
  ];

  return (
    <div style={s.root}>
      {/* Tabs */}
      <div style={s.tabs}>
        {TAB_LIST.map(({ key, icon, label }) => (
          <button key={key} style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }} onClick={() => setTab(key)}>
            <span>{icon}</span>
            <span style={s.tabLabel}>{label}</span>
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* TROPAS */}
        {tab === 'troops' && (
          <div style={s.section}>
            {phase === GamePhase.Distribution && (
              <>
                <p style={s.title}>DISTRIBUIR TROPAS</p>
                <p style={s.hint}>Disponíveis: <strong style={{ color: '#4a9eff' }}>{state.turn.troopsToDistribute}</strong></p>
                {!selectedTerritoryId ? (
                  <p style={s.hint}>Clique em um território seu no mapa.</p>
                ) : (
                  <>
                    <p style={s.hint}>T{selectedTerritoryId.replace('territorio-', '')} — {territory ? countTroops(territory.troops) : 0} tropas</p>
                    <p style={s.sub}>Classe</p>
                    <div style={s.clsRow}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <button key={cls} style={{ ...s.clsBtn, ...(distributeClass === cls ? s.clsBtnOn : {}) }} onClick={() => setDistributeClass(cls)}>
                          <span>{icon}</span><span style={s.clsName}>{name}</span>
                        </button>
                      ))}
                    </div>
                    <p style={s.sub}>Quantidade</p>
                    <div style={s.qtyRow}>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.max(1, distributeQty - 1))}>−</button>
                      <span style={s.qNum}>{distributeQty}</span>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.min(state.turn.troopsToDistribute, distributeQty + 1))}>+</button>
                      <button style={s.qAll} onClick={() => setDistributeQty(state.turn.troopsToDistribute)}>Tudo</button>
                    </div>
                    <button style={{ ...s.actBtn, opacity: state.turn.troopsToDistribute < distributeQty ? 0.4 : 1 }} onClick={handleDistribute} disabled={state.turn.troopsToDistribute < distributeQty}>
                      Alocar {distributeQty} {CLASS_LIST.find((c) => c.cls === distributeClass)?.name}
                    </button>
                  </>
                )}
              </>
            )}
            {phase === GamePhase.Attack && (
              <>
                <p style={s.title}>ATAQUE</p>
                <p style={s.hint}>{selectedTerritoryId ? `Origem: T${selectedTerritoryId.replace('territorio-','')} — Clique no território inimigo.` : 'Clique em território seu (≥2 tropas).'}</p>
                {selectedTerritoryId && (
                  <>
                    <p style={s.sub}>Classe atacante</p>
                    <div style={s.clsRow}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <button key={cls} style={{ ...s.clsBtn, ...(attackingClass === cls ? s.clsBtnOn : {}) }} onClick={() => onAttackingClassChange(cls)}>
                          <span>{icon}</span><span style={s.clsName}>{name}</span>
                        </button>
                      ))}
                    </div>
                    <p style={{ ...s.hint, fontSize: '10px' }}>Sem seleção = usa classe dominante do território.</p>
                  </>
                )}
              </>
            )}
            {phase === GamePhase.Reposition && (
              <>
                <p style={s.title}>REMANEJAMENTO</p>
                <p style={s.hint}>{selectedTerritoryId ? `Origem: T${selectedTerritoryId.replace('territorio-','')} — Clique em adjacente seu.` : 'Clique em território seu.'}</p>
              </>
            )}
          </div>
        )}

        {/* UPGRADES */}
        {tab === 'upgrade' && (
          <div style={s.section}>
            <p style={s.title}>MELHORIAS</p>
            <p style={s.hint}>Ouro: <strong style={{ color: '#c9a84c' }}>{currentPlayer.gold}🪙</strong></p>
            {CLASS_LIST.map(({ cls, icon, name }) => {
              const cur = currentPlayer.upgradeLevel[cls];
              const val = validateUpgrade(currentPlayer, cls);
              const base = BASE_STATS[cls];
              const bonus = UPGRADE_BONUS[cls][cur];
              return (
                <div key={cls} style={s.upCard}>
                  <div style={s.upHeader}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <div>
                      <span style={s.upName}>{name}</span>
                      <span style={{ ...s.upLvl, color: UPGRADE_COLOR[cur] }}>{UPGRADE_LEVEL_NAME[cur]}</span>
                    </div>
                  </div>
                  <StatBar label="Força"      value={base.force   + bonus.force}   max={15} color="#e63946" />
                  <StatBar label="Defesa"     value={base.defense + bonus.defense} max={15} color="#4a9eff" />
                  <StatBar label="Velocidade" value={base.speed   + bonus.speed}   max={12} color="#2dc653" />
                  {val.nextLevel !== null ? (
                    <button style={{ ...s.upBtn, opacity: val.canBuy ? 1 : 0.4 }} onClick={() => dispatch({ type: 'BUY_UPGRADE', payload: { troopClass: cls } })} disabled={!val.canBuy}>
                      {val.canBuy ? `⬆ ${UPGRADE_LEVEL_NAME[val.nextLevel!]} — ${val.cost}🪙` : `${val.cost}🪙 (insuficiente)`}
                    </button>
                  ) : <p style={s.maxLbl}>✦ NÍVEL MÁXIMO</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* CARTAS */}
        {tab === 'cards' && (
          <div style={s.section}>
            <p style={s.title}>CARTAS</p>
            <p style={s.hint}>Próxima troca: <strong style={{ color: '#c9a84c' }}>{getCardTradeValue(state.turn.globalTradeCount)} tropas</strong></p>
            <p style={s.hint}>Selecione 3 cartas (3 iguais ou 3 diferentes)</p>
            {currentPlayer.hand.length === 0 ? (
              <p style={{ ...s.hint, textAlign: 'center', marginTop: '16px' }}>Nenhuma carta na mão.</p>
            ) : (
              <div style={s.cardsGrid}>
                {currentPlayer.hand.map((card) => {
                  const sel = selectedCards.includes(card.id);
                  return (
                    <div key={card.id} style={{ ...s.cardChip, borderColor: sel ? '#c9a84c' : '#2a2a1a', background: sel ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.02)' }} onClick={() => toggleCard(card.id)}>
                      <span style={{ fontSize: '18px', color: '#c9a84c' }}>{SYMBOL_ICON[card.symbol]}</span>
                      <span style={{ fontSize: '9px', color: '#4a4030' }}>{card.territoryId ? card.territoryId.replace('territorio-', 'T') : '★'}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button style={{ ...s.actBtn, marginTop: '12px', opacity: canTrade ? 1 : 0.4 }} onClick={handleTrade} disabled={!canTrade}>
              🃏 Trocar por tropas
            </button>
          </div>
        )}

        {/* OBJETIVO */}
        {tab === 'objective' && (
          <div style={s.section}>
            <p style={s.title}>OBJETIVO SECRETO</p>
            <p style={s.hint}>Mantenha pressionado para revelar</p>
            <button style={s.objBtn} onMouseDown={() => setShowObjective(true)} onMouseUp={() => setShowObjective(false)} onMouseLeave={() => setShowObjective(false)} onTouchStart={() => setShowObjective(true)} onTouchEnd={() => setShowObjective(false)}>
              {showObjective ? '👁 REVELANDO...' : '🔒 SEGURAR PARA VER'}
            </button>
            {showObjective && (
              <div style={s.objBox}>
                <p style={{ fontSize: '12px', color: '#f0e6c8', lineHeight: 1.6, margin: 0 }}>{currentPlayer.secretObjective.description}</p>
                {currentPlayer.secretObjective.isFulfilled && <p style={{ fontSize: '10px', color: '#2dc653', letterSpacing: '0.2em', marginTop: '8px', marginBottom: 0 }}>✦ CUMPRIDO</p>}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { width: '260px', flexShrink: 0, background: '#0d0d0a', borderLeft: '1px solid #1e1e16', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Palatino Linotype", Palatino, serif', color: '#f0e6c8' },
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #1e1e16', flexShrink: 0 },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 4px', background: 'transparent', border: 'none', borderRight: '1px solid #1e1e16', color: '#3a3020', cursor: 'pointer', fontSize: '14px' },
  tabActive: { color: '#c9a84c', background: 'rgba(201,168,76,0.06)', borderBottom: '2px solid #c9a84c' },
  tabLabel: { fontSize: '8px', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '52px' },
  content: { flex: 1, overflowY: 'auto' },
  section: { padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '10px', letterSpacing: '0.2em', color: '#5a5040', textTransform: 'uppercase', margin: 0, borderBottom: '1px solid #1e1e12', paddingBottom: '6px' },
  hint: { fontSize: '11px', color: '#4a4030', margin: 0, lineHeight: 1.5 },
  sub: { fontSize: '9px', letterSpacing: '0.15em', color: '#3a3020', textTransform: 'uppercase', margin: '4px 0 2px' },
  clsRow: { display: 'flex', gap: '4px' },
  clsBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 4px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a1a', borderRadius: '4px', cursor: 'pointer', color: '#4a4030', fontSize: '14px' },
  clsBtnOn: { background: 'rgba(201,168,76,0.1)', border: '1px solid #c9a84c50', color: '#c9a84c' },
  clsName: { fontSize: '9px', letterSpacing: '0.04em' },
  qtyRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  qBtn: { width: '28px', height: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a1a', borderRadius: '4px', color: '#c9a84c', fontSize: '16px', cursor: 'pointer', lineHeight: 1 },
  qNum: { fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#f0e6c8', minWidth: '32px', textAlign: 'center' },
  qAll: { padding: '4px 10px', background: 'transparent', border: '1px solid #2a2a1a', borderRadius: '4px', color: '#5a5040', fontSize: '10px', cursor: 'pointer' },
  actBtn: { padding: '10px', background: 'linear-gradient(135deg,#c9a84c,#a07830)', border: 'none', borderRadius: '4px', color: '#0d0d0d', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', fontFamily: '"Palatino Linotype",serif' },
  upCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e12', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  upHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  upName: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#f0e6c8', letterSpacing: '0.05em' },
  upLvl: { display: 'block', fontSize: '9px', letterSpacing: '0.12em' },
  upBtn: { padding: '7px', background: 'rgba(201,168,76,0.1)', border: '1px solid #c9a84c30', borderRadius: '4px', color: '#c9a84c', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' },
  maxLbl: { fontSize: '9px', color: '#c9a84c', letterSpacing: '0.2em', textAlign: 'center', margin: 0 },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' },
  cardChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', borderRadius: '4px', border: '1px solid', cursor: 'pointer' },
  objBtn: { padding: '14px', background: 'rgba(201,168,76,0.06)', border: '1px solid #c9a84c30', borderRadius: '4px', color: '#c9a84c', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', userSelect: 'none', fontFamily: '"Palatino Linotype",serif' },
  objBox: { background: 'rgba(201,168,76,0.06)', border: '1px solid #c9a84c20', borderRadius: '4px', padding: '12px' },
};
