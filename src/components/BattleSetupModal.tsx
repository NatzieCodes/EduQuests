import React, { useEffect, useMemo, useState } from 'react';
import { Clock, FileText, Lock, Users, X, Swords } from 'lucide-react';
import { ClassmateMember, GameMode, QuizDeck, BATTLE_MODES, parseNotesIntoFallbackQuestions } from '../game/rules';
import { Upload } from 'lucide-react';

interface BattleSetupModalProps {
  isOpen: boolean;
  selectedMode: GameMode;
  roomCode: string;
  isHost: boolean;
  localPlayerId: string;
  classmates: ClassmateMember[];
  decks: QuizDeck[];
  activeDeck: QuizDeck;
  onSelectDeck: (deck: QuizDeck) => void;
  onCreateStudyDeck?: (deck: QuizDeck) => void;
  onStartBattle: (durationSec: number, questionCount: number) => void;
  onClose: () => void;
}

export const BattleSetupModal: React.FC<BattleSetupModalProps> = ({
  isOpen,
  selectedMode,
  roomCode,
  isHost,
  localPlayerId,
  classmates,
  decks,
  activeDeck,
  onSelectDeck,
  onCreateStudyDeck,
  onStartBattle,
  onClose,
}) => {
  const [minutes, setMinutes] = useState('3');
  const [questionCount, setQuestionCount] = useState(Math.min(10, activeDeck.questions.length));
  const [studyTitle, setStudyTitle] = useState('');
  const [studyNotes, setStudyNotes] = useState('');
  const mode = BATTLE_MODES[selectedMode];

  useEffect(() => {
    if (selectedMode === 'training') setMinutes('0');
    setQuestionCount(Math.min(10, activeDeck.questions.length));
  }, [selectedMode, activeDeck.id, activeDeck.questions.length]);

  const members = useMemo(
    () => classmates.length ? classmates : [{
      id: localPlayerId,
      name: 'You',
      blockSection: '',
      heroId: 'shadow_shinobi',
      cp: 0,
      team: 'alpha' as const,
      score: 0,
      damageDealt: 0,
      isReady: true,
      isHost,
    } as ClassmateMember],
    [classmates, localPlayerId, isHost]
  );

  if (!isOpen) return null;

  const durationSec = selectedMode === 'training' ? 0 : Math.max(60, (Number(minutes) || 1) * 60);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-[min(680px,92vh)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <header className="flex items-center justify-between bg-[oklch(0.21_0.04_265.75/_1)] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950">
              <Swords className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-yellow-300">
                Room #{roomCode || 'Battle Lobby'}
              </div>
              <h2 className="text-lg font-display font-black">{mode.title} Setup</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close battle setup" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
          <section className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-5 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">Battle Squad</div>
                <div className="mt-0.5 text-sm font-display font-black">Waiting Room</div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-yellow-300">
                <Users className="h-3.5 w-3.5" />
                {members.length}/6
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => {
                const isLocal = member.id === localPlayerId || member.id === 'local-player';
                return (
                  <div key={member.id} className={`rounded-2xl border p-3 ${isLocal ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-display font-black">@{member.name}</div>
                      {member.isHost && <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-mono font-black text-slate-950">HOST</span>}
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-slate-500">{member.blockSection || 'Room member'}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto bg-slate-50 p-5">
            {isHost ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">Study PDF / Deck</label>
                  <select value={activeDeck.id} onChange={(event) => {
                    const deck = decks.find((item) => item.id === event.target.value);
                    if (deck) onSelectDeck(deck);
                  }} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 cursor-pointer">
                    {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}
                  </select>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">Paste PDF / Notes Text</label>
                    <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700">
                      <Upload className="h-3.5 w-3.5" />
                      Upload Text
                      <input type="file" accept=".txt,.md,.pdf,.json" className="hidden" onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setStudyTitle(file.name.replace(/\.[^.]+$/, ''));
                        setStudyNotes((await file.text()).slice(0, 15000));
                      }} />
                    </label>
                  </div>
                  <input value={studyTitle} onChange={(event) => setStudyTitle(event.target.value)} placeholder="Study title" className="mb-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-amber-400" />
                  <textarea value={studyNotes} onChange={(event) => setStudyNotes(event.target.value)} placeholder="Paste lecture notes or extracted PDF text here..." rows={5} className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-amber-400" />
                  <button type="button" disabled={!studyTitle.trim() || studyNotes.trim().length < 20} onClick={() => {
                    const cleanNotes = studyNotes.trim();
                    const deck: QuizDeck = {
                      id: `deck-battle-${Date.now()}`,
                      title: studyTitle.trim(),
                      subject: `${mode.shortTitle} Battle Notes`,
                      sourceSummary: cleanNotes.slice(0, 160),
                      createdAt: new Date().toISOString().slice(0, 10),
                      questions: parseNotesIntoFallbackQuestions(studyTitle.trim(), cleanNotes, 100),
                    };
                    onCreateStudyDeck?.(deck);
                  }} className="mt-2 h-9 w-full rounded-lg bg-slate-900 text-xs font-display font-black text-yellow-300 disabled:opacity-40 cursor-pointer">
                    Use Study Material
                  </button>
                </div>
                {selectedMode !== 'training' && (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">
                      <Clock className="h-3.5 w-3.5 text-yellow-400" /> Battle Duration
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-amber-400">
                      <input type="number" min="1" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="h-11 w-full bg-transparent text-sm font-display font-black outline-none" />
                      <span className="text-[10px] font-mono font-bold text-slate-500">MINUTES</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">
                    <FileText className="h-3.5 w-3.5 text-yellow-400" /> Number of Questions
                  </label>
                  <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 cursor-pointer">
                    {[5, 10, 20, 50, 70, 100].filter((count) => count <= activeDeck.questions.length).map((count) => <option key={count} value={count}>{count} Questions</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => onStartBattle(durationSec, questionCount)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-sm font-display font-black text-slate-950 shadow-[0_8px_24px_rgba(245,158,11,0.35)] cursor-pointer">
                  <Swords className="h-4 w-4" /> START BATTLE
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-yellow-300">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-display font-black">Waiting for the host</div>
                <div className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">
                  The host will choose the PDF, duration, and question count before starting.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
