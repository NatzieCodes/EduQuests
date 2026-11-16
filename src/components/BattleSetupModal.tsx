import React, { useEffect, useMemo, useState } from 'react';
import { Clock, FileText, Lock, Users, X, Swords, BookOpen, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  ClassmateMember,
  GameMode,
  QuizDeck,
  BATTLE_MODES,
  QuizDifficulty,
  QuizQuestionType,
  QUIZ_QUESTION_TYPES,
} from '../game/rules';
import { generateQuizDeck, StudyMaterialSelection } from '../services/quizGenerator';
import { StudyMaterialPicker } from './StudyMaterialPicker';

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
  const [studyQuestionCount, setStudyQuestionCount] = useState(10);
  const [studyDifficulty, setStudyDifficulty] = useState<QuizDifficulty>('Standard');
  const [studyQuestionTypes, setStudyQuestionTypes] = useState<QuizQuestionType[]>([...QUIZ_QUESTION_TYPES]);
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterialSelection | null>(null);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [generatingStudyDeck, setGeneratingStudyDeck] = useState(false);
  const [studyDeckPickerOpen, setStudyDeckPickerOpen] = useState(false);
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
  const availableQuestionCounts = [...new Set(
    [5, 10, 20, 50, 70, 100, activeDeck.questions.length]
      .filter((count) => count > 0 && count <= activeDeck.questions.length)
  )].sort((a, b) => a - b);
  const canGenerateStudyDeck = Boolean(
    onCreateStudyDeck &&
    studyTitle.trim() &&
    studyQuestionTypes.length &&
    (studyNotes.trim().length >= 20 || studyMaterial?.sourceUrl || studyMaterial?.video)
  );

  const applyStudyMaterial = (material: StudyMaterialSelection) => {
    setStudyMaterial(material);
    setStudyTitle(material.name.replace(/\.[^.]+$/, '').slice(0, 120));
    setStudyNotes(material.notes || '');
    setStudyError(null);
  };

  const handleCreateStudyDeck = async () => {
    if (!canGenerateStudyDeck || !onCreateStudyDeck) return;
    setGeneratingStudyDeck(true);
    setStudyError(null);
    try {
      const deck = await generateQuizDeck({
        title: studyTitle.trim(),
        subject: `${mode.shortTitle} Battle Notes`,
        notes: studyNotes.trim(),
        questionCount: studyQuestionCount,
        difficulty: studyDifficulty,
        questionTypes: studyQuestionTypes,
        gameMode: selectedMode,
        sourceUrl: studyMaterial?.sourceUrl,
        sourceType: studyMaterial?.kind === 'url' ? 'url' : studyMaterial?.kind === 'video' ? 'video' : undefined,
        video: studyMaterial?.video,
      });
      onCreateStudyDeck(deck);
      setStudyError(deck.questions.length < studyQuestionCount
        ? `Gemini found ${deck.questions.length} distinct questions in this material.`
        : null);
    } catch (error) {
      setStudyError(error instanceof Error ? error.message : 'Gemini quiz generation failed.');
    } finally {
      setGeneratingStudyDeck(false);
    }
  };

  if (!isOpen) return null;

  const durationSec = selectedMode === 'training' ? 0 : Math.max(60, (Number(minutes) || 1) * 60);

  return (
    <div className={`fixed inset-0 z-[80] flex bg-slate-950/75 backdrop-blur-sm ${
      selectedMode === 'training'
        ? 'items-stretch justify-start p-0'
        : 'items-center justify-center p-3 sm:p-4'
    }`} role="dialog" aria-modal="true" aria-labelledby="battle-setup-title">
      <div className={`flex w-full flex-col overflow-hidden bg-white text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
        selectedMode === 'training'
          ? 'h-dvh max-w-none rounded-none'
          : 'h-[min(640px,92dvh)] max-w-5xl rounded-3xl'
      }`}>
        <header className="flex shrink-0 items-center justify-between bg-[oklch(0.21_0.04_265.75/_1)] px-4 py-3.5 text-white sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950">
              {selectedMode === 'training' ? <BookOpen className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-yellow-300">
                {selectedMode === 'training' ? 'SOLO TRAINING' : `Room #${roomCode || 'Battle Lobby'}`}
              </div>
              <h2 id="battle-setup-title" className="text-lg font-display font-black">{mode.title} Setup</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close battle setup" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden ${
          selectedMode === 'training'
            ? 'grid-rows-[minmax(190px,0.65fr)_minmax(0,1.35fr)] md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] md:grid-rows-1'
            : 'grid-rows-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:grid-cols-[1.15fr_0.85fr] md:grid-rows-1'
        }`}>
          <section className={`min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-4 sm:p-5 md:border-b-0 md:border-r ${selectedMode === 'training' ? '' : 'flex flex-col'}`}>
            {selectedMode === 'training' ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-3 shrink-0">
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">Training inventory</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-display font-black text-slate-900">Your Quiz Decks</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-600">{decks.length}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Select a saved deck or add study material in the setup panel.
                  </p>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {decks.map((deck) => {
                    const selected = deck.id === activeDeck.id;
                    return (
                      <button
                        key={deck.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelectDeck(deck)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          selected
                            ? 'border-amber-400 bg-amber-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-slate-900 text-yellow-300' : 'bg-slate-100 text-amber-700'}`}>
                            <FileText className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-display font-black text-slate-900">{deck.title}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-slate-500">{deck.subject}</span>
                            <span className="mt-1 block text-[10px] font-mono font-bold text-amber-800">{deck.questions.length} questions</span>
                          </span>
                          {selected && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                        </div>
                      </button>
                    );
                  })}
                  {!decks.length && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No saved decks yet. Add study material on the right to create one.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                <div className="relative mt-auto pt-4">
                  <button
                    type="button"
                    aria-expanded={studyDeckPickerOpen}
                    disabled={!isHost}
                    onClick={() => setStudyDeckPickerOpen((open) => !open)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-amber-700" />
                      <span className="min-w-0">
                        <span className="block text-[9px] font-mono font-black uppercase tracking-wide text-amber-800">Study PDF / Deck</span>
                        <span className="block truncate text-xs font-bold text-slate-900">{activeDeck.title}</span>
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-amber-800 transition-transform ${studyDeckPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {studyDeckPickerOpen && isHost && (
                    <div className="absolute bottom-full z-20 mb-2 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {decks.map((deck) => (
                        <button
                          key={deck.id}
                          type="button"
                          aria-pressed={deck.id === activeDeck.id}
                          onClick={() => {
                            onSelectDeck(deck);
                            setStudyDeckPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${deck.id === activeDeck.id ? 'bg-amber-100 font-black text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span className="truncate">{deck.title}</span>
                          <span className="shrink-0 text-[9px] font-mono text-slate-500">{deck.questions.length} Q</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!isHost && <p className="mt-1 text-[9px] text-slate-500">The host selects study material for everyone.</p>}
                </div>
              </>
            )}
          </section>

          <aside className="min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-5">
            {isHost || selectedMode === 'training' ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label htmlFor="training-study-notes" className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">Study material</label>
                    <StudyMaterialPicker
                      value={studyMaterial}
                      onSelect={applyStudyMaterial}
                      disabled={generatingStudyDeck}
                    />
                  </div>
                  <label htmlFor="training-study-title" className="sr-only">Study title</label>
                  <input id="training-study-title" maxLength={120} value={studyTitle} onChange={(event) => { setStudyTitle(event.target.value); setStudyError(null); }} placeholder="Study title" className="mb-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-amber-400" />
                  <textarea
                    id="training-study-notes"
                    value={studyNotes}
                    required={!studyMaterial?.sourceUrl && !studyMaterial?.video}
                    onChange={(event) => {
                      setStudyNotes(event.target.value);
                      if (studyMaterial?.sourceUrl || studyMaterial?.video) setStudyMaterial(null);
                      setStudyError(null);
                    }}
                    placeholder="Paste study text or attach a PDF, TXT, link, or video."
                    rows={3}
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-amber-400"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-[9px] font-bold text-slate-700">
                      Questions to generate
                      <select value={studyQuestionCount} onChange={(event) => setStudyQuestionCount(Number(event.target.value))} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold outline-none focus:border-amber-400">
                        {[5, 10, 20, 50, 70, 100].map((count) => <option key={count} value={count}>{count}</option>)}
                      </select>
                    </label>
                    <label className="text-[9px] font-bold text-slate-700">
                      Difficulty
                      <select value={studyDifficulty} onChange={(event) => setStudyDifficulty(event.target.value as QuizDifficulty)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold outline-none focus:border-amber-400">
                        <option value="Standard">Standard</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Boss Challenge">Boss Challenge</option>
                      </select>
                    </label>
                  </div>
                  <fieldset className="mt-2">
                    <legend className="mb-1 text-[9px] font-bold text-slate-700">Question types</legend>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {QUIZ_QUESTION_TYPES.map((type) => (
                        <label key={type} className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={studyQuestionTypes.includes(type)}
                            onChange={(event) => setStudyQuestionTypes((current) =>
                              event.target.checked
                                ? [...current, type]
                                : current.filter((selected) => selected !== type)
                            )}
                            className="accent-amber-500"
                          />
                          {type === 'multiple_choice' ? 'Multiple choice' : type === 'true_false' ? 'True / False' : type === 'fill_in_blank' ? 'Fill blank' : 'Identify'}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {studyError && <p role="alert" className="mt-1 text-[10px] font-bold text-rose-600">{studyError}</p>}
                  <button type="button" disabled={!canGenerateStudyDeck || generatingStudyDeck} onClick={() => void handleCreateStudyDeck()} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-xs font-display font-black text-yellow-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                    {generatingStudyDeck && <Clock className="h-3.5 w-3.5 animate-spin" />}
                    {generatingStudyDeck ? 'Generating with Gemini…' : 'Generate Study Deck'}
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
                  <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} disabled={!availableQuestionCounts.length} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                    {availableQuestionCounts.map((count) => <option key={count} value={count}>{count} Questions</option>)}
                  </select>
                  {!availableQuestionCounts.length && <p className="mt-1 text-[10px] font-bold text-rose-600">Choose a quiz deck with questions before starting.</p>}
                </div>
                <button type="button" disabled={!availableQuestionCounts.length || questionCount <= 0 || questionCount > activeDeck.questions.length} onClick={() => onStartBattle(durationSec, questionCount)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-sm font-display font-black text-slate-950 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
                  <Swords className="h-4 w-4" /> {selectedMode === 'training' ? 'START SOLO TRAINING' : 'START BATTLE'}
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
