// ============================================================
// KINGDOM WAR — LeftPanel v2
// Fixes: abas maiores c/ espaço próprio, fontes mais claras,
//        botão cancelar partida, painel 440px
// ============================================================

import React, { useState } from 'react';
import { GamePhase, TroopClass, UpgradeLevel, CardSymbol, GameStatus } from '../types';
import type { TerritoryId } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase, useTimer, useActivePlayers } from '../store/GameContext';
import { BASE_STATS, UPGRADE_BONUS, UPGRADE_LEVEL_NAME, getCardTradeValue } from '../constants';
import { validateUpgrade } from '../engine/economy';
import { isValidTrade } from '../engine/cards';
import { countTroops } from '../engine/turns';

interface LeftPanelProps {
  selectedTerritoryId: TerritoryId | null;
  attackingClass: TroopClass | null;
  onAttackingClassChange: (cls: TroopClass) => void;
  repositionQty: number;
  onRepositionQtyChange: (n: number) => void;
  attackableIds: TerritoryId[];
  repositionableIds: TerritoryId[];
}

type Tab = 'action' | 'upgrade' | 'cards' | 'players';

const CLASS_LIST = [
  { cls: TroopClass.Infantry,  icon: '🗡', name: 'Infantaria' },
  { cls: TroopClass.Artillery, icon: '💣', name: 'Artilharia' },
  { cls: TroopClass.Cavalry,   icon: '🐴', name: 'Cavalaria'  },
];

const SYMBOL_ICON: Record<CardSymbol, string> = {
  [CardSymbol.Square]:   '■',
  [CardSymbol.Triangle]: '▲',
  [CardSymbol.Circle]:   '●',
  [CardSymbol.Wildcard]: '★',
};

const UPGRADE_COLOR: Record<UpgradeLevel, string> = {
  [UpgradeLevel.Base]:     '#888',
  [UpgradeLevel.Veteran]:  '#7ac46a',
  [UpgradeLevel.Elite]:    '#4ab4ff',
  [UpgradeLevel.Champion]: '#f0c060',
};

const PHASE_META: Record<GamePhase, { label: string; color: string; icon: string }> = {
  [GamePhase.Distribution]: { label: 'DISTRIBUIÇÃO', color: '#4ab4ff', icon: '⚙' },
  [GamePhase.Attack]:       { label: 'ATAQUE',        color: '#ff5566', icon: '⚔' },
  [GamePhase.Reposition]:   { label: 'REMANEJAMENTO', color: '#4ade80', icon: '↔' },
};

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <span style={{ fontSize: '12px', color: '#aaa', minWidth: '72px' }}>{label}</span>
      <div style={{ flex: 1, height: '7px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100,(value/max)*100)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '14px', fontWeight: 700, color, fontFamily: 'monospace', minWidth: '22px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function LeftPanel({
  selectedTerritoryId, attackingClass, onAttackingClassChange,
  repositionQty, onRepositionQtyChange, attackableIds, repositionableIds,
}: LeftPanelProps) {
  const { state, dispatch } = useGame();
  const currentPlayer = useCurrentPlayer();
  const activePlayers = useActivePlayers();
  const phase = useTurnPhase();
  const timer = useTimer();

  const [tab, setTab] = useState<Tab>('action');
  const [distributeClass, setDistributeClass] = useState<TroopClass>(TroopClass.Infantry);
  const [distributeQty, setDistributeQty] = useState(1);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showObjective, setShowObjective] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!currentPlayer) return null;

  const territory = selectedTerritoryId ? state.territories[selectedTerritoryId] : null;
  const pm = PHASE_META[phase];
  const isUrgent = timer <= 10;
  const timerPct = (timer / 60) * 100;

  const handleDistribute = () => {
    if (!selectedTerritoryId || state.turn.troopsToDistribute < distributeQty) return;
    dispatch({ type: 'DISTRIBUTE_TROOPS', payload: { territoryId: selectedTerritoryId, troopClass: distributeClass, quantity: distributeQty } });
  };

  const toggleCard = (id: string) => {
    setSelectedCards(prev => prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const canTrade = selectedCards.length === 3 && (() => {
    const cards = currentPlayer.hand.filter(c => selectedCards.includes(c.id));
    return cards.length === 3 && isValidTrade(cards as [typeof cards[0], typeof cards[0], typeof cards[0]]);
  })();

  const maxRepoQty = selectedTerritoryId
    ? Math.max(1, countTroops(state.territories[selectedTerritoryId]?.troops ?? []) - 1)
    : 1;

  const TAB_CONFIG: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: 'action',  icon: pm.icon, label: 'Ação' },
    { key: 'upgrade', icon: '⬆',    label: 'Upgrades' },
    { key: 'cards',   icon: '🃏',    label: 'Cartas', badge: currentPlayer.hand.length },
    { key: 'players', icon: '👥',    label: 'Jogadores', badge: activePlayers.length },
  ];

  return (
    <div style={s.root}>

      {/* ══ BLOCO DO JOGADOR ATUAL ══════════════════════════ */}
      <div style={s.playerBlock}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ ...s.avatar, backgroundColor: currentPlayer.color, boxShadow: `0 0 20px ${currentPlayer.color}90` }}>
            {currentPlayer.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.playerName}>{currentPlayer.name}</div>
            <div style={s.playerSub}>Sua vez · Turno {state.turnNumber}</div>
          </div>
          <div style={s.goldChip}>
            <span style={s.goldNum}>{currentPlayer.gold}</span>
            <span style={{ fontSize: '14px' }}>🪙</span>
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={s.statsRow}>
          {[
            { icon: '🗺', v: currentPlayer.territoryCount, l: 'Territórios' },
            { icon: '⚔', v: currentPlayer.totalTroops,    l: 'Tropas'      },
            { icon: '🃏', v: currentPlayer.hand.length,    l: 'Cartas'      },
          ].map(({ icon, v, l }) => (
            <div key={l} style={s.statChip}>
              <span style={{ fontSize: '16px' }}>{icon}</span>
              <span style={s.statVal}>{v}</span>
              <span style={s.statLbl}>{l}</span>
            </div>
          ))}
          {(() => {
            const fort = Object.values(state.territories).find(t => t.hasFortress && t.ownerId === currentPlayer.id);
            if (!fort) return null;
            const col = fort.fortressIntegrity > 50 ? '#4ade80' : fort.fortressIntegrity > 25 ? '#fbbf24' : '#ff5566';
            return (
              <div style={s.statChip}>
                <span style={{ fontSize: '16px' }}>🏰</span>
                <span style={{ ...s.statVal, color: col }}>{fort.fortressIntegrity}%</span>
                <span style={s.statLbl}>Fortaleza</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ══ FASE + TIMER ════════════════════════════════════ */}
      <div style={s.phaseBlock}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...s.phasePill, borderColor: pm.color + '70', background: pm.color + '18' }}>
            <span style={{ fontSize: '20px' }}>{pm.icon}</span>
            <span style={{ ...s.phaseText, color: pm.color }}>{pm.label}</span>
            {phase === GamePhase.Distribution && state.turn.troopsToDistribute > 0 && (
              <span style={{ ...s.troopsBadge, color: '#4ab4ff' }}>
                +{state.turn.troopsToDistribute}
              </span>
            )}
          </div>
          <div style={{ ...s.timerBox, borderColor: isUrgent ? '#ff5566' : '#333' }}>
            <span style={{ ...s.timerNum, color: isUrgent ? '#ff5566' : '#fff' }}>
              {String(timer).padStart(2,'0')}
            </span>
            <span style={s.timerLabel}>seg</span>
          </div>
        </div>
        <div style={s.timerBarBg}>
          <div style={{ ...s.timerBarFill, width: `${timerPct}%`, background: isUrgent ? '#ff5566' : pm.color }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.advBtn} onClick={() => dispatch({ type: 'ADVANCE_PHASE' })}>
            {phase === GamePhase.Reposition ? '✓ Encerrar Turno' : '→ Próxima Fase'}
          </button>
          {/* FIX 5: botão cancelar partida */}
          <button style={s.cancelBtn} onClick={() => setShowCancelConfirm(true)} title="Cancelar partida">
            ✕
          </button>
        </div>

        {/* Modal de confirmação */}
        {showCancelConfirm && (
          <div style={s.confirmBox}>
            <p style={s.confirmText}>Cancelar a partida atual? O progresso será perdido.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={s.confirmYes}
                onClick={() => dispatch({ type: 'CLEAR_SAVED_STATE' })}
              >
                Sim, cancelar
              </button>
              <button style={s.confirmNo} onClick={() => setShowCancelConfirm(false)}>
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ TABS ════════════════════════════════════════════ */}
      <div style={s.tabBar}>
        {TAB_CONFIG.map(({ key, icon, label, badge }) => (
          <button
            key={key}
            style={{
              ...s.tabBtn,
              ...(tab === key ? { ...s.tabBtnActive, borderBottomColor: pm.color, color: '#fff' } : {}),
            }}
            onClick={() => setTab(key)}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            <span style={s.tabLabel}>{label}</span>
            {badge !== undefined && badge > 0 && (
              <span style={{ ...s.tabBadge, background: tab === key ? pm.color : '#444' }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ CONTEÚDO ════════════════════════════════════════ */}
      <div style={s.content}>

        {/* ─── ABA AÇÃO ─────────────────────────────────── */}
        {tab === 'action' && (
          <div style={s.pad}>

            {/* DISTRIBUIÇÃO */}
            {phase === GamePhase.Distribution && (
              <>
                <p style={s.secTitle}>⚙ DISTRIBUIR TROPAS</p>
                <p style={s.secSub}>
                  {state.turn.troopsToDistribute > 0
                    ? <><span style={{ color: '#4ab4ff', fontWeight: 700, fontSize: '18px' }}>{state.turn.troopsToDistribute}</span> tropa(s) disponíveis</>
                    : 'Todas distribuídas — avance a fase'}
                </p>
                {!selectedTerritoryId ? (
                  <div style={s.hint}>
                    <span style={{ fontSize: '22px' }}>👆</span>
                    <span style={s.hintTxt}>Clique em um território seu no mapa</span>
                  </div>
                ) : (
                  <>
                    <div style={s.selBox}>
                      <span style={s.selLbl}>Território selecionado</span>
                      <span style={s.selId}>T{selectedTerritoryId.replace('territorio-','')}</span>
                      <span style={s.selSub}>{territory ? countTroops(territory.troops) : 0} tropas presentes</span>
                    </div>
                    <p style={s.fieldLbl}>CLASSE</p>
                    <div style={s.clsGrid}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <button key={cls} style={{ ...s.clsBtn, ...(distributeClass === cls ? { ...s.clsBtnOn, borderColor: pm.color } : {}) }} onClick={() => setDistributeClass(cls)}>
                          <span style={{ fontSize: '26px' }}>{icon}</span>
                          <span style={s.clsName}>{name}</span>
                          <span style={s.clsStats}>F:{BASE_STATS[cls].force} D:{BASE_STATS[cls].defense} V:{BASE_STATS[cls].speed}</span>
                        </button>
                      ))}
                    </div>
                    <p style={s.fieldLbl}>QUANTIDADE</p>
                    <div style={s.qRow}>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.max(1, distributeQty - 5))}>−5</button>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.max(1, distributeQty - 1))}>−</button>
                      <span style={s.qNum}>{distributeQty}</span>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.min(state.turn.troopsToDistribute, distributeQty + 1))}>+</button>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.min(state.turn.troopsToDistribute, distributeQty + 5))}>+5</button>
                      <button style={s.qMax} onClick={() => setDistributeQty(state.turn.troopsToDistribute)}>MAX</button>
                    </div>
                    <button
                      style={{ ...s.mainBtn, opacity: state.turn.troopsToDistribute < distributeQty ? 0.4 : 1 }}
                      onClick={handleDistribute}
                      disabled={state.turn.troopsToDistribute < distributeQty}
                    >
                      ⚙ Alocar {distributeQty}× {CLASS_LIST.find(c => c.cls === distributeClass)?.name}
                    </button>
                  </>
                )}
              </>
            )}

            {/* ATAQUE */}
            {phase === GamePhase.Attack && (
              <>
                <p style={s.secTitle}>⚔ FASE DE ATAQUE</p>
                <p style={s.secSub}>Selecione origem e clique no alvo inimigo</p>
                {!selectedTerritoryId ? (
                  <div style={s.hint}>
                    <span style={{ fontSize: '22px' }}>👆</span>
                    <span style={s.hintTxt}>Clique em território seu com ≥2 tropas</span>
                  </div>
                ) : (
                  <>
                    <div style={s.selBox}>
                      <span style={s.selLbl}>Atacando a partir de</span>
                      <span style={{ ...s.selId, color: '#ff5566' }}>T{selectedTerritoryId.replace('territorio-','')}</span>
                      <span style={s.selSub}>{territory ? countTroops(territory.troops) : 0} tropas</span>
                    </div>
                    <p style={s.fieldLbl}>CLASSE ATACANTE (opcional)</p>
                    <div style={s.clsGrid}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <button key={cls} style={{ ...s.clsBtn, ...(attackingClass === cls ? { ...s.clsBtnOn, borderColor: '#ff5566' } : {}) }} onClick={() => onAttackingClassChange(cls)}>
                          <span style={{ fontSize: '26px' }}>{icon}</span>
                          <span style={s.clsName}>{name}</span>
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 12px' }}>
                      Sem seleção = usa a classe dominante do território
                    </p>
                    {attackableIds.length > 0 ? (
                      <div style={s.infoBox}>
                        <span style={{ color: '#ff5566', fontWeight: 700, fontSize: '20px' }}>{attackableIds.length}</span>
                        <span style={{ color: '#ccc', fontSize: '13px' }}> alvo(s) disponíveis — clique no mapa</span>
                      </div>
                    ) : (
                      <div style={s.warnBox}>Nenhum território inimigo adjacente</div>
                    )}
                  </>
                )}
              </>
            )}

            {/* REMANEJAMENTO */}
            {phase === GamePhase.Reposition && (
              <>
                <p style={s.secTitle}>↔ REMANEJAMENTO</p>
                <p style={s.secSub}>Mova tropas entre territórios adjacentes seus</p>
                {!selectedTerritoryId ? (
                  <div style={s.hint}>
                    <span style={{ fontSize: '22px' }}>👆</span>
                    <span style={s.hintTxt}>Clique em território seu para selecionar a origem</span>
                  </div>
                ) : (
                  <>
                    <div style={s.selBox}>
                      <span style={s.selLbl}>Origem</span>
                      <span style={{ ...s.selId, color: '#4ade80' }}>T{selectedTerritoryId.replace('territorio-','')}</span>
                      <span style={s.selSub}>{territory ? countTroops(territory.troops) : 0} tropas (mín. 1 fica)</span>
                    </div>
                    <p style={s.fieldLbl}>TROPAS A MOVER (máx. {maxRepoQty})</p>
                    <div style={s.qRow}>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.max(1, repositionQty - 5))}>−5</button>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.max(1, repositionQty - 1))}>−</button>
                      <span style={s.qNum}>{repositionQty}</span>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.min(maxRepoQty, repositionQty + 1))}>+</button>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.min(maxRepoQty, repositionQty + 5))}>+5</button>
                      <button style={s.qMax} onClick={() => onRepositionQtyChange(maxRepoQty)}>MAX</button>
                    </div>
                    {repositionableIds.length > 0 ? (
                      <div style={s.infoBox}>
                        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '20px' }}>{repositionableIds.length}</span>
                        <span style={{ color: '#ccc', fontSize: '13px' }}> destino(s) disponíveis — clique no mapa</span>
                      </div>
                    ) : (
                      <div style={s.warnBox}>Nenhum território adjacente seu disponível</div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Objetivo secreto */}
            <div style={{ borderTop: '1px solid #222', paddingTop: '14px', marginTop: '4px' }}>
              <button
                style={s.objBtn}
                onMouseDown={() => setShowObjective(true)}
                onMouseUp={() => setShowObjective(false)}
                onMouseLeave={() => setShowObjective(false)}
                onTouchStart={() => setShowObjective(true)}
                onTouchEnd={() => setShowObjective(false)}
              >
                {showObjective ? '👁 Revelando objetivo...' : '🎯 Segurar para ver objetivo secreto'}
              </button>
              {showObjective && (
                <div style={s.objBox}>
                  <p style={s.objTxt}>{currentPlayer.secretObjective.description}</p>
                  {currentPlayer.secretObjective.isFulfilled && (
                    <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '12px', letterSpacing: '0.2em', margin: '8px 0 0' }}>✦ CUMPRIDO!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ABA UPGRADES ─────────────────────────────── */}
        {tab === 'upgrade' && (
          <div style={s.pad}>
            <p style={s.secTitle}>⬆ MELHORIAS DE TROPAS</p>
            <p style={s.secSub}>Ouro disponível: <span style={{ color: '#f0c060', fontWeight: 700 }}>{currentPlayer.gold}🪙</span></p>
            {CLASS_LIST.map(({ cls, icon, name }) => {
              const cur = currentPlayer.upgradeLevel[cls];
              const val = validateUpgrade(currentPlayer, cls);
              const base = BASE_STATS[cls];
              const bonus = UPGRADE_BONUS[cls][cur];
              return (
                <div key={cls} style={s.upCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '32px' }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>{name}</div>
                      <div style={{ fontSize: '12px', color: UPGRADE_COLOR[cur], letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {UPGRADE_LEVEL_NAME[cur]}
                      </div>
                    </div>
                  </div>
                  <StatBar label="Força"      value={base.force   + bonus.force}   max={15} color="#ff5566" />
                  <StatBar label="Defesa"     value={base.defense + bonus.defense} max={15} color="#4ab4ff" />
                  <StatBar label="Velocidade" value={base.speed   + bonus.speed}   max={12} color="#4ade80" />
                  {val.nextLevel !== null ? (
                    <button
                      style={{ ...s.upBtn, opacity: val.canBuy ? 1 : 0.4, marginTop: '8px' }}
                      onClick={() => dispatch({ type: 'BUY_UPGRADE', payload: { troopClass: cls } })}
                      disabled={!val.canBuy}
                    >
                      {val.canBuy
                        ? `⬆ Evoluir para ${UPGRADE_LEVEL_NAME[val.nextLevel!]} — ${val.cost}🪙`
                        : `${val.cost}🪙 necessário (faltam ${val.cost - currentPlayer.gold}🪙)`}
                    </button>
                  ) : (
                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#f0c060', letterSpacing: '0.18em', margin: '6px 0 0' }}>✦ NÍVEL MÁXIMO</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── ABA CARTAS ───────────────────────────────── */}
        {tab === 'cards' && (
          <div style={s.pad}>
            <p style={s.secTitle}>🃏 CARTAS DE TERRITÓRIO</p>
            <p style={s.secSub}>
              Próxima troca: <span style={{ color: '#f0c060', fontWeight: 700 }}>{getCardTradeValue(state.turn.globalTradeCount)} tropas</span>
              <span style={{ color: '#666' }}> · troca #{state.turn.globalTradeCount + 1}</span>
            </p>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
              Selecione 3 cartas iguais ou 3 diferentes para trocar
            </p>
            {currentPlayer.hand.length === 0 ? (
              <div style={s.hint}>
                <span style={{ fontSize: '22px' }}>🃏</span>
                <span style={s.hintTxt}>Nenhuma carta. Conquiste territórios para ganhar cartas ao fim do turno.</span>
              </div>
            ) : (
              <div style={s.cardsGrid}>
                {currentPlayer.hand.map(card => {
                  const sel = selectedCards.includes(card.id);
                  return (
                    <div key={card.id} style={{ ...s.cardChip, borderColor: sel ? '#f0c060' : '#333', background: sel ? 'rgba(240,192,96,0.14)' : '#111', boxShadow: sel ? '0 0 12px #f0c06060' : 'none' }} onClick={() => toggleCard(card.id)}>
                      <span style={{ fontSize: '30px', color: '#f0c060', lineHeight: 1 }}>{SYMBOL_ICON[card.symbol]}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: sel ? '#f0c060' : '#888' }}>
                        {card.territoryId ? `T${card.territoryId.replace('territorio-','')}` : '★ Curinga'}
                      </span>
                      {sel && <span style={{ fontSize: '10px', color: '#f0c060', letterSpacing: '0.1em' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              style={{ ...s.mainBtn, marginTop: '12px', opacity: canTrade ? 1 : 0.4 }}
              onClick={() => {
                if (!canTrade) return;
                dispatch({ type: 'TRADE_CARDS', payload: { cardIds: selectedCards as [string,string,string] } });
                setSelectedCards([]);
              }}
              disabled={!canTrade}
            >
              🃏 Trocar {selectedCards.length}/3 cartas por tropas
            </button>
          </div>
        )}

        {/* ─── ABA JOGADORES ────────────────────────────── */}
        {tab === 'players' && (
          <div style={s.pad}>
            <p style={s.secTitle}>👥 COMANDANTES</p>
            <p style={s.secSub}>{activePlayers.length} jogadores ativos</p>
            {activePlayers.map(player => {
              const isCurrent = player.id === currentPlayer.id;
              const isExp = expandedPlayer === player.id;
              const fort = Object.values(state.territories).find(t => t.hasFortress && t.ownerId === player.id);
              return (
                <div key={player.id} style={{ ...s.playerCard, borderColor: isCurrent ? player.color : '#2a2a2a', background: isCurrent ? `${player.color}12` : '#111' }} onClick={() => setExpandedPlayer(isExp ? null : player.id)}>
                  {isCurrent && <div style={{ ...s.curPip, background: player.color }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: player.color, boxShadow: `0 0 8px ${player.color}`, flexShrink: 0 }} />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: isCurrent ? '#fff' : '#aaa', flex: 1 }}>{player.name}</span>
                    {isCurrent && <span style={{ fontSize: '10px', color: player.color, border: `1px solid ${player.color}`, borderRadius: '3px', padding: '1px 6px', letterSpacing: '0.1em' }}>SUA VEZ</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {[
                      { i: '🗺', v: player.territoryCount, l: 'Terr.' },
                      { i: '⚔', v: player.totalTroops,    l: 'Tropas' },
                      { i: '🪙', v: player.gold,           l: 'Ouro'   },
                      { i: '🃏', v: player.hand.length,    l: 'Cartas' },
                    ].map(({ i, v, l }) => (
                      <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1a1a1a', borderRadius: '5px', padding: '5px 4px' }}>
                        <span style={{ fontSize: '13px' }}>{i}</span>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: isCurrent ? player.color : '#666', fontFamily: 'monospace' }}>{v}</span>
                        <span style={{ fontSize: '9px', color: '#555', letterSpacing: '0.05em' }}>{l}</span>
                      </div>
                    ))}
                  </div>
                  {fort && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px' }}>🏰</span>
                      <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${fort.fortressIntegrity}%`, height: '100%', borderRadius: '3px', transition: 'width 0.4s', background: fort.fortressIntegrity > 50 ? '#4ade80' : fort.fortressIntegrity > 25 ? '#fbbf24' : '#ff5566' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace', minWidth: '36px', textAlign: 'right' }}>{fort.fortressIntegrity}%</span>
                    </div>
                  )}
                  {isExp && (
                    <div style={{ borderTop: '1px solid #222', marginTop: '8px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px' }}>{icon}</span>
                          <span style={{ fontSize: '12px', color: '#888', flex: 1 }}>{name}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: UPGRADE_COLOR[player.upgradeLevel[cls]] }}>
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
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Palatino Linotype",Palatino,serif', color: '#f0e6c8', background: '#0f0f0c' },

  // Player block
  playerBlock: { flexShrink: 0, padding: '16px', background: '#131310', borderBottom: '1px solid #252520', display: 'flex', flexDirection: 'column', gap: '12px' },
  avatar: { width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#000', flexShrink: 0 },
  playerName: { fontSize: '20px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.03em', lineHeight: 1 },
  playerSub: { fontSize: '12px', color: '#888', marginTop: '3px' },
  goldChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(240,192,96,0.12)', border: '1px solid rgba(240,192,96,0.3)', borderRadius: '8px', padding: '8px 12px', gap: '2px' },
  goldNum: { fontSize: '22px', fontWeight: 900, color: '#f0c060', fontFamily: 'monospace', lineHeight: 1 },
  statsRow: { display: 'flex', gap: '6px' },
  statChip: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: '#1a1a18', borderRadius: '7px', padding: '8px 4px', border: '1px solid #252520' },
  statVal: { fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#fff', lineHeight: 1 },
  statLbl: { fontSize: '9px', color: '#666', letterSpacing: '0.06em' },

  // Phase block
  phaseBlock: { flexShrink: 0, padding: '12px 16px', background: '#111', borderBottom: '1px solid #252520', display: 'flex', flexDirection: 'column', gap: '10px' },
  phasePill: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid' },
  phaseText: { fontSize: '14px', fontWeight: 700, letterSpacing: '0.14em' },
  troopsBadge: { marginLeft: 'auto', fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' },
  timerBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0d0d0c', borderRadius: '8px', padding: '6px 14px', minWidth: '60px', border: '1px solid' },
  timerNum: { fontSize: '30px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1, transition: 'color 0.3s' },
  timerLabel: { fontSize: '9px', color: '#555', letterSpacing: '0.15em' },
  timerBarBg: { height: '5px', background: '#1a1a18', borderRadius: '3px', overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.9s linear, background 0.3s' },
  advBtn: { flex: 1, padding: '12px', background: 'rgba(240,192,96,0.1)', border: '1px solid rgba(240,192,96,0.3)', borderRadius: '7px', color: '#f0c060', cursor: 'pointer', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', fontFamily: '"Palatino Linotype",serif' },
  cancelBtn: { width: '44px', padding: '12px 0', background: 'rgba(255,85,102,0.08)', border: '1px solid rgba(255,85,102,0.25)', borderRadius: '7px', color: '#ff5566', cursor: 'pointer', fontSize: '16px', fontWeight: 700 },
  confirmBox: { background: '#1a1008', border: '1px solid rgba(255,85,102,0.4)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
  confirmText: { fontSize: '13px', color: '#ddd', margin: 0, lineHeight: 1.5 },
  confirmYes: { flex: 1, padding: '9px', background: 'rgba(255,85,102,0.15)', border: '1px solid rgba(255,85,102,0.4)', borderRadius: '6px', color: '#ff5566', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: '"Palatino Linotype",serif' },
  confirmNo:  { flex: 1, padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid #333', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '12px', fontFamily: '"Palatino Linotype",serif' },

  // Tabs — FIX 2/6: abas maiores com espaço próprio
  tabBar: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', flexShrink: 0, background: '#0d0d0c', borderBottom: '1px solid #252520' },
  tabBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', color: '#555', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' },
  tabBtnActive: { background: 'rgba(255,255,255,0.04)' },
  tabLabel: { fontSize: '11px', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' },
  tabBadge: { position: 'absolute', top: '6px', right: '8px', fontSize: '10px', fontWeight: 700, borderRadius: '10px', padding: '1px 5px', color: '#000', fontFamily: 'monospace' },

  // Content
  content: { flex: 1, overflowY: 'auto' },
  pad: { padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' },

  // Section headers — FIX 3: fontes mais claras
  secTitle: { fontSize: '14px', fontWeight: 700, letterSpacing: '0.18em', color: '#ffffff', margin: 0, textTransform: 'uppercase' },
  secSub: { fontSize: '13px', color: '#aaa', margin: 0, lineHeight: 1.5 },

  hint: { display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: '8px', padding: '16px' },
  hintTxt: { fontSize: '14px', color: '#999', lineHeight: 1.6 },
  infoBox: { padding: '12px 16px', background: 'rgba(74,158,255,0.07)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: '8px' },
  warnBox: { padding: '12px 16px', background: 'rgba(255,85,102,0.07)', border: '1px solid rgba(255,85,102,0.2)', borderRadius: '8px', fontSize: '13px', color: '#ff8899' },

  selBox: { display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(240,192,96,0.07)', border: '1px solid rgba(240,192,96,0.2)', borderRadius: '8px', padding: '12px 16px' },
  selLbl: { fontSize: '10px', color: '#888', letterSpacing: '0.18em', textTransform: 'uppercase' },
  selId: { fontSize: '28px', fontWeight: 900, color: '#f0c060', fontFamily: 'monospace', letterSpacing: '0.04em' },
  selSub: { fontSize: '13px', color: '#888' },

  fieldLbl: { fontSize: '11px', color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 },

  clsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' },
  clsBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 6px', background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: '8px', cursor: 'pointer', color: '#777', transition: 'all 0.15s' },
  clsBtnOn: { background: 'rgba(240,192,96,0.1)', color: '#fff' },
  clsName: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em' },
  clsStats: { fontSize: '10px', color: '#555', fontFamily: 'monospace' },

  qRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  qBtn: { width: '40px', height: '40px', background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: '7px', color: '#f0c060', fontSize: '16px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 },
  qNum: { flex: 1, textAlign: 'center', fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', color: '#fff' },
  qMax: { padding: '6px 12px', background: 'rgba(240,192,96,0.1)', border: '1px solid rgba(240,192,96,0.3)', borderRadius: '7px', color: '#f0c060', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', flexShrink: 0 },

  mainBtn: { padding: '15px', background: 'linear-gradient(135deg,#c9a84c,#a07830)', border: 'none', borderRadius: '8px', color: '#000', fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', fontFamily: '"Palatino Linotype",serif', width: '100%', transition: 'opacity 0.15s' },

  objBtn: { padding: '13px', background: 'rgba(240,192,96,0.06)', border: '1px solid rgba(240,192,96,0.18)', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer', letterSpacing: '0.05em', userSelect: 'none', fontFamily: '"Palatino Linotype",serif', width: '100%' },
  objBox: { padding: '14px', background: 'rgba(240,192,96,0.07)', border: '1px solid rgba(240,192,96,0.2)', borderRadius: '8px' },
  objTxt: { fontSize: '14px', color: '#fff', lineHeight: 1.7, margin: 0 },

  upCard: { background: '#141412', border: '1px solid #2a2a28', borderRadius: '9px', padding: '16px', display: 'flex', flexDirection: 'column' },
  upBtn: { padding: '11px', background: 'rgba(240,192,96,0.09)', border: '1px solid rgba(240,192,96,0.25)', borderRadius: '7px', color: '#f0c060', fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', width: '100%' },

  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' },
  cardChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '14px 6px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' },

  playerCard: { border: '1px solid', borderRadius: '9px', padding: '14px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', marginBottom: '8px' },
  curPip: { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '44px', height: '4px', borderRadius: '0 0 4px 4px' },
};
