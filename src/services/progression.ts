export interface ScholarProgress {
  level: number;
  currentXp: number;
  totalXp: number;
  xpToNextLevel: number;
  streak: number;
  lastActiveDate: string | null;
}

export const XP_PER_LEVEL = 500;
const PROGRESS_PREFIX = 'eduquests-scholar-progress:';

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function createScholarProgress(totalXp = 0): ScholarProgress {
  const safeTotalXp = Math.max(0, Math.floor(totalXp));
  return {
    level: Math.floor(safeTotalXp / XP_PER_LEVEL) + 1,
    currentXp: safeTotalXp % XP_PER_LEVEL,
    totalXp: safeTotalXp,
    xpToNextLevel: XP_PER_LEVEL,
    streak: 0,
    lastActiveDate: null,
  };
}

function progressKey(accountId: string) {
  return `${PROGRESS_PREFIX}${accountId}`;
}

export function loadScholarProgress(accountId: string): ScholarProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey(accountId)) || 'null') as Partial<ScholarProgress> | null;
    if (saved && typeof saved.totalXp === 'number') {
      const progress = createScholarProgress(saved.totalXp);
      progress.streak = Math.max(0, Math.floor(saved.streak || 0));
      progress.lastActiveDate = typeof saved.lastActiveDate === 'string' ? saved.lastActiveDate : null;
      return progress;
    }
  } catch {
    // Local storage may be unavailable in privacy mode; default progress remains usable.
  }
  return createScholarProgress();
}

export function saveScholarProgress(accountId: string, progress: ScholarProgress) {
  localStorage.setItem(progressKey(accountId), JSON.stringify(progress));
}

export function markProgressActive(accountId: string, progress: ScholarProgress): ScholarProgress {
  const today = toDateKey();
  if (progress.lastActiveDate === today) return progress;

  let nextStreak = 1;
  if (progress.lastActiveDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (progress.lastActiveDate === toDateKey(yesterday)) {
      nextStreak = progress.streak + 1;
    } else {
      const last = fromDateKey(progress.lastActiveDate);
      if (!Number.isNaN(last.getTime())) nextStreak = 1;
    }
  }

  const updated = { ...progress, streak: nextStreak, lastActiveDate: today };
  saveScholarProgress(accountId, updated);
  return updated;
}

export function awardScholarXp(accountId: string, progress: ScholarProgress, amount: number): ScholarProgress {
  return addScholarXp(accountId, progress, amount, true);
}

function addScholarXp(
  accountId: string,
  progress: ScholarProgress,
  amount: number,
  markActive: boolean
): ScholarProgress {
  const updated = createScholarProgress(progress.totalXp + Math.max(0, Math.floor(amount)));
  updated.streak = progress.streak;
  updated.lastActiveDate = progress.lastActiveDate;
  const result = markActive ? markProgressActive(accountId, updated) : updated;
  saveScholarProgress(accountId, result);
  return result;
}

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');

export async function syncScholarProgress(accountId: string, amount = 0, markActive = true): Promise<ScholarProgress> {
  const token = localStorage.getItem('eduquests-account-token');
  if (!token || token.startsWith('local-account-token:')) {
    const local = loadScholarProgress(accountId);
    if (amount > 0) return addScholarXp(accountId, local, amount, markActive);
    return markActive ? saveAndReturn(accountId, markProgressActive(accountId, local)) : local;
  }

  try {
    const method = amount > 0 || markActive ? 'POST' : 'GET';
    const response = await fetch(`${API_URL}/api/account/progression`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: method === 'POST' ? JSON.stringify({ amount, markActive }) : undefined,
    });
    if (!response.ok) throw new Error('Progression endpoint unavailable');
    const data = await response.json();
    const row = data.progression || {};
    const progress = createScholarProgress(Number(row.total_xp || row.totalXp || 0));
    progress.streak = Math.max(0, Number(row.streak || 0));
    progress.lastActiveDate = row.last_active_date || row.lastActiveDate || null;
    saveScholarProgress(accountId, progress);
    return progress;
  } catch {
    const local = loadScholarProgress(accountId);
    if (amount > 0) return addScholarXp(accountId, local, amount, markActive);
    return markActive ? markProgressActive(accountId, local) : local;
  }
}

function saveAndReturn(accountId: string, progress: ScholarProgress) {
  saveScholarProgress(accountId, progress);
  return progress;
}
