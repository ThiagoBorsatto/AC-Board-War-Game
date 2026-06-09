// ============================================================
// KINGDOM WAR — LeftPanel
// Painel esquerdo unificado: HUD + ações + jogadores
// Layout vertical de 400px de largura, altura 100vh
// ============================================================

import React, { useState } from 'react';
import { GamePhase, TroopClass, UpgradeLevel, CardSymbol } from '../types';
import type { TerritoryId } from '../types';
import { useGame, useCurrentPlayer, useTurnPhase, useTimer, useActivePlayers } from '../store/GameContext';
import { BASE_STATS, UPGRADE_BONUS, UPGRADE_LEVEL_NAME, getCardTradeValue, PLAYER_COLORS } from '../constants';
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
  { cls: TroopClass.Infantry,  icon: '🗡', name: 'Infantaria',  short: 'INF' },
  { cls: TroopClass.Artillery, icon: '💣', name: 'Artilharia',  short: 'ART' },
  { cls: TroopClass.Cavalry,   icon: '🐴', name: 'Cavalaria',   short: 'CAV' },
];

const SYMBOL_ICON: Record<CardSymbol, string> = {
  [CardSymbol.Square]:   '■',
  [CardSymbol.Triangle]: '▲',
  [CardSymbol.Circle]:   '●',
  [CardSymbol.Wildcard]: '★',
};

const UPGRADE_COLOR: Record<UpgradeLevel, string> = {
  [UpgradeLevel.Base]:     '#555',
  [UpgradeLevel.Veteran]:  '#7a9a6a',
  [UpgradeLevel.Elite]:    '#4a9eff',
  [UpgradeLevel.Champion]: '#c9a84c',
};

const PHASE_META: Record<GamePhase, { label: string; color: string; icon: string }> = {
  [GamePhase.Distribution]: { label: 'DISTRIBUIÇÃO', color: '#4a9eff', icon: '⚙' },
  [GamePhase.Attack]:       { label: 'ATAQUE',        color: '#e63946', icon: '⚔' },
  [GamePhase.Reposition]:   { label: 'REMANEJAMENTO', color: '#2dc653', icon: '↔' },
};

// ── StatBar ──────────────────────────────────────────────────
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
      <span style={{ fontSize: '11px', color: '#6a6050', minWidth: '70px' }}>{label}</span>
      <div style={{ flex: 1, height: '6px', background: '#1a1a12', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'monospace', minWidth: '20px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function LeftPanel({
  selectedTerritoryId,
  attackingClass,
  onAttackingClassChange,
  repositionQty,
  onRepositionQtyChange,
  attackableIds,
  repositionableIds,
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

  if (!currentPlayer) return null;

  const territory = selectedTerritoryId ? state.territories[selectedTerritoryId] : null;
  const phaseMeta = PHASE_META[phase];
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
    if (cards.length !== 3) return false;
    return isValidTrade(cards as [typeof cards[0], typeof cards[0], typeof cards[0]]);
  })();

  const handleTrade = () => {
    if (!canTrade) return;
    dispatch({ type: 'TRADE_CARDS', payload: { cardIds: selectedCards as [string, string, string] } });
    setSelectedCards([]);
  };

  // Máximo de tropas disponíveis para remanejar
  const maxRepositionQty = selectedTerritoryId
    ? Math.max(1, countTroops(state.territories[selectedTerritoryId]?.troops ?? []) - 1)
    : 1;

  return (
    <div style={s.root}>

      {/* ══ TOPO: Jogador + Fase + Timer ══════════════════════ */}
      <div style={s.topSection}>
        {/* Jogador atual */}
        <div style={s.currentPlayerRow}>
          <div style={{ ...s.playerAvatar, backgroundColor: currentPlayer.color, boxShadow: `0 0 16px ${currentPlayer.color}80` }}>
            {currentPlayer.name.charAt(0).toUpperCase()}
          </div>
          <div style={s.playerNameBlock}>
            <span style={s.playerNameBig}>{currentPlayer.name}</span>
            <span style={s.playerNameSub}>Sua vez de jogar</span>
          </div>
          <div style={s.goldBadge}>
            <span style={s.goldNum}>{currentPlayer.gold}</span>
            <span style={s.goldIcon}>🪙</span>
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={s.quickStats}>
          {[
            { icon: '🗺', val: currentPlayer.territoryCount, lbl: 'Territórios' },
            { icon: '⚔', val: currentPlayer.totalTroops,    lbl: 'Tropas' },
            { icon: '🃏', val: currentPlayer.hand.length,    lbl: 'Cartas' },
          ].map(({ icon, val, lbl }) => (
            <div key={lbl} style={s.qStat}>
              <span style={s.qStatIcon}>{icon}</span>
              <span style={s.qStatVal}>{val}</span>
              <span style={s.qStatLbl}>{lbl}</span>
            </div>
          ))}

          {/* Fortaleza */}
          {(() => {
            const fort = Object.values(state.territories).find(t => t.hasFortress && t.ownerId === currentPlayer.id);
            if (!fort) return null;
            return (
              <div style={s.qStat}>
                <span style={s.qStatIcon}>🏰</span>
                <span style={{ ...s.qStatVal, color: fort.fortressIntegrity > 50 ? '#2dc653' : fort.fortressIntegrity > 25 ? '#f4a261' : '#e63946' }}>
                  {fort.fortressIntegrity}%
                </span>
                <span style={s.qStatLbl}>Fortaleza</span>
              </div>
            );
          })()}
        </div>

        {/* Fase + Timer */}
        <div style={s.phaseRow}>
          <div style={{ ...s.phaseBadge, borderColor: phaseMeta.color + '60', background: phaseMeta.color + '15' }}>
            <span style={{ fontSize: '18px' }}>{phaseMeta.icon}</span>
            <span style={{ ...s.phaseLabel, color: phaseMeta.color }}>{phaseMeta.label}</span>
            {phase === GamePhase.Distribution && state.turn.troopsToDistribute > 0 && (
              <span style={s.troopsAvail}>
                {state.turn.troopsToDistribute} tropas
              </span>
            )}
          </div>

          <div style={s.timerBlock}>
            <span style={{ ...s.timerNum, color: isUrgent ? '#e63946' : '#f0e6c8' }}>
              {String(timer).padStart(2, '0')}
            </span>
            <span style={s.timerSec}>seg</span>
          </div>
        </div>

        {/* Barra do timer */}
        <div style={s.timerBarBg}>
          <div style={{
            ...s.timerBarFill,
            width: `${timerPct}%`,
            background: isUrgent ? '#e63946' : phaseMeta.color,
          }} />
        </div>

        {/* Botão avançar fase */}
        <button style={s.advanceBtn} onClick={() => dispatch({ type: 'ADVANCE_PHASE' })}>
          <span>{phase === GamePhase.Reposition ? '✓ ENCERRAR TURNO' : `→ PRÓXIMA FASE`}</span>
          <span style={s.advanceSub}>Turno {state.turnNumber}</span>
        </button>
      </div>

      {/* ══ TABS ══════════════════════════════════════════════ */}
      <div style={s.tabs}>
        {([
          { key: 'action',  icon: phase === GamePhase.Distribution ? '⚙' : phase === GamePhase.Attack ? '⚔' : '↔', label: 'Ação'    },
          { key: 'upgrade', icon: '⬆', label: 'Upgrades' },
          { key: 'cards',   icon: '🃏', label: `Cartas (${currentPlayer.hand.length})` },
          { key: 'players', icon: '👥', label: 'Jogadores' },
        ] as { key: Tab; icon: string; label: string }[]).map(({ key, icon, label }) => (
          <button
            key={key}
            style={{ ...s.tab, ...(tab === key ? { ...s.tabActive, borderBottomColor: phaseMeta.color, color: phaseMeta.color } : {}) }}
            onClick={() => setTab(key)}
          >
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <span style={s.tabLabel}>{label}</span>
          </button>
        ))}
      </div>

      {/* ══ CONTEÚDO DAS TABS ══════════════════════════════════ */}
      <div style={s.tabContent}>

        {/* ── ABA: AÇÃO ────────────────────────────────────── */}
        {tab === 'action' && (
          <div style={s.section}>

            {/* FASE 1: Distribuição */}
            {phase === GamePhase.Distribution && (
              <>
                <div style={s.sectionHeader}>
                  <span style={s.sectionIcon}>⚙</span>
                  <div>
                    <p style={s.sectionTitle}>DISTRIBUIR TROPAS</p>
                    <p style={s.sectionSub}>
                      {state.turn.troopsToDistribute > 0
                        ? `${state.turn.troopsToDistribute} tropa(s) disponíveis`
                        : 'Todas distribuídas — avance a fase'}
                    </p>
                  </div>
                </div>

                {!selectedTerritoryId ? (
                  <div style={s.hintBox}>
                    <span style={s.hintIcon}>👆</span>
                    <span style={s.hintText}>Clique em um território seu no mapa para distribuir tropas</span>
                  </div>
                ) : (
                  <>
                    <div style={s.selectedTerritoryBox}>
                      <span style={s.selectedLabel}>Território selecionado</span>
                      <span style={s.selectedId}>T{selectedTerritoryId.replace('territorio-', '')}</span>
                      <span style={s.selectedTroops}>{territory ? countTroops(territory.troops) : 0} tropas presentes</span>
                    </div>

                    <p style={s.fieldLabel}>CLASSE DA TROPA</p>
                    <div style={s.clsGrid}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <button
                          key={cls}
                          style={{ ...s.clsBtn, ...(distributeClass === cls ? { ...s.clsBtnOn, borderColor: phaseMeta.color } : {}) }}
                          onClick={() => setDistributeClass(cls)}
                        >
                          <span style={{ fontSize: '24px' }}>{icon}</span>
                          <span style={s.clsBtnName}>{name}</span>
                          <span style={s.clsBtnStats}>
                            F:{BASE_STATS[cls].force} D:{BASE_STATS[cls].defense} V:{BASE_STATS[cls].speed}
                          </span>
                        </button>
                      ))}
                    </div>

                    <p style={s.fieldLabel}>QUANTIDADE</p>
                    <div style={s.qtyRow}>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.max(1, distributeQty - 1))}>−</button>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.max(1, distributeQty - 5))}>−5</button>
                      <span style={s.qNum}>{distributeQty}</span>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.min(state.turn.troopsToDistribute, distributeQty + 5))}>+5</button>
                      <button style={s.qBtn} onClick={() => setDistributeQty(Math.min(state.turn.troopsToDistribute, distributeQty + 1))}>+</button>
                      <button style={s.qAll} onClick={() => setDistributeQty(state.turn.troopsToDistribute)}>MAX</button>
                    </div>

                    <button
                      style={{ ...s.mainActionBtn, opacity: (state.turn.troopsToDistribute < distributeQty || state.turn.troopsToDistribute === 0) ? 0.4 : 1 }}
                      onClick={handleDistribute}
                      disabled={state.turn.troopsToDistribute < distributeQty || state.turn.troopsToDistribute === 0}
                    >
                      ⚙ Alocar {distributeQty}x {CLASS_LIST.find(c => c.cls === distributeClass)?.name}
                    </button>
                  </>
                )}
              </>
            )}

            {/* FASE 2: Ataque */}
            {phase === GamePhase.Attack && (
              <>
                <div style={s.sectionHeader}>
                  <span style={s.sectionIcon}>⚔</span>
                  <div>
                    <p style={s.sectionTitle}>FASE DE ATAQUE</p>
                    <p style={s.sectionSub}>Conquiste territórios inimigos</p>
                  </div>
                </div>

                {!selectedTerritoryId ? (
                  <div style={s.hintBox}>
                    <span style={s.hintIcon}>👆</span>
                    <span style={s.hintText}>Clique em um território seu com ≥2 tropas para iniciar o ataque</span>
                  </div>
                ) : (
                  <>
                    <div style={s.selectedTerritoryBox}>
                      <span style={s.selectedLabel}>Atacando a partir de</span>
                      <span style={s.selectedId}>T{selectedTerritoryId.replace('territorio-', '')}</span>
                      <span style={s.selectedTroops}>{territory ? countTroops(territory.troops) : 0} tropas</span>
                    </div>

                    <p style={s.fieldLabel}>CLASSE ATACANTE</p>
                    <div style={s.clsGrid}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <button
                          key={cls}
                          style={{ ...s.clsBtn, ...(attackingClass === cls ? { ...s.clsBtnOn, borderColor: '#e63946' } : {}) }}
                          onClick={() => onAttackingClassChange(cls)}
                        >
                          <span style={{ fontSize: '24px' }}>{icon}</span>
                          <span style={s.clsBtnName}>{name}</span>
                        </button>
                      ))}
                    </div>
                    <p style={{ ...s.hintText, fontSize: '11px', color: '#4a4030', margin: '4px 0' }}>
                      Sem seleção = usa a classe com mais tropas no território
                    </p>

                    {attackableIds.length > 0 ? (
                      <div style={s.infoBox}>
                        <span style={{ color: '#e63946', fontWeight: 700 }}>{attackableIds.length}</span>
                        <span style={s.infoBoxText}> território(s) disponíveis para ataque — clique no mapa</span>
                      </div>
                    ) : (
                      <div style={s.warnBox}>Nenhum território inimigo adjacente disponível</div>
                    )}
                  </>
                )}
              </>
            )}

            {/* FASE 3: Remanejamento — BUG FIX 4 */}
            {phase === GamePhase.Reposition && (
              <>
                <div style={s.sectionHeader}>
                  <span style={s.sectionIcon}>↔</span>
                  <div>
                    <p style={s.sectionTitle}>REMANEJAMENTO</p>
                    <p style={s.sectionSub}>Mova tropas entre territórios adjacentes</p>
                  </div>
                </div>

                {!selectedTerritoryId ? (
                  <div style={s.hintBox}>
                    <span style={s.hintIcon}>👆</span>
                    <span style={s.hintText}>Clique em um território seu para selecionar a origem</span>
                  </div>
                ) : (
                  <>
                    <div style={s.selectedTerritoryBox}>
                      <span style={s.selectedLabel}>Origem</span>
                      <span style={s.selectedId}>T{selectedTerritoryId.replace('territorio-', '')}</span>
                      <span style={s.selectedTroops}>{territory ? countTroops(territory.troops) : 0} tropas (mín. 1 fica)</span>
                    </div>

                    <p style={s.fieldLabel}>TROPAS A MOVER</p>
                    <div style={s.qtyRow}>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.max(1, repositionQty - 1))}>−</button>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.max(1, repositionQty - 5))}>−5</button>
                      <span style={s.qNum}>{repositionQty}</span>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.min(maxRepositionQty, repositionQty + 5))}>+5</button>
                      <button style={s.qBtn} onClick={() => onRepositionQtyChange(Math.min(maxRepositionQty, repositionQty + 1))}>+</button>
                      <button style={s.qAll} onClick={() => onRepositionQtyChange(maxRepositionQty)}>MAX</button>
                    </div>
                    <p style={{ ...s.hintText, fontSize: '11px', color: '#4a4030', margin: '4px 0' }}>
                      Máximo disponível: {maxRepositionQty} tropa(s)
                    </p>

                    {repositionableIds.length > 0 ? (
                      <div style={s.infoBox}>
                        <span style={{ color: '#4a9eff', fontWeight: 700 }}>{repositionableIds.length}</span>
                        <span style={s.infoBoxText}> destino(s) disponível — clique no mapa</span>
                      </div>
                    ) : (
                      <div style={s.warnBox}>Nenhum território adjacente seu disponível</div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Objetivo secreto — botão compacto no rodapé da aba */}
            <div style={s.objectiveCompact}>
              <button
                style={s.objRevealBtn}
                onMouseDown={() => setShowObjective(true)}
                onMouseUp={() => setShowObjective(false)}
                onMouseLeave={() => setShowObjective(false)}
                onTouchStart={() => setShowObjective(true)}
                onTouchEnd={() => setShowObjective(false)}
              >
                {showObjective ? '👁 Revelando...' : '🎯 Segurar para ver objetivo'}
              </button>
              {showObjective && (
                <div style={s.objBox}>
                  <p style={s.objText}>{currentPlayer.secretObjective.description}</p>
                  {currentPlayer.secretObjective.isFulfilled && (
                    <p style={s.objDone}>✦ CUMPRIDO!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA: UPGRADES ─────────────────────────────────── */}
        {tab === 'upgrade' && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>⬆</span>
              <div>
                <p style={s.sectionTitle}>MELHORIAS DE TROPAS</p>
                <p style={s.sectionSub}>Ouro disponível: {currentPlayer.gold}🪙</p>
              </div>
            </div>

            {CLASS_LIST.map(({ cls, icon, name }) => {
              const cur = currentPlayer.upgradeLevel[cls];
              const val = validateUpgrade(currentPlayer, cls);
              const base = BASE_STATS[cls];
              const bonus = UPGRADE_BONUS[cls][cur];

              return (
                <div key={cls} style={s.upgradeCard}>
                  <div style={s.upgradeHeader}>
                    <span style={{ fontSize: '28px' }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={s.upgradeName}>{name}</span>
                      <span style={{ ...s.upgradeLvl, color: UPGRADE_COLOR[cur] }}>
                        {UPGRADE_LEVEL_NAME[cur]}
                      </span>
                    </div>
                  </div>
                  <StatBar label="Força"      value={base.force   + bonus.force}   max={15} color="#e63946" />
                  <StatBar label="Defesa"     value={base.defense + bonus.defense} max={15} color="#4a9eff" />
                  <StatBar label="Velocidade" value={base.speed   + bonus.speed}   max={12} color="#2dc653" />
                  {val.nextLevel !== null ? (
                    <button
                      style={{ ...s.upgradeBtn, opacity: val.canBuy ? 1 : 0.45 }}
                      onClick={() => dispatch({ type: 'BUY_UPGRADE', payload: { troopClass: cls } })}
                      disabled={!val.canBuy}
                    >
                      {val.canBuy
                        ? `⬆ Evoluir para ${UPGRADE_LEVEL_NAME[val.nextLevel!]} — ${val.cost}🪙`
                        : `${val.cost}🪙 necessário (faltam ${val.cost - currentPlayer.gold}🪙)`}
                    </button>
                  ) : (
                    <p style={s.maxLbl}>✦ NÍVEL MÁXIMO ATINGIDO</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ABA: CARTAS ───────────────────────────────────── */}
        {tab === 'cards' && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>🃏</span>
              <div>
                <p style={s.sectionTitle}>CARTAS DE TERRITÓRIO</p>
                <p style={s.sectionSub}>
                  Próxima troca: {getCardTradeValue(state.turn.globalTradeCount)} tropas
                  {' '}(troca #{state.turn.globalTradeCount + 1})
                </p>
              </div>
            </div>

            <p style={s.fieldLabel}>SELECIONE 3 CARTAS (3 IGUAIS OU 3 DIFERENTES)</p>

            {currentPlayer.hand.length === 0 ? (
              <div style={s.hintBox}>
                <span style={s.hintIcon}>🃏</span>
                <span style={s.hintText}>Nenhuma carta na mão. Conquiste territórios para ganhar cartas no final do turno.</span>
              </div>
            ) : (
              <div style={s.cardsGrid}>
                {currentPlayer.hand.map(card => {
                  const sel = selectedCards.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      style={{
                        ...s.cardChip,
                        borderColor: sel ? '#c9a84c' : '#2a2a1a',
                        background: sel ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        boxShadow: sel ? '0 0 10px #c9a84c50' : 'none',
                      }}
                      onClick={() => toggleCard(card.id)}
                    >
                      <span style={{ fontSize: '28px', color: '#c9a84c' }}>{SYMBOL_ICON[card.symbol]}</span>
                      <span style={{ fontSize: '11px', color: sel ? '#c9a84c' : '#4a4030', fontWeight: 700 }}>
                        {card.territoryId ? `T${card.territoryId.replace('territorio-', '')}` : '★ Curinga'}
                      </span>
                      {sel && <span style={{ fontSize: '9px', color: '#c9a84c', letterSpacing: '0.1em' }}>✓ SELECIONADA</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              style={{ ...s.mainActionBtn, marginTop: '12px', opacity: canTrade ? 1 : 0.4 }}
              onClick={handleTrade}
              disabled={!canTrade}
            >
              🃏 Trocar {selectedCards.length}/3 cartas por tropas
            </button>
          </div>
        )}

        {/* ── ABA: JOGADORES ────────────────────────────────── */}
        {tab === 'players' && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>👥</span>
              <div>
                <p style={s.sectionTitle}>COMANDANTES</p>
                <p style={s.sectionSub}>{activePlayers.length} jogadores ativos</p>
              </div>
            </div>

            {activePlayers.map(player => {
              const isCurrent = player.id === currentPlayer.id;
              const isExpanded = expandedPlayer === player.id;
              const fortress = Object.values(state.territories).find(t => t.hasFortress && t.ownerId === player.id);

              return (
                <div
                  key={player.id}
                  style={{
                    ...s.playerCard,
                    borderColor: isCurrent ? player.color : '#2a2a1a',
                    background: isCurrent ? `${player.color}10` : 'rgba(255,255,255,0.02)',
                  }}
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                >
                  {isCurrent && <div style={{ ...s.currentIndicator, background: player.color }} />}

                  <div style={s.playerCardHeader}>
                    <div style={{ ...s.playerCardDot, backgroundColor: player.color, boxShadow: `0 0 8px ${player.color}80` }} />
                    <span style={{ ...s.playerCardName, color: isCurrent ? '#f0e6c8' : '#6a6050' }}>
                      {player.name}
                      {isCurrent && <span style={{ ...s.youBadge, borderColor: player.color, color: player.color }}> SUA VEZ</span>}
                    </span>
                  </div>

                  <div style={s.playerCardStats}>
                    {[
                      { icon: '🗺', val: player.territoryCount, lbl: 'Terr.' },
                      { icon: '⚔', val: player.totalTroops,    lbl: 'Tropas' },
                      { icon: '🪙', val: player.gold,           lbl: 'Ouro' },
                      { icon: '🃏', val: player.hand.length,    lbl: 'Cartas' },
                    ].map(({ icon, val, lbl }) => (
                      <div key={lbl} style={s.pStat}>
                        <span style={s.pStatIcon}>{icon}</span>
                        <span style={{ ...s.pStatVal, color: isCurrent ? player.color : '#4a4030' }}>{val}</span>
                        <span style={s.pStatLbl}>{lbl}</span>
                      </div>
                    ))}
                  </div>

                  {fortress && (
                    <div style={s.fortressRow}>
                      <span>🏰</span>
                      <div style={{ flex: 1, height: '6px', background: '#1a1a12', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${fortress.fortressIntegrity}%`,
                          height: '100%',
                          background: fortress.fortressIntegrity > 50 ? '#2dc653' : fortress.fortressIntegrity > 25 ? '#f4a261' : '#e63946',
                          borderRadius: '3px',
                          transition: 'width 0.4s',
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#5a5040', fontFamily: 'monospace', minWidth: '36px', textAlign: 'right' }}>
                        {fortress.fortressIntegrity}%
                      </span>
                    </div>
                  )}

                  {isExpanded && (
                    <div style={s.playerExpanded}>
                      {CLASS_LIST.map(({ cls, icon, name }) => (
                        <div key={cls} style={s.upgradeRowCompact}>
                          <span style={{ fontSize: '14px' }}>{icon}</span>
                          <span style={{ fontSize: '12px', color: '#6a6050', flex: 1 }}>{name}</span>
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
  root: { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Palatino Linotype",Palatino,serif', color: '#f0e6c8' },

  // Topo
  topSection: { flexShrink: 0, padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid #2a2a1a', paddingBottom: '12px' },
  currentPlayerRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  playerAvatar: { width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, color: '#0d0d0d', flexShrink: 0 },
  playerNameBlock: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  playerNameBig: { fontSize: '18px', fontWeight: 700, color: '#f0e6c8', letterSpacing: '0.04em', lineHeight: 1 },
  playerNameSub: { fontSize: '11px', color: '#5a5040', letterSpacing: '0.08em' },
  goldBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(201,168,76,0.1)', border: '1px solid #c9a84c30', borderRadius: '6px', padding: '6px 10px' },
  goldNum: { fontSize: '20px', fontWeight: 900, color: '#c9a84c', fontFamily: 'monospace', lineHeight: 1 },
  goldIcon: { fontSize: '12px', lineHeight: 1 },
  quickStats: { display: 'flex', gap: '8px' },
  qStat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '6px 4px', border: '1px solid #1e1e12' },
  qStatIcon: { fontSize: '14px', lineHeight: 1 },
  qStatVal: { fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#f0e6c8', lineHeight: 1 },
  qStatLbl: { fontSize: '9px', color: '#4a4030', letterSpacing: '0.08em' },
  phaseRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  phaseBadge: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', border: '1px solid' },
  phaseLabel: { fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em' },
  troopsAvail: { marginLeft: 'auto', fontSize: '12px', color: '#4a9eff', fontWeight: 700, fontFamily: 'monospace' },
  timerBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px 12px', minWidth: '56px', border: '1px solid #2a2a1a' },
  timerNum: { fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1, transition: 'color 0.3s' },
  timerSec: { fontSize: '9px', color: '#3a3020', letterSpacing: '0.15em' },
  timerBarBg: { height: '4px', background: '#1a1a12', borderRadius: '2px', overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: '2px', transition: 'width 0.9s linear, background 0.3s' },
  advanceBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '12px', background: 'rgba(201,168,76,0.08)', border: '1px solid #c9a84c30', borderRadius: '6px', color: '#c9a84c', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: '"Palatino Linotype",serif', width: '100%' },
  advanceSub: { fontSize: '10px', color: '#5a5040', letterSpacing: '0.15em' },

  // Tabs
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #2a2a1a', flexShrink: 0 },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '10px 4px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#3a3020', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { background: 'rgba(201,168,76,0.06)' },
  tabLabel: { fontSize: '10px', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' },

  // Content
  tabContent: { flex: 1, overflowY: 'auto' },
  section: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  sectionIcon: { fontSize: '28px', lineHeight: 1, marginTop: '2px' },
  sectionTitle: { fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', color: '#f0e6c8', margin: 0, textTransform: 'uppercase' },
  sectionSub: { fontSize: '11px', color: '#5a5040', margin: 0, marginTop: '2px' },

  // Hint / info boxes
  hintBox: { display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a1a', borderRadius: '6px', padding: '14px' },
  hintIcon: { fontSize: '20px', flexShrink: 0 },
  hintText: { fontSize: '13px', color: '#6a6050', lineHeight: 1.6 },
  infoBox: { padding: '10px 14px', background: 'rgba(74,158,255,0.06)', border: '1px solid #4a9eff30', borderRadius: '6px', fontSize: '13px', color: '#f0e6c8' },
  infoBoxText: { color: '#6a6050' },
  warnBox: { padding: '10px 14px', background: 'rgba(230,57,70,0.06)', border: '1px solid #e6394630', borderRadius: '6px', fontSize: '12px', color: '#e63946' },

  // Territory selected
  selectedTerritoryBox: { display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(201,168,76,0.06)', border: '1px solid #c9a84c30', borderRadius: '6px', padding: '12px 14px' },
  selectedLabel: { fontSize: '10px', color: '#5a5040', letterSpacing: '0.15em', textTransform: 'uppercase' },
  selectedId: { fontSize: '22px', fontWeight: 900, color: '#c9a84c', fontFamily: 'monospace', letterSpacing: '0.05em' },
  selectedTroops: { fontSize: '12px', color: '#6a6050' },

  // Field label
  fieldLabel: { fontSize: '10px', color: '#4a4030', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 },

  // Class selector
  clsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' },
  clsBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '10px 6px', background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a1a', borderRadius: '6px', cursor: 'pointer', color: '#4a4030', transition: 'all 0.15s' },
  clsBtnOn: { background: 'rgba(201,168,76,0.12)', color: '#f0e6c8' },
  clsBtnName: { fontSize: '11px', letterSpacing: '0.04em', fontWeight: 600 },
  clsBtnStats: { fontSize: '9px', color: '#3a3020', letterSpacing: '0.03em', fontFamily: 'monospace' },

  // Qty controls
  qtyRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  qBtn: { width: '36px', height: '36px', background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a1a', borderRadius: '6px', color: '#c9a84c', fontSize: '16px', cursor: 'pointer', fontWeight: 700 },
  qNum: { flex: 1, textAlign: 'center', fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#f0e6c8' },
  qAll: { padding: '6px 12px', background: 'rgba(201,168,76,0.08)', border: '1px solid #c9a84c30', borderRadius: '6px', color: '#c9a84c', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' },

  // Main action button
  mainActionBtn: { padding: '14px', background: 'linear-gradient(135deg,#c9a84c,#a07830)', border: 'none', borderRadius: '6px', color: '#0d0d0d', fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', fontFamily: '"Palatino Linotype",serif', width: '100%', transition: 'opacity 0.15s' },

  // Objective
  objectiveCompact: { borderTop: '1px solid #1e1e12', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  objRevealBtn: { padding: '12px', background: 'rgba(201,168,76,0.05)', border: '1px solid #c9a84c20', borderRadius: '6px', color: '#5a5040', fontSize: '13px', cursor: 'pointer', letterSpacing: '0.06em', userSelect: 'none', fontFamily: '"Palatino Linotype",serif', width: '100%' },
  objBox: { padding: '12px 14px', background: 'rgba(201,168,76,0.06)', border: '1px solid #c9a84c20', borderRadius: '6px' },
  objText: { fontSize: '13px', color: '#f0e6c8', lineHeight: 1.7, margin: 0 },
  objDone: { fontSize: '11px', color: '#2dc653', letterSpacing: '0.2em', marginTop: '8px', marginBottom: 0 },

  // Upgrades
  upgradeCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a1a', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  upgradeHeader: { display: 'flex', alignItems: 'center', gap: '10px' },
  upgradeName: { display: 'block', fontSize: '15px', fontWeight: 700, color: '#f0e6c8', letterSpacing: '0.04em' },
  upgradeLvl: { display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' },
  upgradeBtn: { padding: '10px', background: 'rgba(201,168,76,0.08)', border: '1px solid #c9a84c30', borderRadius: '6px', color: '#c9a84c', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', transition: 'opacity 0.15s', width: '100%' },
  maxLbl: { fontSize: '11px', color: '#c9a84c', letterSpacing: '0.2em', textAlign: 'center', margin: 0, padding: '6px 0' },

  // Cards
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' },
  cardChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 6px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' },

  // Players tab
  playerCard: { border: '1px solid', borderRadius: '8px', padding: '12px 14px', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s' },
  currentIndicator: { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40px', height: '3px', borderRadius: '0 0 3px 3px' },
  playerCardHeader: { display: 'flex', alignItems: 'center', gap: '10px' },
  playerCardDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  playerCardName: { fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em' },
  youBadge: { marginLeft: '8px', fontSize: '9px', border: '1px solid', borderRadius: '3px', padding: '1px 5px', letterSpacing: '0.1em' },
  playerCardStats: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  pStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, minWidth: '48px' },
  pStatIcon: { fontSize: '12px', lineHeight: 1 },
  pStatVal: { fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 },
  pStatLbl: { fontSize: '9px', color: '#4a4030', letterSpacing: '0.06em' },
  fortressRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  playerExpanded: { borderTop: '1px solid #2a2a1a', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' },
  upgradeRowCompact: { display: 'flex', alignItems: 'center', gap: '8px' },
};
