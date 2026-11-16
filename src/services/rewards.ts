import { ScholarProgress } from './progression';
import { getAccountToken, usesHostedAuthBackend } from './auth';

export interface RewardState {
  quizzesCompleted: number;
  perfectScores: number;
  battleWins: number;
  claimedDailyDate: string | null;
  claimedAchievementIds: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  isUnlocked: boolean;
  isClaimed: boolean;
}

const REWARD_PREFIX = 'eduquests-rewards:';
const PENDING_BATTLES_PREFIX = 'eduquests-pending-battle-rewards:';
const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
const ACHIEVEMENTS = [
  { id: 'first-quiz', title: 'First Steps', description: 'Complete your first quiz battle.', rewardXp: 50, condition: (state: RewardState) => state.quizzesCompleted >= 1 },
  { id: 'five-quizzes', title: 'Dedicated Scholar', description: 'Complete 5 quiz battles. Claim to unlock the Scholar Robe outfit.', rewardXp: 100, condition: (state: RewardState) => state.quizzesCompleted >= 5 },
  { id: 'perfect-score', title: 'Perfect Recall', description: 'Finish a quiz battle with 100% accuracy.', rewardXp: 100, condition: (state: RewardState) => state.perfectScores >= 1 },
  { id: 'battle-winner', title: 'Arena Champion', description: 'Win a quiz battle.', rewardXp: 100, condition: (state: RewardState) => state.battleWins >= 1 },
  { id: 'seven-day-streak', title: 'Week of Wisdom', description: 'Reach a 7-day study streak.', rewardXp: 150, condition: (_state: RewardState, progress: ScholarProgress) => progress.streak >= 7 },
  { id: 'xp-milestone', title: 'Rising Scholar', description: 'Earn 1,000 total XP.', rewardXp: 100, condition: (_state: RewardState, progress: ScholarProgress) => progress.totalXp >= 1000 },
] as const;

function rewardsKey(accountId: string) {
  return `${REWARD_PREFIX}${accountId}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadRewardState(accountId: string): RewardState {
  try {
    const saved = JSON.parse(localStorage.getItem(rewardsKey(accountId)) || 'null') as Partial<RewardState> | null;
    return {
      quizzesCompleted: Math.max(0, Math.floor(saved?.quizzesCompleted || 0)),
      perfectScores: Math.max(0, Math.floor(saved?.perfectScores || 0)),
      battleWins: Math.max(0, Math.floor(saved?.battleWins || 0)),
      claimedDailyDate: typeof saved?.claimedDailyDate === 'string' ? saved.claimedDailyDate : null,
      claimedAchievementIds: Array.isArray(saved?.claimedAchievementIds) ? saved.claimedAchievementIds : [],
    };
  } catch {
    return { quizzesCompleted: 0, perfectScores: 0, battleWins: 0, claimedDailyDate: null, claimedAchievementIds: [] };
  }
}

function saveRewardState(accountId: string, state: RewardState) {
  localStorage.setItem(rewardsKey(accountId), JSON.stringify(state));
}

interface PendingBattleReward {
  eventId: string;
  isVictory: boolean;
  isPerfect: boolean;
}

function loadPendingBattleRewards(accountId: string): PendingBattleReward[] {
  try {
    const saved = JSON.parse(localStorage.getItem(`${PENDING_BATTLES_PREFIX}${accountId}`) || '[]') as PendingBattleReward[];
    return Array.isArray(saved)
      ? saved.filter((item) =>
        typeof item.eventId === 'string' &&
        typeof item.isVictory === 'boolean' &&
        typeof item.isPerfect === 'boolean'
      )
      : [];
  } catch {
    return [];
  }
}

function savePendingBattleRewards(accountId: string, pending: PendingBattleReward[]) {
  localStorage.setItem(`${PENDING_BATTLES_PREFIX}${accountId}`, JSON.stringify(pending));
}

function addBattleReward(state: RewardState, outcome: PendingBattleReward) {
  state.quizzesCompleted += 1;
  if (outcome.isPerfect) state.perfectScores += 1;
  if (outcome.isVictory) state.battleWins += 1;
}

async function syncPendingBattleRewards(accountId: string) {
  const pending = loadPendingBattleRewards(accountId);
  if (!pending.length) return;
  const data = await requestRewardApi<{ rewards: Partial<RewardState> }>('/api/account/rewards/activity', {
    events: pending,
  });
  const synced = mapRemoteRewardState({
    ...data.rewards,
    claimedDailyDate: loadRewardState(accountId).claimedDailyDate,
    claimedAchievementIds: loadRewardState(accountId).claimedAchievementIds,
  });
  saveRewardState(accountId, synced);
  const completedIds = new Set(pending.map((item) => item.eventId));
  savePendingBattleRewards(
    accountId,
    loadPendingBattleRewards(accountId).filter((item) => !completedIds.has(item.eventId))
  );
}

async function requestRewardApi<T>(path: string, body?: unknown): Promise<T> {
  const token = getAccountToken();
  if (!token) throw new Error('Sign in to sync rewards.');
  const response = await fetch(`${API_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to sync rewards.');
  return data as T;
}

function mapRemoteRewardState(saved: Partial<RewardState>): RewardState {
  const record = saved as Partial<RewardState> & {
    quizzes_completed?: number;
    perfect_scores?: number;
    battle_wins?: number;
    claimed_daily_date?: string | null;
    claimed_achievement_ids?: string[];
  };
  return {
    quizzesCompleted: Math.max(0, Math.floor(Number(saved.quizzesCompleted ?? record.quizzes_completed) || 0)),
    perfectScores: Math.max(0, Math.floor(Number(saved.perfectScores ?? record.perfect_scores) || 0)),
    battleWins: Math.max(0, Math.floor(Number(saved.battleWins ?? record.battle_wins) || 0)),
    claimedDailyDate: typeof (saved.claimedDailyDate ?? record.claimed_daily_date) === 'string'
      ? saved.claimedDailyDate ?? record.claimed_daily_date ?? null
      : null,
    claimedAchievementIds: Array.isArray(saved.claimedAchievementIds ?? record.claimed_achievement_ids)
      ? saved.claimedAchievementIds ?? record.claimed_achievement_ids ?? []
      : [],
  };
}

export async function syncRewardState(accountId: string) {
  const token = getAccountToken();
  if (!token || token.startsWith('local-account-token:') || !usesHostedAuthBackend()) {
    return loadRewardState(accountId);
  }
  await syncPendingBattleRewards(accountId);
  const data = await requestRewardApi<{ rewards: Partial<RewardState> }>('/api/account/rewards');
  const state = mapRemoteRewardState(data.rewards);
  saveRewardState(accountId, state);
  return state;
}

export async function recordBattleReward(accountId: string, outcome: { isVictory: boolean; isPerfect: boolean }) {
  const state = loadRewardState(accountId);
  const event: PendingBattleReward = {
    eventId: crypto.randomUUID(),
    isVictory: outcome.isVictory,
    isPerfect: outcome.isPerfect,
  };
  addBattleReward(state, event);
  saveRewardState(accountId, state);
  const token = getAccountToken();
  if (token && !token.startsWith('local-account-token:') && usesHostedAuthBackend()) {
    const pending = loadPendingBattleRewards(accountId);
    savePendingBattleRewards(accountId, [...pending, event]);
    await syncPendingBattleRewards(accountId);
    return loadRewardState(accountId);
  }
  return state;
}

export async function claimDailyReward(accountId: string, streak: number) {
  const token = getAccountToken();
  if (token && !token.startsWith('local-account-token:') && usesHostedAuthBackend()) {
    const data = await requestRewardApi<{
      rewardXp: number;
      rewards?: Partial<RewardState>;
    }>('/api/account/rewards/daily', {});
    const state = await syncRewardState(accountId);
    return { xp: data.rewardXp, state, accountSynced: true };
  }
  const state = loadRewardState(accountId);
  const today = todayKey();
  if (state.claimedDailyDate === today) throw new Error('You have already claimed today’s reward.');
  const xp = 25 + Math.min(Math.max(0, streak - 1), 14) * 5;
  state.claimedDailyDate = today;
  saveRewardState(accountId, state);
  return { xp, state, accountSynced: false };
}

export async function claimAchievementReward(
  accountId: string,
  achievementId: string,
  progress: ScholarProgress
) {
  const token = getAccountToken();
  const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
  if (!achievement) throw new Error('Achievement not found.');
  if (token && !token.startsWith('local-account-token:') && usesHostedAuthBackend()) {
    await requestRewardApi(`/api/account/rewards/achievements/${encodeURIComponent(achievementId)}/claim`, {});
    const state = await syncRewardState(accountId);
    return { xp: achievement.rewardXp, state, accountSynced: true };
  }
  const state = loadRewardState(accountId);
  if (!achievement.condition(state, progress)) {
    throw new Error('This achievement is not unlocked yet.');
  }
  if (state.claimedAchievementIds.includes(achievementId)) {
    throw new Error('This achievement reward has already been claimed.');
  }
  state.claimedAchievementIds = [...state.claimedAchievementIds, achievementId];
  saveRewardState(accountId, state);
  return { xp: achievement.rewardXp, state, accountSynced: false };
}

export function getAchievements(accountId: string, progress: ScholarProgress): Achievement[] {
  const state = loadRewardState(accountId);
  return ACHIEVEMENTS.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    rewardXp: item.rewardXp,
    isUnlocked: item.condition(state, progress),
    isClaimed: state.claimedAchievementIds.includes(item.id),
  }));
}

export function hasClaimedDailyReward(accountId: string) {
  return loadRewardState(accountId).claimedDailyDate === todayKey();
}
