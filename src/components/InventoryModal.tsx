import React, { useEffect, useState } from 'react';
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
  Clock,
  Layers,
  Plus,
  Pencil,
  Palette,
  ChevronLeft,
} from 'lucide-react';

interface StudyFolder {
  id: string;
  name: string;
  color: string;
}

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
  onDeckCreated: (deck: QuizDeck, source: string, startBattleNow: boolean, durationSec?: number) => void;
  onUpdateDeck?: (deckId: string, title: string, notes: string) => void;
  onDeleteDeck?: (deckId: string) => void;
  onStartBattle?: (durationSec: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  startBattleAfter = false,
  selectedMode,
  decks,
  activeDeck,
  onSelectDeck,
  onStartBattle,
  onClose,
  onDeckCreated,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('BSCS-3A · Reviewer');
  const [notes, setNotes] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [battleMinutes, setBattleMinutes] = useState('3');
  const [battleMinutesError, setBattleMinutesError] = useState('');
  const [folders, setFolders] = useState<StudyFolder[]>(() => {
    try {
      const saved = localStorage.getItem('eduquests-study-folders');
      if (saved) return JSON.parse(saved) as StudyFolder[];
    } catch {
      // Use defaults when storage is unavailable.
    }
    return [
      { id: 'general', name: 'General Review', color: '#fbbf24' },
      { id: 'imported', name: 'Imported PDFs', color: '#38bdf8' },
    ];
  });
  const [deckFolders, setDeckFolders] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('eduquests-deck-folders');
      if (saved) return JSON.parse(saved) as Record<string, string>;
    } catch {
      // Use the general folder by default.
    }
    return {};
  });
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#fbbf24');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string>('all');
  const [targetFolderId, setTargetFolderId] = useState<string>('general');

  useEffect(() => {
    localStorage.setItem('eduquests-study-folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('eduquests-deck-folders', JSON.stringify(deckFolders));
  }, [deckFolders]);

  if (!isOpen) return null;

  const handleLoadSample = (sampleKey: keyof typeof SAMPLE_STUDY_NOTES) => {
    const sample = SAMPLE_STUDY_NOTES[sampleKey];
    if (!sample) return;
    setTitle(sample.title);
    setSubject(sample.subject);
    setNotes(sample.notes);
    setErrorMsg(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setTitle(file.name.replace(/\.[^.]+$/, ''));
      setNotes(text.slice(0, 15000));
      setErrorMsg(null);
    } catch {
      setErrorMsg('Could not read file text. Please paste PDF or study notes directly.');
    }
  };

  const getBattleDurationSec = () => {
    if (selectedMode === 'training') return 0;
    const minutes = Number(battleMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(minutes)) {
      setBattleMinutesError('Enter a whole number greater than 0.');
      return null;
    }
    setBattleMinutesError('');
    return minutes * 60;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanSubject = subject.trim() || 'General Review';
    const cleanNotes = notes.trim();
    const durationSec = getBattleDurationSec();

    if (!cleanTitle) {
      setErrorMsg('Please enter a Topic Title.');
      return;
    }
    if (!cleanNotes || cleanNotes.length < 20) {
      setErrorMsg('Please enter at least 20 characters of PDF text or study notes.');
      return;
    }
    if (durationSec === null) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          subject: cleanSubject,
          notes: cleanNotes,
          questionCount,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.deck) {
          setDeckFolders((current) => ({ ...current, [data.deck.id]: targetFolderId }));
          onDeckCreated(data.deck, data.source || 'gemini', startBattleAfter, durationSec);
          setLoading(false);
          onClose();
          return;
        }
      }
    } catch {
      // Fall back to the local parser.
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
    setDeckFolders((current) => ({ ...current, [localDeck.id]: targetFolderId }));
    onDeckCreated(localDeck, 'local-notes-parser', startBattleAfter, durationSec);
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
      <div className="w-full max-w-6xl h-[82vh] max-h-[760px] rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold text-yellow-300 uppercase tracking-wider">
                Study Material &amp; Quiz Deck Manager · {decks.length} Stored Decks
              </div>
              <h2 id="inventory-modal-title" className="text-lg sm:text-xl font-display font-black leading-tight">
                Inventory · PDF Files &amp; Study Notes
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inventory Modal"
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] flex-1 min-h-0">
          <section className="min-h-0 flex flex-col border-r border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                INVENTORY FILES
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <h3 className="text-sm font-display font-black text-slate-900 flex items-center gap-1.5">
                  {openFolderId === 'all' ? <Layers className="w-4 h-4 text-amber-600" /> : (
                    <button
                      type="button"
                      onClick={() => setOpenFolderId('all')}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                      aria-label="Back to folders"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  {openFolderId === 'all'
                    ? `Folders (${folders.length})`
                    : folders.find((folder) => folder.id === openFolderId)?.name || 'Folder'}
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateFolderOpen((current) => !current)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-yellow-300 text-[10px] font-display font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  New Folder
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-500 truncate">
                  Active: <strong className="text-amber-700">{activeDeck.title}</strong>
                </span>
              </div>
              {createFolderOpen && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Folder name"
                    className="h-8 flex-1 min-w-0 px-2.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-amber-500"
                  />
                  <label className="h-8 w-8 rounded-lg border border-slate-300 cursor-pointer overflow-hidden" title="Folder color">
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(event) => setNewFolderColor(event.target.value)}
                      className="h-10 w-10 border-0 cursor-pointer"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const name = newFolderName.trim();
                      if (!name) return;
                      const folder: StudyFolder = {
                        id: `folder-${Date.now()}`,
                        name,
                        color: newFolderColor,
                      };
                      setFolders((current) => [...current, folder]);
                      setNewFolderName('');
                      setCreateFolderOpen(false);
                    }}
                    className="h-8 px-3 rounded-lg bg-yellow-400 text-slate-950 text-xs font-display font-black cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto drawer-scroll">
              {openFolderId === 'all' ? (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 content-start">
                  {folders.map((folder) => {
                    const fileCount = decks.filter((deck) => (deckFolders[deck.id] || 'general') === folder.id).length;
                    return (
                      <article
                        key={folder.id}
                        className="group min-h-[150px] rounded-2xl border border-slate-200 bg-white overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFolderId(folder.id)}
                          className="w-full h-[108px] p-3 flex items-end text-left cursor-pointer"
                          style={{ background: `linear-gradient(135deg, ${folder.color}, #ffffff)` }}
                        >
                          <div>
                            <FolderOpen className="w-10 h-10 text-slate-900/75 mb-2" />
                            {editingFolderId === folder.id ? (
                              <input
                                value={editingFolderName}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => setEditingFolderName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    setFolders((current) => current.map((item) =>
                                      item.id === folder.id ? { ...item, name: editingFolderName.trim() || item.name } : item
                                    ));
                                    setEditingFolderId(null);
                                  }
                                }}
                                className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-display font-black text-slate-900"
                              />
                            ) : (
                              <div className="text-sm font-display font-black text-slate-900 truncate">{folder.name}</div>
                            )}
                          </div>
                        </button>
                        <div className="px-3 py-2 flex items-center justify-between border-t border-slate-200">
                          <span className="text-[9px] font-mono text-slate-500">{fileCount} FILES</span>
                          <div className="flex items-center gap-1">
                            <label className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center justify-center" title="Change folder color">
                              <Palette className="w-3.5 h-3.5 text-slate-600" />
                              <input
                                type="color"
                                value={folder.color}
                                onChange={(event) => setFolders((current) => current.map((item) =>
                                  item.id === folder.id ? { ...item, color: event.target.value } : item
                                ))}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                              title="Rename folder"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 content-start">
                  {decks
                    .filter((deck) => (deckFolders[deck.id] || 'general') === openFolderId)
                    .map((deck) => {
                      const isActive = activeDeck.id === deck.id;
                      return (
                        <article
                          key={deck.id}
                          className={`min-h-[178px] rounded-xl border overflow-hidden flex flex-col ${
                            isActive
                              ? 'bg-amber-50 border-amber-400 ring-2 ring-yellow-400/35'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="h-20 bg-gradient-to-br from-sky-950 via-blue-700 to-sky-400 p-2.5 text-white">
                            <div className="text-[8px] font-mono opacity-75">{deck.subject}</div>
                            <div className="mt-4 text-xs font-display font-black leading-tight line-clamp-2">{deck.title}</div>
                          </div>
                          <div className="p-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="text-[9px] text-slate-500 font-mono">
                                {deck.questions.length} QUESTIONS
                              </div>
                              <p className="mt-1 text-[9px] text-slate-600 line-clamp-2 font-mono">
                                {deck.sourceSummary || 'Custom study notes.'}
                              </p>
                            </div>
                            <select
                              value={deckFolders[deck.id] || 'general'}
                              onChange={(event) => setDeckFolders((current) => ({
                                ...current,
                                [deck.id]: event.target.value,
                              }))}
                              className="mt-2 h-7 px-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-700 cursor-pointer"
                              aria-label={`Move ${deck.title}`}
                            >
                              {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => onSelectDeck(deck)}
                              className={`mt-1.5 h-7 rounded-lg font-display font-extrabold text-[9px] cursor-pointer ${
                                isActive
                                  ? 'bg-yellow-400 text-slate-950'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {isActive ? 'Selected for Battle' : 'Set Active Topic'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  {decks.filter((deck) => (deckFolders[deck.id] || 'general') === openFolderId).length === 0 && (
                    <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <div className="text-xs font-display font-black">No PDF files in this folder</div>
                      <div className="mt-1 text-[10px]">Create a deck in the right panel or move one here.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto drawer-scroll bg-slate-50/60 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  CREATE / ADD
                </div>
                <h3 className="mt-0.5 text-sm font-display font-black text-slate-900">
                  New Quiz Deck
                </h3>
              </div>
              <label className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white cursor-pointer flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-yellow-400" />
                <input type="file" accept=".txt,.md,.pdf,.json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-2.5">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadSample('operating_systems')}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  Load OS
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('organic_chemistry')}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  Load Chem
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Topic Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Study deck title"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Save to Folder</label>
                <select
                  value={targetFolderId}
                  onChange={(event) => setTargetFolderId(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Questions</label>
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={50}>50 Questions</option>
                  <option value={70}>70 Questions</option>
                  <option value={100}>100 Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">PDF / Lecture Notes *</label>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Paste notes here..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500 font-mono text-[10px] leading-relaxed resize-none"
                />
              </div>

              {errorMsg && (
                <p className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {errorMsg}
                </p>
              )}

              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Battle Duration</span>
                </div>
                {selectedMode === 'training' ? (
                  <div className="h-9 px-3 rounded-lg bg-white border border-yellow-300 flex items-center text-xs font-display font-black text-slate-900">
                    UNTIMED TRAINING
                  </div>
                ) : (
                  <div className="flex items-center rounded-lg bg-white border border-slate-300 focus-within:border-amber-500 px-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={battleMinutes}
                      onChange={(event) => {
                        setBattleMinutes(event.target.value);
                        setBattleMinutesError('');
                      }}
                      className="h-9 w-full min-w-0 bg-transparent text-slate-900 text-xs font-display font-black outline-none"
                      aria-label="Battle duration in minutes"
                    />
                    <span className="text-[9px] font-mono font-bold text-slate-500 whitespace-nowrap">MINUTES</span>
                  </div>
                )}
                {battleMinutesError && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600">{battleMinutesError}</p>
                )}
              </div>

              <div className="sticky bottom-0 z-10 pt-2 pb-1 bg-slate-50/95 backdrop-blur-sm">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-3 rounded-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-[10px] shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? 'Generating...'
                    : startBattleAfter
                    ? 'Save Deck & Launch Battle'
                    : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
};
