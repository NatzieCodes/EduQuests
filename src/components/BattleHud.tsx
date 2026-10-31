import React from 'react';
import {
  BATTLE_MODES,
  BattleCombatState,
  ClassmateMember,
  HEROES,
  HeroId,
  QuizDeck,
  QuizQuestion,
} from '../game/rules';
import { LogOut, Pause, RotateCcw, Shield, Volume2, VolumeX, CheckCircle2, XCircle } from 'lucide-react';

interface BattleHudProps {
  combat: BattleCombatState;
  heroId: HeroId;
  studentName: string;
  deck: QuizDeck;
  currentQuestion: QuizQuestion;
  questionIndex: number;
  timeRemainingSec: number;
  useShieldNext: boolean;
  onToggleShieldNext: () => void;
  lastFeedback: {
    isCorrect: boolean;
    damageDealt: number;
    counterDamage: number;
    explanation: string;
    selectedIndex: number;
    correctIndex: number;
    blockedByPlayer?: boolean;
  } | null;
  onAnswerQuestion: (optionIndex: number) => void;
  onNextQuestion: () => void;
  onTriggerChargedMove: (moveName: string) => void;
  onPause: () => void;
  onRestart: () => void;
  onExitToLobby: () => void;
  muted: boolean;
  onToggleMute: () => void;
  classmates: ClassmateMember[];
  liveToast: string | null;
}

export const BattleHud: React.FC<BattleHudProps> = ({
  combat,
  heroId,
  studentName,
  deck,
  currentQuestion,
  questionIndex,
  timeRemainingSec,
  useShieldNext,
  onToggleShieldNext,
  lastFeedback,
  onAnswerQuestion,
  onNextQuestion,
  onTriggerChargedMove,
  onPause,
  onRestart,
  onExitToLobby,
  muted,
  onToggleMute,
  classmates,
  liveToast,
}) => {
  const hero = HEROES.find((h) => h.id === heroId) ?? HEROES[0];
  const modeSpec = BATTLE_MODES[combat.mode];

  const playerHpPct = Math.max(0, Math.min(100, Math.round((combat.playerHp / combat.playerMaxHp) * 100)));
  const enemyHpPct = Math.max(0, Math.min(100, Math.round((combat.enemyHp / combat.enemyMaxHp) * 100)));

  const opponentLabel =
    combat.mode === 'pvp'
      ? modeSpec.enemyTrainer || 'Classmate Challenger'
      : combat.mode === 'team'
      ? 'Omega Block Squad'
      : combat.mode === 'raid'
      ? 'Raid Boss'
      : 'Training Dummy';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-5">
      {/* =====================================================================
          TOP POKÉMON GO HUD (No character names or CP numbers; PvP 2 Blocks)
         ===================================================================== */}
      <div className="w-full flex items-start justify-between gap-2">
        {/* TOP-LEFT: Student Status Card + Exit Button + PvP 2 Damage Blocks */}
        <div className="flex flex-col items-start gap-2">
          <div className="pointer-events-auto rounded-2xl bg-white/92 text-slate-900 px-3.5 py-2 shadow-xl border border-white min-w-[205px] sm:min-w-[240px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-bold text-sm sm:text-base text-slate-800 truncate">
                @{studentName}
              </span>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center">
                  {hero.elementA[0]}
                </span>
                <span className="inline-block w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {hero.elementB[0]}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-display font-bold text-slate-600 uppercase">
                {modeSpec.shortTitle}
              </span>

              {/* PvP / Team Orbs & 2 Damage Blocks */}
              {(combat.mode === 'pvp' || combat.mode === 'team') && (
                <div className="flex items-center gap-2.5">
                  {/* Party Pokéball Orbs */}
                  <div className="flex items-center gap-1" aria-label={`Player Orbs: ${combat.playerOrbs}`}>
                    {[0, 1, 2].map((idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border border-slate-900 ${
                          idx < combat.playerOrbs ? 'bg-red-500' : 'bg-slate-400 opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                  {/* 2 Damage Blocks in PvP / Team */}
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-100 border border-fuchsia-300"
                    aria-label={`Damage Blocks Remaining: ${combat.playerShields} of 2`}
                  >
                    {[0, 1].map((idx) => (
                      <Shield
                        key={idx}
                        className={`w-3.5 h-3.5 ${
                          idx < combat.playerShields
                            ? 'text-fuchsia-600 fill-fuchsia-500'
                            : 'text-slate-400 fill-slate-300 opacity-45'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] font-mono-num font-black text-fuchsia-800">
                      {combat.playerShields}/2 BLOCKS
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pokémon GO style circular Exit / Run button + PvP Block Toggle */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onExitToLobby();
              }}
              aria-label="Exit Battle to Main Menu"
              className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 border-2 border-slate-300 shadow-lg flex items-center justify-center transition-transform active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* 2 Damage Blocks toggle in PvP / Team modes */}
            {(combat.mode === 'pvp' || combat.mode === 'team') && (
              <button
                type="button"
                data-testid="pvp-block-btn"
                disabled={combat.playerShields <= 0}
                onClick={onToggleShieldNext}
                className={`px-3.5 py-1.5 rounded-full text-xs font-display font-black border-2 shadow-lg flex items-center gap-1.5 transition-all ${
                  combat.playerShields <= 0
                    ? 'bg-slate-900/60 border-white/10 text-slate-500 cursor-not-allowed'
                    : useShieldNext
                    ? 'bg-fuchsia-600 border-white text-white shadow-[0_0_16px_rgba(217,70,239,0.85)]'
                    : 'bg-slate-950/90 border-fuchsia-400/70 text-fuchsia-200 hover:bg-fuchsia-950/80'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>
                  {combat.playerShields <= 0
                    ? '0/2 BLOCKS LEFT'
                    : useShieldNext
                    ? `BLOCK ARMED (${combat.playerShields}/2)`
                    : `USE BLOCK (${combat.playerShields}/2 LEFT)`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* TOP-CENTER: Pokémon GO Raid Circular Orange Countdown Timer */}
        <div className="flex flex-col items-center">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500 border-4 border-white shadow-2xl flex flex-col items-center justify-center text-white"
            aria-label="Battle Timer"
          >
            <span className="font-display font-black text-2xl sm:text-3xl leading-none font-mono-num">
              {combat.mode === 'training' ? '∞' : Math.max(0, Math.ceil(timeRemainingSec))}
            </span>
            <span className="text-[9px] font-bold tracking-wider uppercase opacity-90">
              {combat.mode === 'training' ? 'PRACTICE' : 'SEC'}
            </span>
          </div>

          {/* Team Fight Score Bar (Alpha Block vs Omega Block) */}
          {combat.mode === 'team' && (
            <div className="mt-1.5 px-3 py-1 rounded-lg bg-slate-950/85 border border-white/15 text-xs font-mono-num flex items-center gap-3">
              <span className="text-yellow-300 font-bold">ALPHA {combat.teamAlphaScore}</span>
              <span className="text-slate-500">vs</span>
              <span className="text-rose-400 font-bold">{combat.teamOmegaScore} OMEGA</span>
            </div>
          )}

          {liveToast && (
            <div className="mt-1.5 px-3 py-1 rounded-lg bg-slate-950/90 border border-yellow-400/50 text-xs font-semibold text-yellow-200 shadow-lg">
              {liveToast}
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Classmate / Raid Boss Status Card + Compact Utility Controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto rounded-2xl bg-white/92 text-slate-900 px-3.5 py-2 shadow-xl border border-white min-w-[205px] sm:min-w-[240px] text-right">
            {combat.mode === 'raid' && (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700">Raid Scoreboard</span>
                  <span className="text-xs font-display font-black text-slate-900">{opponentLabel}</span>
                </div>
                <div className="text-[11px] flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-600">Boss Health</span>
                  <span className="font-mono-num font-black text-amber-700">{combat.enemyHp}/{combat.enemyMaxHp}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${enemyHpPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Correct Streak</span>
                  <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-amber-800 font-black">{combat.streak}x</span>
                </div>
              </>
            )}

            {combat.mode === 'team' && (
              <>
                <div className="text-[10px] font-mono font-bold uppercase text-amber-700 mb-2">Team Scoreboard</div>
                <div className="text-[11px] flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-600">Team Health</span>
                  <span className="font-mono-num font-black text-amber-700">{combat.playerHp}/{combat.playerMaxHp}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${playerHpPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-600">Correct Streak</span>
                  <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-amber-800 font-black">{combat.streak}x</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Alpha</span><span className="font-black">{combat.teamAlphaScore}</span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-slate-600">Omega</span><span className="font-black">{combat.teamOmegaScore}</span>
                </div>
              </>
            )}

            {combat.mode === 'pvp' && (
              <>
                <div className="text-[10px] font-mono font-bold uppercase text-amber-700 mb-2">1v1 Scoreboard</div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-600">Health</span>
                  <span className="font-mono-num font-black text-amber-700">{combat.playerHp}/{combat.playerMaxHp}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${playerHpPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-600">Correct Streak</span>
                  <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-amber-800 font-black">{combat.streak}x</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Blocks</span>
                  <span className="flex items-center gap-1">
                    {[0, 1].map((idx) => <Shield key={idx} className={`w-3.5 h-3.5 ${idx < combat.playerShields ? 'text-yellow-500 fill-yellow-400' : 'text-slate-300'}`} />)}
                  </span>
                </div>
              </>
            )}

            {combat.mode === 'training' && (
              <div className="text-xs font-display font-black text-slate-800">TRAINING · DUMMY</div>
            )}
          </div>

          {/* Top-Right Compact Utility Buttons: Mute [M], Pause [P], Restart [R] */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute [M]' : 'Mute [M]'}
              className="w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-yellow-400" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Restart Battle [R]"
              className="w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause Battle [P]"
              className="w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          FLOATING IN-WORLD HP BARS (Above Left Player & Right Enemy/Boss)
         ===================================================================== */}
      <div className="relative flex-1 w-full pointer-events-none">
        {/* Enemy / Classmate / Boss HP Bar (Upper Right-Center) */}
        <div className="absolute top-3 right-[12%] sm:right-[20%] w-48 sm:w-64">
          <div className="flex items-center justify-between text-xs font-mono-num font-bold text-white stroke-text-sm mb-1">
            <span>{opponentLabel} HP</span>
            <span>
              {combat.enemyHp} / {combat.enemyMaxHp}
            </span>
          </div>
          <div className="h-3.5 w-full rounded-sm bg-slate-900/90 border-2 border-white p-0.5 shadow-lg">
            <div
              className={`h-full transition-all duration-200 ${
                enemyHpPct > 50 ? 'bg-emerald-400' : enemyHpPct > 20 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${enemyHpPct}%` }}
            />
          </div>
        </div>

        {/* Player HP Bar (Mid-Left above the 3D Player Avatar) */}
        <div className="absolute bottom-6 left-[6%] sm:left-[12%] w-44 sm:w-56">
          <div className="flex items-center justify-between text-xs font-mono-num font-bold text-white stroke-text-sm mb-1">
            <span>@{studentName} HP</span>
            <span>
              {combat.playerHp} / {combat.playerMaxHp}
            </span>
          </div>
          <div className="h-3.5 w-full rounded-sm bg-slate-900/90 border-2 border-white p-0.5 shadow-lg">
            <div
              className={`h-full transition-all duration-200 ${
                playerHpPct > 50 ? 'bg-emerald-400' : playerHpPct > 20 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${playerHpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          BOTTOM DOCK: Blocks + White and Yellow Quiz Question
         ===================================================================== */}
      <div className="pointer-events-auto w-full max-w-4xl mx-auto flex flex-col gap-2">
        {(combat.mode === 'pvp' || combat.mode === 'team') && (
          <div className="flex items-center justify-center">
            <button
              type="button"
              disabled={combat.playerShields <= 0}
              onClick={onToggleShieldNext}
              className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all ${
                combat.playerShields <= 0
                  ? 'bg-white/70 border-slate-300 text-slate-400 cursor-not-allowed'
                  : useShieldNext
                  ? 'bg-yellow-400 border-yellow-500 text-slate-950 shadow-[0_0_16px_rgba(250,204,21,0.75)] scale-105'
                  : 'bg-white border-yellow-400 text-slate-800 hover:bg-yellow-50 shadow-lg'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-yellow-400 border border-yellow-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-950" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-display font-black tracking-wider uppercase leading-none">
                  {useShieldNext ? 'DAMAGE BLOCK ACTIVE' : 'BLOCK ATTACK'}
                </div>
                <div className="text-[10px] font-mono-num font-bold opacity-90 mt-0.5">
                  {combat.playerShields} / 2 BLOCKS AVAILABLE
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Bottom Quiz Card */}
        <div className="rounded-2xl bg-white border-2 border-yellow-400 p-3.5 sm:p-4 shadow-2xl">
          {/* Question Header Meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 mb-2">
            <div className="flex items-center gap-2 font-mono-num">
              <span className="font-bold text-slate-900">
                Q{questionIndex + 1} / {deck.questions.length}
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentQuestion.conceptTag}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300">{currentQuestion.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="text-yellow-300 truncate max-w-[180px]">{deck.title}</span>
            </div>
            <div className="font-mono-num text-xs">
              <span>Streak: </span>
              <span className="font-bold text-amber-600">{combat.streak}x</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>Total DMG: </span>
              <span className="font-bold text-slate-900">{combat.totalDamageDealt}</span>
            </div>
          </div>

          {/* Question Prompt */}
          <h2 className="text-sm sm:text-base font-display font-bold text-slate-950 leading-snug mb-3">
            {currentQuestion.question}
          </h2>

          {/* 4 Multiple-Choice Answer Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentQuestion.options.map((opt, idx) => {
              let btnStyle =
                'bg-white hover:bg-yellow-50 border-slate-200 text-slate-800 hover:border-yellow-400 shadow-sm';

              if (lastFeedback) {
                if (idx === lastFeedback.correctIndex) {
                  btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold';
                } else if (idx === lastFeedback.selectedIndex && !lastFeedback.isCorrect) {
                  btnStyle = 'bg-rose-100 border-rose-500 text-rose-900';
                } else {
                  btnStyle = 'bg-slate-50 border-slate-200 text-slate-400';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={Boolean(lastFeedback)}
                  onClick={() => onAnswerQuestion(idx)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-2.5 ${btnStyle}`}
                >
                  <span className="font-mono-num font-bold text-yellow-400 shrink-0">
                    [{idx + 1}]
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Instant Answer Feedback & Study Explanation Bar */}
          {lastFeedback && (
            <div className="mt-3 pt-2.5 border-t border-yellow-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs">
                {lastFeedback.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={`font-bold ${lastFeedback.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {lastFeedback.isCorrect
                      ? `Direct Hit! Dealt ${lastFeedback.damageDealt} DMG!`
                      : lastFeedback.blockedByPlayer
                      ? `Blocked! Your PvP Block negated all classmate damage (0 DMG taken)!`
                      : `Missed! Took ${lastFeedback.counterDamage} Counter DMG.`}
                  </span>{' '}
                  <span className="text-slate-600">{lastFeedback.explanation}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onNextQuestion}
                className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-extrabold text-xs whitespace-nowrap shrink-0"
              >
                Next Question [Enter]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
