import React from 'react';
import { BATTLE_MODES, BattleCombatState, GameShellState } from '../game/rules';
import { Trophy, RotateCcw, Home, Play, ShieldAlert } from 'lucide-react';

interface StatusModalProps {
  shellState: GameShellState;
  Snapshot: {
    mode: BattleCombatState['mode'];
    score: number;
    bestScore: number;
    accuracyPct: number;
    clearTimeSec: number;
    totalDamage: number;
    bossHpRemaining: number;
    victory: boolean;
  } | null;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  shellState,
  Snapshot,
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  if (shellState !== 'paused' && shellState !== 'gameover') return null;

  if (shellState === 'paused') {
    return (
      <div
        className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
      >
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/20 p-6 shadow-2xl text-center">
          <h2 id="pause-modal-title" className="text-2xl font-display font-black text-white">
            BATTLE PAUSED
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Take a breather or review your study notes before resuming the arena match.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-black text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Resume Battle [Esc]</span>
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Battle</span>
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-200 font-display font-bold text-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!Snapshot) return null;
  const modeSpec = BATTLE_MODES[Snapshot.mode];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/20 p-6 shadow-2xl text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-800 border border-white/15 flex items-center justify-center mb-3">
          {Snapshot.victory ? (
            <Trophy className="w-8 h-8 text-amber-400" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          )}
        </div>

        <h2
          id="gameover-modal-title"
          className={`text-3xl font-display font-black ${
            Snapshot.victory ? 'text-amber-300' : 'text-rose-400'
          }`}
        >
          {Snapshot.victory ? 'VICTORY — ARENA CLEARED!' : 'BATTLE FINISHED'}
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          {modeSpec.title} · {modeSpec.subtitle}
        </p>

        {/* 3 Tabular-Nums Mastery / Progress Stat Tiles */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase">QUIZ ACCURACY</div>
            <div className="text-xl font-display font-black text-yellow-400 font-mono-num mt-0.5">
              {Snapshot.accuracyPct}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase">DAMAGE DEALT</div>
            <div className="text-xl font-display font-black text-amber-300 font-mono-num mt-0.5">
              {Snapshot.totalDamage}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              {Snapshot.victory ? 'CLEAR TIME' : 'BOSS HP LEFT'}
            </div>
            <div className="text-xl font-display font-black text-amber-300 font-mono-num mt-0.5">
              {Snapshot.victory ? `${Snapshot.clearTimeSec}s` : Snapshot.bossHpRemaining}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 py-3 px-5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-black text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{Snapshot.victory ? 'Play Again' : 'Try Again'}</span>
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
