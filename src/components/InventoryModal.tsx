import React, { useEffect, useState } from 'react';
import {
  ClassmateMember,
  GameMode,
  QuizDeck,
  QuizDifficulty,
  QuizQuestionType,
  QUIZ_QUESTION_TYPES,
} from '../game/rules';
import {
  Sparkles,
  X,
  FolderOpen,
  FileText,
  Clock,
  Layers,
  Plus,
  Pencil,
  Palette,
  ChevronLeft,
  Download,
} from 'lucide-react';
import { extractStudyText } from '../services/studyFiles';
import { generateQuizDeck, StudyMaterialSelection } from '../services/quizGenerator';
import { StudyMaterialPicker } from './StudyMaterialPicker';

interface StudyFolder {
  id: string;
  name: string;
  color: string;
}

interface ImportedPdf {
  id: string;
  name: string;
  text: string;
  addedAt: string;
}

const FOLDER_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Black', hex: '#111827' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Gray', hex: '#9ca3af' },
  { name: 'Brown', hex: '#92400e' },
];

type RgbValue = { red: number; green: number; blue: number };
const toHex = ({ red, green, blue }: RgbValue) =>
  `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
const fromHex = (hex: string): RgbValue => ({
  red: parseInt(hex.slice(1, 3), 16) || 0,
  green: parseInt(hex.slice(3, 5), 16) || 0,
  blue: parseInt(hex.slice(5, 7), 16) || 0,
});

interface InventoryModalProps {
  isOpen: boolean;
  accountId: string;
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
  onLaunchDeck?: (deck: QuizDeck, durationSec: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  accountId,
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
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Standard');
  const [questionTypes, setQuestionTypes] = useState<QuizQuestionType[]>([...QUIZ_QUESTION_TYPES]);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
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
  const [newFolderColor, setNewFolderColor] = useState('#facc15');
  const [rgbTargetId, setRgbTargetId] = useState<string | null>(null);
  const [rgbDraft, setRgbDraft] = useState<RgbValue>({ red: 250, green: 204, blue: 21 });
  const [paletteFolderId, setPaletteFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string>('all');
  const [targetFolderId, setTargetFolderId] = useState<string>('general');
  const [importedPdfs, setImportedPdfs] = useState<ImportedPdf[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`eduquests-imported-pdfs:${accountId}`) || '[]') as ImportedPdf[];
    } catch {
      return [];
    }
  });
  const [pdfStorageAccount, setPdfStorageAccount] = useState(accountId);
  const [draggingFile, setDraggingFile] = useState(false);

  useEffect(() => {
    localStorage.setItem('eduquests-study-folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('eduquests-deck-folders', JSON.stringify(deckFolders));
  }, [deckFolders]);

  useEffect(() => {
    if (pdfStorageAccount === accountId) return;
    try {
      setImportedPdfs(JSON.parse(localStorage.getItem(`eduquests-imported-pdfs:${accountId}`) || '[]') as ImportedPdf[]);
    } catch {
      setImportedPdfs([]);
      setErrorMsg('Could not load saved PDFs for this account.');
    }
    setPdfStorageAccount(accountId);
  }, [accountId, pdfStorageAccount]);

  useEffect(() => {
    if (pdfStorageAccount !== accountId) return;
    try {
      localStorage.setItem(`eduquests-imported-pdfs:${accountId}`, JSON.stringify(importedPdfs));
    } catch {
      setErrorMsg('There is not enough browser storage to save this PDF.');
    }
  }, [accountId, importedPdfs, pdfStorageAccount]);

  if (!isOpen) return null;

  const openRgbPicker = (targetId: string, initialColor: string) => {
    setRgbDraft(fromHex(initialColor));
    setRgbTargetId(targetId);
  };

  const applyRgbColor = () => {
    const color = toHex(rgbDraft);
    if (rgbTargetId === 'new') setNewFolderColor(color);
    else if (rgbTargetId) {
      setFolders((current) => current.map((folder) =>
        folder.id === rgbTargetId ? { ...folder, color } : folder
      ));
    }
    setRgbTargetId(null);
  };

  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    setReadingFile(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const text = await extractStudyText(file);
      selectMaterial({
        kind: extension === 'pdf' ? 'pdf' : 'text',
        name: file.name,
        notes: text,
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not read this file.');
    } finally {
      setReadingFile(false);
    }
  };

  const applySelectedMaterial = (material: StudyMaterialSelection) => {
    setSelectedMaterial(material);
    if (material.notes !== undefined) setNotes(material.notes);
    else setNotes('');
    setTitle(material.name.replace(/\.[^.]+$/, '').slice(0, 120));
    setErrorMsg(null);
  };

  const selectMaterial = (material: StudyMaterialSelection) => {
    applySelectedMaterial(material);
    if (material.kind === 'pdf' && material.notes) {
      setImportedPdfs((current) => [
        { id: `pdf-${Date.now()}`, name: material.name, text: material.notes || '', addedAt: new Date().toISOString() },
        ...current.filter((item) => item.name !== material.name),
      ].slice(0, 20));
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

  const downloadTextPdf = async (name: string, lines: string[]) => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = 18;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(pdf.splitTextToSize(name, pageWidth - 32), 16, y);
      y += 14;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      for (const line of lines) {
        const wrapped = pdf.splitTextToSize(line, pageWidth - 32);
        const blockHeight = wrapped.length * 5 + 5;
        if (y + blockHeight > pageHeight - 16) {
          pdf.addPage();
          y = 18;
        }
        pdf.text(wrapped, 16, y);
        y += blockHeight;
      }

      pdf.save(`${name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'study-material'}.pdf`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? `Could not create PDF: ${error.message}` : 'Could not create PDF.');
    }
  };

  const downloadDeckPdf = async (deck: QuizDeck) => {
    const lines = deck.questions.flatMap((question, index) => [
      `${index + 1}. ${question.question}`,
      ...(question.options.length
        ? question.options.map((option, optionIndex) =>
          `${optionIndex === question.correctIndex ? '[Correct] ' : ''}${String.fromCharCode(65 + optionIndex)}. ${option}`
        )
        : [`Correct answer: ${question.correctAnswer || 'Unavailable'}`]),
      `Explanation: ${question.explanation}`,
      '',
    ]);
    await downloadTextPdf(deck.title, [`${deck.subject} · ${deck.questions.length} questions`, '', ...lines]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanSubject = subject.trim() || 'General Review';
    const durationSec = getBattleDurationSec();

    if (!cleanTitle) {
      setErrorMsg('Please enter a Topic Title.');
      return;
    }
    const cleanNotes = notes.trim();
    const hasSource = Boolean(selectedMaterial?.sourceUrl || selectedMaterial?.video);
    if ((!cleanNotes || cleanNotes.length < 20) && !hasSource) {
      setErrorMsg('Add at least 20 characters of study text, attach a file, or provide a supported link or video.');
      return;
    }
    if (!questionTypes.length) {
      setErrorMsg('Select at least one question type.');
      return;
    }
    if (durationSec === null) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const deck = await generateQuizDeck({
        title: cleanTitle,
        subject: cleanSubject,
        notes: cleanNotes,
        questionCount,
        difficulty,
        questionTypes,
        gameMode: selectedMode,
        sourceUrl: selectedMaterial?.sourceUrl,
        sourceType: selectedMaterial?.kind === 'url' ? 'url' : selectedMaterial?.kind === 'video' ? 'video' : undefined,
        video: selectedMaterial?.video,
      });
      setDeckFolders((current) => ({ ...current, [deck.id]: targetFolderId }));
      onDeckCreated(deck, 'gemini', startBattleAfter, durationSec);
      setLoading(false);
      if (startBattleAfter) onClose();
    } catch (error) {
      setLoading(false);
      setErrorMsg(error instanceof Error ? error.message : 'Gemini quiz generation failed.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-modal-title"
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes('Files')) setDraggingFile(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDraggingFile(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDraggingFile(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDraggingFile(false);
        void handleFileUpload(event.dataTransfer.files[0]);
      }}
    >
      {draggingFile && (
        <div className="fixed inset-4 z-50 pointer-events-none rounded-3xl border-4 border-dashed border-yellow-400 bg-slate-950/55 flex items-center justify-center text-yellow-300 font-display font-black text-lg">
          Drop a PDF or .txt file to import
        </div>
      )}
      <div className="flex h-[min(84dvh,760px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[oklch(0.21_0.04_265.75/_1)] px-4 py-3.5 text-white sm:px-5">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:grid-rows-1">
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
              </div>
              {createFolderOpen && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      placeholder="Folder name"
                      className="h-8 flex-1 min-w-0 px-2.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-amber-500"
                    />
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        aria-label={`Select ${color.name}`}
                        aria-pressed={newFolderColor === color.hex}
                        title={color.name}
                        onClick={() => setNewFolderColor(color.hex)}
                        className={`w-6 h-6 rounded-full border ${newFolderColor === color.hex ? 'ring-2 ring-slate-900 ring-offset-1' : 'border-slate-300'}`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => openRgbPicker('new', newFolderColor)}
                      className="px-2.5 h-7 rounded-lg bg-slate-900 text-yellow-300 text-[10px] font-display font-bold cursor-pointer"
                    >
                      Custom RGB
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 drawer-scroll">
              {importedPdfs.length > 0 && (
                <section className="mb-4">
                  <h4 className="mb-2 text-[10px] font-mono font-bold text-sky-800 uppercase tracking-widest">
                    Imported PDF Files ({importedPdfs.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importedPdfs.map((pdf) => (
                      <article
                        key={pdf.id}
                        className="min-w-0 p-3 rounded-xl border border-sky-200 bg-sky-50"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            applySelectedMaterial({ kind: 'pdf', name: pdf.name, notes: pdf.text });
                          }}
                          className="w-full text-left cursor-pointer"
                          title="Load extracted text for quiz creation"
                        >
                          <div className="flex items-center gap-2 text-xs font-display font-black text-slate-900">
                            <FileText className="w-4 h-4 shrink-0 text-sky-700" />
                            <span className="truncate">{pdf.name}</span>
                          </div>
                          <p className="mt-1 text-[9px] text-slate-600 line-clamp-2">{pdf.text.slice(0, 140)}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadTextPdf(pdf.name.replace(/\.pdf$/i, ''), pdf.text.split(/\n+/))}
                          className="mt-2 px-2 py-1 rounded-lg bg-white border border-sky-200 text-[9px] font-display font-bold text-slate-700 hover:bg-sky-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Export PDF
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
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
                            <button
                              type="button"
                              onClick={() => setPaletteFolderId((current) => current === folder.id ? null : folder.id)}
                              aria-label={`Change ${folder.name} color`}
                              title="Change folder color"
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center justify-center"
                            >
                              <Palette className="w-3.5 h-3.5 text-slate-600" />
                            </button>
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
                        {paletteFolderId === folder.id && (
                          <div className="px-3 pb-3 flex flex-wrap items-center gap-1.5">
                            {FOLDER_COLORS.map((color) => (
                              <button
                                key={color.name}
                                type="button"
                                aria-label={`Set ${folder.name} to ${color.name}`}
                                title={color.name}
                                onClick={() => {
                                  setFolders((current) => current.map((item) =>
                                    item.id === folder.id ? { ...item, color: color.hex } : item
                                  ));
                                  setPaletteFolderId(null);
                                }}
                                className={`w-5 h-5 rounded-full border ${folder.color === color.hex ? 'ring-2 ring-slate-900 ring-offset-1' : 'border-slate-300'}`}
                                style={{ backgroundColor: color.hex }}
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => openRgbPicker(folder.id, folder.color)}
                              className="px-2 h-6 rounded-lg bg-slate-900 text-yellow-300 text-[9px] font-display font-bold cursor-pointer"
                            >
                              Custom RGB
                            </button>
                          </div>
                        )}
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
                            <div className="mt-1.5 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onSelectDeck(deck)}
                                className={`h-7 flex-1 rounded-lg font-display font-extrabold text-[9px] cursor-pointer ${
                                  isActive
                                    ? 'bg-yellow-400 text-slate-950'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {isActive ? 'Selected for Battle' : 'Set Active Topic'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void downloadDeckPdf(deck)}
                                aria-label={`Export ${deck.title} as PDF`}
                                title="Export quiz as PDF"
                                className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-sky-100 border border-slate-200 flex items-center justify-center cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-sky-700" />
                              </button>
                            </div>
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
            </div>

            <form onSubmit={handleSubmit} className="flex-1 min-h-0 p-4 flex flex-col gap-2.5">
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

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] font-bold text-slate-700">
                  Difficulty
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as QuizDifficulty)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-[10px] font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
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
                          checked={questionTypes.includes(type)}
                          onChange={(event) => setQuestionTypes((current) =>
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

              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">Study material</label>
                <StudyMaterialPicker
                  value={selectedMaterial}
                  onSelect={selectMaterial}
                  disabled={loading || readingFile}
                />
                <textarea
                  rows={4}
                  value={notes}
                  required={!selectedMaterial?.sourceUrl && !selectedMaterial?.video}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    if (selectedMaterial?.sourceUrl || selectedMaterial?.video) setSelectedMaterial(null);
                    setErrorMsg(null);
                  }}
                  placeholder="Paste study text here, or attach a PDF, TXT, link, or video."
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
      {rgbTargetId !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-rgb-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 id="custom-rgb-title" className="font-display font-black text-slate-900">Custom RGB</h3>
              <button
                type="button"
                onClick={() => setRgbTargetId(null)}
                aria-label="Cancel custom color"
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 grid place-items-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="my-4 h-14 rounded-xl border border-slate-200" style={{ backgroundColor: toHex(rgbDraft) }} />
            <div className="space-y-3">
              {([
                ['red', 'Red'],
                ['green', 'Green'],
                ['blue', 'Blue'],
              ] as const).map(([channel, label]) => (
                <label key={channel} className="grid grid-cols-[48px_1fr_42px] items-center gap-2 text-xs font-bold text-slate-700">
                  <span>{label}</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgbDraft[channel]}
                    onChange={(event) => setRgbDraft((current) => ({ ...current, [channel]: Number(event.target.value) }))}
                    aria-label={`${label} value`}
                  />
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbDraft[channel]}
                    onChange={(event) => setRgbDraft((current) => ({
                      ...current,
                      [channel]: Math.max(0, Math.min(255, Number(event.target.value) || 0)),
                    }))}
                    className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-center"
                    aria-label={`${label} number`}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRgbTargetId(null)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyRgbColor}
                className="px-3 py-2 rounded-lg bg-yellow-400 text-xs font-display font-black text-slate-950 cursor-pointer"
              >
                Apply Color
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
