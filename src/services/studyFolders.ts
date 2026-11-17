export interface StudyFolder {
  id: string;
  name: string;
  color: string;
}

export const STUDY_FOLDERS_STORAGE_KEY = 'eduquests-study-folders';
export const DECK_FOLDERS_STORAGE_KEY = 'eduquests-deck-folders';
export const DEFAULT_GENERATED_QUESTION_COUNT = 20;

export const DEFAULT_STUDY_FOLDERS: StudyFolder[] = [
  { id: 'general', name: 'General Review', color: '#fbbf24' },
  { id: 'imported', name: 'Imported PDFs', color: '#38bdf8' },
];

export const FOLDER_COLORS = [
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

export function loadStudyFolders(): StudyFolder[] {
  try {
    const saved = localStorage.getItem(STUDY_FOLDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StudyFolder[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Use defaults when storage is unavailable.
  }
  return DEFAULT_STUDY_FOLDERS;
}

export function saveStudyFolders(folders: StudyFolder[]): void {
  try {
    localStorage.setItem(STUDY_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // Ignore storage write errors.
  }
}

export function loadDeckFolders(): Record<string, string> {
  try {
    const saved = localStorage.getItem(DECK_FOLDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, string>;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // Use the general folder by default.
  }
  return {};
}

export function saveDeckFolders(deckFolders: Record<string, string>): void {
  try {
    localStorage.setItem(DECK_FOLDERS_STORAGE_KEY, JSON.stringify(deckFolders));
  } catch {
    // Ignore storage write errors.
  }
}

export function getDeckFolderId(
  deckFolders: Record<string, string>,
  deckId: string,
  folders?: StudyFolder[],
): string {
  const assigned = deckFolders[deckId] || 'general';
  if (!folders || folders.some((folder) => folder.id === assigned)) {
    return assigned;
  }
  return folders[0]?.id || 'general';
}
