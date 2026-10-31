import React, { useState } from 'react';
import {
  ClassmateMember,
  GameMode,
  QuizDeck,
  SAMPLE_STUDY_NOTES,
  parseNotesIntoFallbackQuestions,
} from '../game/rules';
import {
  Sparkles,
  Upload,
  X,
  FolderOpen,
  FileText,
  Check,
  Layers,
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  startBattleAfter?: boolean;
  selectedMode: GameMode;
  roomCode: string;
  hasRoomOrInvite: boolean;
  classmates: ClassmateMember[];
  decks: QuizDeck[];
  activeDeck: QuizDeck;
  onSelectDeck: (deck: QuizDeck) => void;
  onCreateOrJoinRoom: (code: string) => void;
  onInviteClassmateUsername: (username: string) => void;
  onClose: () => void;
  onDeckCreated: (deck: QuizDeck, source: string, startBattleNow: boolean) => void;
  onUpdateDeck?: (deckId: string, title: string, notes: string) => void;
  onDeleteDeck?: (deckId: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  startBattleAfter = false,
  decks,
  activeDeck,
  onSelectDeck,
  onClose,
  onDeckCreated,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('BSCS-3A · Reviewer');
  const [notes, setNotes] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = (sampleKey: keyof typeof SAMPLE_STUDY_NOTES) => {
    const sample = SAMPLE_STUDY_NOTES[sampleKey];
    if (!sample) return;
    setTitle(sample.title);
    setSubject(sample.subject);
    setNotes(sample.notes);
    setErrorMsg(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setTitle(file.name.replace(/\.[^.]+$/, ''));
      setNotes(text.slice(0, 15000));
      setErrorMsg(null);
    } catch {
      setErrorMsg('Could not read file text. Please paste your PDF/lecture notes directly.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    const cleanSubject = subject.trim() || 'General Review';
    const cleanNotes = notes.trim();

    if (!cleanTitle) {
      setErrorMsg('Please enter a Topic Title for your PDF / study notes storage.');
      return;
    }
    if (!cleanNotes || cleanNotes.length < 20) {
      setErrorMsg(
        'Please input your PDF text or study notes (at least 20 characters) before generating battle questions.'
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          subject: cleanSubject,
          notes: cleanNotes,
          questionCount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.deck) {
          onDeckCreated(data.deck, data.source || 'gemini', startBattleAfter);
          setLoading(false);
          onClose();
          return;
        }
      }
    } catch {
      // Static hosting fallback below
    }

    const fallbackQuestions = parseNotesIntoFallbackQuestions(
      cleanTitle,
      cleanNotes,
      Number(questionCount) || 10
    );
    const localDeck: QuizDeck = {
      id: `deck-local-${Date.now()}`,
      title: cleanTitle,
      subject: cleanSubject,
      sourceSummary: cleanNotes.slice(0, 160) + (cleanNotes.length > 160 ? '...' : ''),
      createdAt: new Date().toISOString().slice(0, 10),
      questions: fallbackQuestions,
    };
    onDeckCreated(localDeck, 'local-notes-parser', startBattleAfter);
    setLoading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-modal-title"
    >
      <div className="w-full max-w-4xl rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.35)] max-h-[88vh] overflow-hidden flex flex-col">
        {/* LEVEL 0: Dark Slate Modal Header Explaining Window Purpose */}
        <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold text-yellow-300 uppercase tracking-wider">
                Study Material &amp; Quiz Deck Manager · {decks.length} Stored Decks
              </div>
              <h2 id="inventory-modal-title" className="text-lg sm:text-xl font-display font-black text-white leading-tight">
                Inventory · PDF Files &amp; Study Notes
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inventory Modal"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Inner Drawer Body with Numbered Hierarchical Sections */}
        <div className="p-5 sm:p-6 overflow-y-auto drawer-scroll space-y-6">
          {/* =================================================================
              SECTION 01: INPUT PDF / STUDY NOTES & AI QUIZ GENERATOR
             ================================================================= */}
          <section className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  SECTION 01 · CREATE NEW QUIZ DECK
                </div>
                <h3 className="text-sm font-display font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Upload PDF / Paste Study Notes</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Convert your lecture notes or syllabus into multiple-choice battle questions.
                </p>
              </div>

              {/* Tertiary Quick-Load Utilities */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadSample('operating_systems')}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Load OS Notes
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('organic_chemistry')}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Load Chem Notes
                </button>
                <label className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-display font-bold cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Upload File</span>
                  <input type="file" accept=".txt,.md,.pdf,.json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Topic Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Operating Systems Chapter 4"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Questions Count ({questionCount} Qs)
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={50}>50 Questions</option>
                    <option value={70}>70 Questions</option>
                    <option value={100}>100 Questions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PDF Text / Lecture Notes Content * (Min 20 characters)
                </label>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste your lecture notes, syllabus, or PDF paragraphs here..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500 font-mono text-xs leading-relaxed"
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {errorMsg}
                </p>
              )}

              {/* Primary CTA for Section 01 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-sm tracking-wide shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>
                  {loading
                    ? 'Generating Quiz Deck from Notes...'
                    : startBattleAfter
                    ? 'Save Deck & Launch Battle Now'
                    : 'Save to Inventory & Generate Quiz Deck'}
                </span>
              </button>
            </form>
          </section>

          {/* =================================================================
              SECTION 02: STORED STUDY DECKS LIBRARY
             ================================================================= */}
          <section className="space-y-3">
            <div className="flex items-end justify-between border-b border-slate-200 pb-2">
              <div>
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  SECTION 02 · SELECT ACTIVE BATTLE TOPIC
                </div>
                <h3 className="text-sm font-display font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Stored Study Decks ({decks.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Choose which study deck is used for questions during your next quiz battle.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-600">
                Active: <strong className="text-amber-700">{activeDeck.title}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto drawer-scroll pr-1">
              {decks.map((deck) => {
                const isActive = activeDeck.id === deck.id;
                return (
                  <div
                    key={deck.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isActive
                        ? 'bg-amber-50/60 border-amber-400 ring-2 ring-yellow-400/35'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {deck.questions.length} Questions · {deck.subject}
                        </div>
                        <h4 className="text-sm font-display font-black text-slate-900 mt-0.5">
                          {deck.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 font-mono">
                          {deck.sourceSummary || 'Custom study notes.'}
                        </p>
                      </div>

                      {isActive && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-yellow-300 font-display font-black text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 gap-2">
                      {/* Secondary Action to switch active deck */}
                      <button
                        type="button"
                        onClick={() => onSelectDeck(deck)}
                        className={`px-3 py-1.5 rounded-xl font-display font-extrabold text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {isActive ? 'Selected for Battle' : 'Set as Active Topic'}
                      </button>

                      <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                        {deck.createdAt}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Footer Secondary Action */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Active Topic: {activeDeck.title} ({activeDeck.questions.length} Qs)</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold transition-colors cursor-pointer"
            >
              Done &amp; Return to Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
