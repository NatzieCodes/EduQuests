import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  FolderOpen,
  Layers,
  Lock,
  Swords,
  Users,
  X,
} from 'lucide-react';
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
import {
  getDeckFolderId,
  loadDeckFolders,
  loadStudyFolders,
  saveDeckFolders,
  StudyFolder,
} from '../services/studyFolders';
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
  const [studyTitle, setStudyTitle] = useState('');
  const [studyNotes, setStudyNotes] = useState('');
  const [studyQuestionCount, setStudyQuestionCount] = useState(10);
  const [studyDifficulty, setStudyDifficulty] = useState<QuizDifficulty>('Standard');
  const [studyQuestionTypes, setStudyQuestionTypes] = useState<QuizQuestionType[]>([...QUIZ_QUESTION_TYPES]);
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterialSelection | null>(null);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [generatingStudyDeck, setGeneratingStudyDeck] = useState(false);
  const [folders, setFolders] = useState<StudyFolder[]>(loadStudyFolders);
  const [deckFolders, setDeckFolders] = useState<Record<string, string>>(loadDeckFolders);
  const [openFolderId, setOpenFolderId] = useState<string>('all');
  const [targetFolderId, setTargetFolderId] = useState<string>('general');
  const mode = BATTLE_MODES[selectedMode];

  useEffect(() => {
    if (!isOpen) return;
    const loadedFolders = loadStudyFolders();
    setFolders(loadedFolders);
    setDeckFolders(loadDeckFolders());
    setTargetFolderId((current) =>
      loadedFolders.some((folder) => folder.id === current) ? current : (loadedFolders[0]?.id || 'general')
    );
  }, [isOpen]);

  useEffect(() => {
    if (selectedMode === 'training') {
      setMinutes('0');
    } else {
      setMinutes((current) => (!current || Number(current) <= 0 ? '3' : current));
    }
  }, [selectedMode]);

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
      const targetFolder = folders.some((folder) => folder.id === targetFolderId)
        ? targetFolderId
        : (openFolderId !== 'all' && folders.some((folder) => folder.id === openFolderId)
          ? openFolderId
          : (folders[0]?.id || 'general'));
      setDeckFolders((current) => {
        const next = { ...current, [deck.id]: targetFolder };
        saveDeckFolders(next);
        return next;
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="battle-setup-title">
      <div className="flex h-[min(86dvh,740px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)] overflow-hidden md:grid-cols-[1.15fr_0.85fr] md:grid-rows-1">
          <section className="flex min-h-0 flex-col overflow-y-auto border-b border-slate-200 bg-white p-4 sm:p-5 md:border-b-0 md:border-r">
            {(() => {
              const activeFolderId = getDeckFolderId(deckFolders, activeDeck.id, folders);
              const activeFolder = openFolderId !== 'all'
                ? folders.find((folder) => folder.id === openFolderId) || null
                : null;
              const visibleDecks = activeFolder
                ? decks.filter((deck) => getDeckFolderId(deckFolders, deck.id, folders) === activeFolder.id)
                : [];
              const openSlotsCount = Math.max(0, 6 - members.length);

              return (
                <div className="flex h-full min-h-0 flex-col">
                  {selectedMode !== 'training' && (
                    <div className="mb-4 shrink-0 border-b border-slate-200 pb-4">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">Battle Squad</div>
                          <div className="mt-0.5 text-base font-display font-black text-slate-900">Waiting Room</div>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-yellow-300">
                          <Users className="h-3.5 w-3.5" />
                          {members.length}/6
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {members.map((member) => {
                          const isLocal = member.id === localPlayerId || member.id === 'local-player';
                          return (
                            <div key={member.id} className={`rounded-2xl border p-2.5 ${isLocal ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-slate-50'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-xs font-display font-black text-slate-900">@{member.name}</div>
                                {member.isHost && <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-mono font-black text-slate-950">HOST</span>}
                              </div>
                              <div className="mt-0.5 truncate text-[10px] font-mono text-slate-500">
                                {member.blockSection || 'Room member'}
                              </div>
                            </div>
                          );
                        })}
                        {Array.from({ length: openSlotsCount }).map((_, index) => (
                          <div key={`open-slot-${index}`} className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[10px] font-mono text-slate-400">
                            <span>Open Slot {members.length + index + 1}</span>
                            <span>Ready</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-2.5 shrink-0">
                    <div className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-700">
                      {selectedMode === 'training' ? 'Inventory Folders' : 'Study PDF / Deck'}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <h3 className="flex min-w-0 items-center gap-1.5 text-base font-display font-black text-slate-900 sm:text-lg">
                        {isHost || selectedMode === 'training' ? (
                          activeFolder ? (
                            <button
                              type="button"
                              onClick={() => setOpenFolderId('all')}
                              aria-label="Back to folders"
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                          ) : (
                            <Layers className="h-4 w-4 shrink-0 text-amber-600" />
                          )
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                        )}
                        <span className="truncate">
                          {isHost || selectedMode === 'training'
                            ? (activeFolder ? activeFolder.name : `Folders (${folders.length})`)
                            : 'Active Study Deck'}
                        </span>
                      </h3>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-600">
                        {isHost || selectedMode === 'training'
                          ? (activeFolder ? `${visibleDecks.length} decks` : `${decks.length} decks`)
                          : `${activeDeck.questions.length} Q`}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs leading-relaxed text-slate-600">
                      {isHost || selectedMode === 'training'
                        ? `Active: ${activeDeck.title} (${activeDeck.questions.length} Q)`
                        : 'The host selects the study material for everyone.'}
                    </p>
                  </div>

                  {isHost || selectedMode === 'training' ? (
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      {!activeFolder ? (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {folders.map((folder) => {
                            const folderDecks = decks.filter(
                              (deck) => getDeckFolderId(deckFolders, deck.id, folders) === folder.id,
                            );
                            const hasActiveDeck = activeFolderId === folder.id;
                            return (
                              <button
                                key={folder.id}
                                type="button"
                                onClick={() => setOpenFolderId(folder.id)}
                                className={`group overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                                  hasActiveDeck
                                    ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div
                                  className="flex h-[78px] flex-col justify-between p-3"
                                  style={{ background: `linear-gradient(135deg, ${folder.color}, #ffffff)` }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <FolderOpen className="h-6 w-6 text-slate-900/75" />
                                    {hasActiveDeck && (
                                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-mono font-black text-yellow-300">
                                        ACTIVE
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-sm font-display font-black text-slate-900">
                                    {folder.name}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2">
                                  <span className="text-[10px] font-mono font-bold text-slate-500">
                                    {folderDecks.length} {folderDecks.length === 1 ? 'DECK' : 'DECKS'}
                                  </span>
                                  <span className="text-[10px] font-display font-black text-amber-700 group-hover:text-amber-800">
                                    Open →
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleDecks.map((deck) => {
                            const selected = deck.id === activeDeck.id;
                            return (
                              <button
                                key={deck.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => onSelectDeck(deck)}
                                className={`w-full rounded-2xl border p-3 text-left transition cursor-pointer ${
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
                          {!visibleDecks.length && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                              No decks in {activeFolder.name} yet. Add study material on the right to create one here.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-yellow-300">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-display font-black text-slate-900">{activeDeck.title}</div>
                          <div className="mt-0.5 truncate text-xs text-slate-600">{activeDeck.subject}</div>
                          <div className="mt-1.5 text-[11px] font-mono font-bold text-amber-800">
                            {activeDeck.questions.length} questions ready
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          <aside className="flex min-h-0 flex-col overflow-y-auto bg-slate-50/60">
            {isHost || selectedMode === 'training' ? (
              <>
                <div className="shrink-0 border-b border-slate-200 px-4 py-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
                    CREATE / ADD
                  </div>
                  <h3 className="mt-0.5 text-sm font-display font-black text-slate-900">
                    New Quiz Deck
                  </h3>
                </div>

                <div className="flex flex-1 min-h-0 flex-col gap-2.5 p-4">
                  <div className="shrink-0">
                    <label htmlFor="training-study-title" className="mb-1 block text-[10px] font-bold text-slate-700">Topic Title</label>
                    <input
                      id="training-study-title"
                      maxLength={120}
                      value={studyTitle}
                      onChange={(event) => { setStudyTitle(event.target.value); setStudyError(null); }}
                      placeholder="Study deck title"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="shrink-0">
                    <label htmlFor="battle-setup-folder" className="mb-1 block text-[10px] font-bold text-slate-700">Save to Folder</label>
                    <select
                      id="battle-setup-folder"
                      value={targetFolderId}
                      onChange={(event) => setTargetFolderId(event.target.value)}
                      className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                    >
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="shrink-0">
                    <label htmlFor="battle-setup-question-count" className="mb-1 block text-[10px] font-bold text-slate-700">Questions to generate</label>
                    <select
                      id="battle-setup-question-count"
                      value={studyQuestionCount}
                      onChange={(event) => setStudyQuestionCount(Number(event.target.value))}
                      className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                    >
                      {[5, 10, 20, 50, 70, 100].map((count) => <option key={count} value={count}>{count} Questions</option>)}
                    </select>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2">
                    <label className="block text-[10px] font-bold text-slate-700">
                      Difficulty
                      <select value={studyDifficulty} onChange={(event) => setStudyDifficulty(event.target.value as QuizDifficulty)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-[10px] font-bold text-slate-900 focus:border-amber-500 focus:outline-none">
                        <option value="Standard">Standard</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Boss Challenge">Boss Challenge</option>
                      </select>
                    </label>
                    <fieldset className="min-w-0">
                      <legend className="mb-1 text-[10px] font-bold text-slate-700">Question types</legend>
                      <div className="grid grid-cols-2 gap-x-1 gap-y-1">
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
                  </div>

                  <div className="flex flex-1 min-h-0 flex-col gap-1.5">
                    <label htmlFor="training-study-notes" className="block shrink-0 text-[10px] font-bold text-slate-700">Study material</label>
                    <div className="shrink-0">
                      <StudyMaterialPicker
                        value={studyMaterial}
                        onSelect={applyStudyMaterial}
                        disabled={generatingStudyDeck}
                      />
                    </div>
                    <textarea
                      id="training-study-notes"
                      value={studyNotes}
                      required={!studyMaterial?.sourceUrl && !studyMaterial?.video}
                      onChange={(event) => {
                        setStudyNotes(event.target.value);
                        if (studyMaterial?.sourceUrl || studyMaterial?.video) setStudyMaterial(null);
                        setStudyError(null);
                      }}
                      placeholder="Paste study text here, or attach a PDF, TXT, link, or video."
                      rows={3}
                      className="min-h-[76px] w-full flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[10px] leading-relaxed text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>

                  {studyError && (
                    <p role="alert" className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-600">
                      {studyError}
                    </p>
                  )}

                  <button type="button" disabled={!canGenerateStudyDeck || generatingStudyDeck} onClick={() => void handleCreateStudyDeck()} className="flex h-9 shrink-0 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-xs font-display font-black text-yellow-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
                    {generatingStudyDeck && <Clock className="h-3.5 w-3.5 animate-spin" />}
                    {generatingStudyDeck ? 'Generating with Gemini…' : 'Generate Study Deck'}
                  </button>

                  <div className="shrink-0 border-t border-slate-200 pt-2">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Battle Duration</span>
                    </div>
                    {selectedMode === 'training' ? (
                      <div className="flex h-9 items-center rounded-lg border border-yellow-300 bg-white px-3 text-xs font-display font-black text-slate-900">
                        UNTIMED TRAINING
                      </div>
                    ) : (
                      <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-amber-500">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={minutes}
                          onChange={(event) => setMinutes(event.target.value)}
                          className="h-9 w-full min-w-0 bg-transparent text-xs font-display font-black text-slate-900 outline-none"
                          aria-label="Battle duration in minutes"
                        />
                        <span className="whitespace-nowrap text-[9px] font-mono font-bold text-slate-500">MINUTES</span>
                      </div>
                    )}
                  </div>

                  {!activeDeck.questions.length && (
                    <p className="shrink-0 text-[10px] font-bold text-rose-600">Choose a quiz deck with questions before starting.</p>
                  )}

                  <button type="button" disabled={!activeDeck.questions.length} onClick={() => onStartBattle(durationSec, activeDeck.questions.length)} className="flex h-11 shrink-0 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-xs font-display font-black text-slate-950 shadow-md transition hover:from-yellow-200 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                    <Swords className="h-4 w-4" /> {selectedMode === 'training' ? 'START SOLO TRAINING' : 'START BATTLE'}
                  </button>
                </div>
              </>
            ) : (
              <div className="m-4 flex flex-1 min-h-[260px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-yellow-300">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-display font-black text-slate-900">Waiting for the host</div>
                <div className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">
                  The host will choose the PDF and duration before starting.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
