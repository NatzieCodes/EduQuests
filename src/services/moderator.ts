import type { ClassmateMember, GameMode } from '../game/rules';
import type { LobbyChatMessage } from '../components/LobbyOverlay';

export interface ModeratorSession {
  token: string;
  name: string;
}

export interface ModeratorConfig {
  configured: boolean;
  usingDevFallback: boolean;
  devPasscodeHint?: string;
}

export interface ModeratorDeckQuestionSummary {
  id: string;
  question: string;
  questionType: string;
  conceptTag: string;
  difficulty: string;
}

export interface ModeratorRoomDetail {
  code: string;
  name: string;
  host: string;
  topic: string;
  isPrivate: boolean;
  mode: GameMode;
  status: 'lobby' | 'playing';
  bossHp: number;
  bossMaxHp: number;
  questionCount: number;
  deckQuestions?: ModeratorDeckQuestionSummary[];
  members: ClassmateMember[];
  messages: LobbyChatMessage[];
}

export interface ModeratorOnlinePlayer {
  id: string;
  name: string;
  blockSection: string;
  heroId: string;
  roomCode: string | null;
  isMuted: boolean;
  isBanned: boolean;
}

export interface ModeratorMuteRecord {
  key: string;
  playerId?: string;
  username: string;
  mutedAt: string;
  mutedBy: string;
}

export interface ModeratorBanRecord {
  key: string;
  playerId?: string;
  username: string;
  reason?: string;
  bannedAt: string;
  bannedBy: string;
}

export interface ModerationLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action:
    | 'close_room'
    | 'end_battle'
    | 'kick_player'
    | 'delete_message'
    | 'mute_player'
    | 'unmute_player'
    | 'ban_player'
    | 'unban_player'
    | 'update_account'
    | 'delete_account'
    | 'announcement';
  target: string;
  details: string;
}

export interface RegisteredAccountStat {
  id: string;
  username: string;
  blockSection: string;
  totalXp: number;
  streak: number;
  quizzesCompleted: number;
  perfectScores: number;
  battleWins: number;
  lastActiveDate: string | null;
  isBanned: boolean;
}

export interface ModeratorSystemHealth {
  uptimeSec: number;
  wsConnections: number;
  databaseConnected: boolean;
  geminiConfigured: boolean;
  nodeVersion: string;
  environment: string;
}

export interface ModeratorOverview {
  stats: {
    activeRooms: number;
    liveBattles: number;
    onlinePlayers: number;
    mutedPlayers: number;
    bannedPlayers: number;
    registeredAccounts: number;
  };
  systemHealth: ModeratorSystemHealth;
  databaseConnected: boolean;
  rooms: ModeratorRoomDetail[];
  onlinePlayers: ModeratorOnlinePlayer[];
  mutedPlayers: ModeratorMuteRecord[];
  bannedPlayers: ModeratorBanRecord[];
  moderationLogs: ModerationLogEntry[];
  registeredAccounts: RegisteredAccountStat[];
}

const MOD_SESSION_STORAGE_KEY = 'eduquests-moderator-session';

export function loadModeratorSession(): ModeratorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(MOD_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ModeratorSession>;
    if (typeof parsed.token === 'string' && parsed.token.trim() && typeof parsed.name === 'string') {
      return { token: parsed.token, name: parsed.name || 'App Moderator' };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveModeratorSession(session: ModeratorSession) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MOD_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota issues
  }
}

export function clearModeratorSession() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(MOD_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

async function moderatorRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = loadModeratorSession();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }
  const response = await fetch(path, { ...options, headers });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    if (response.status === 401) {
      clearModeratorSession();
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export function getModeratorConfig(): Promise<ModeratorConfig> {
  return moderatorRequest<ModeratorConfig>('/api/moderator/config');
}

export async function loginModerator(
  passcode: string,
  displayName: string
): Promise<ModeratorSession> {
  const data = await moderatorRequest<{
    token: string;
    moderator: { name: string; role: string };
  }>('/api/moderator/login', {
    method: 'POST',
    body: JSON.stringify({ passcode, displayName }),
  });
  const session: ModeratorSession = {
    token: data.token,
    name: data.moderator.name,
  };
  saveModeratorSession(session);
  return session;
}

export function getModeratorOverview(): Promise<ModeratorOverview> {
  return moderatorRequest<ModeratorOverview>('/api/moderator/overview');
}

export function closeModeratorRoom(roomCode: string): Promise<{ closed: boolean; roomCode: string }> {
  return moderatorRequest(`/api/moderator/rooms/${encodeURIComponent(roomCode)}/close`, {
    method: 'POST',
  });
}

export function endModeratorBattle(roomCode: string): Promise<{ ended: boolean; roomCode: string }> {
  return moderatorRequest(`/api/moderator/rooms/${encodeURIComponent(roomCode)}/end-battle`, {
    method: 'POST',
  });
}

export function kickModeratorPlayer(
  roomCode: string,
  playerId: string | undefined,
  username: string
): Promise<{ kicked: boolean; username: string }> {
  return moderatorRequest(`/api/moderator/rooms/${encodeURIComponent(roomCode)}/kick`, {
    method: 'POST',
    body: JSON.stringify({ playerId, username }),
  });
}

export function deleteModeratorMessage(
  roomCode: string,
  messageId: string
): Promise<{ deleted: boolean; messageId: string }> {
  return moderatorRequest(
    `/api/moderator/rooms/${encodeURIComponent(roomCode)}/messages/${encodeURIComponent(messageId)}`,
    { method: 'DELETE' }
  );
}

export function setPlayerMuteStatus(
  username: string,
  muted: boolean,
  playerId?: string
): Promise<{ muted: boolean; username: string }> {
  return moderatorRequest('/api/moderator/players/mute', {
    method: 'POST',
    body: JSON.stringify({ username, muted, playerId }),
  });
}

export function setPlayerBanStatus(
  username: string,
  banned: boolean,
  playerId?: string,
  reason?: string
): Promise<{ banned: boolean; username: string }> {
  return moderatorRequest('/api/moderator/players/ban', {
    method: 'POST',
    body: JSON.stringify({ username, banned, playerId, reason }),
  });
}

export function updateRegisteredAccount(
  accountId: string,
  payload: { blockSection?: string; resetProgress?: boolean }
): Promise<{ updated: boolean; id: string }> {
  return moderatorRequest(`/api/moderator/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteRegisteredAccount(
  accountId: string
): Promise<{ deleted: boolean; id: string }> {
  return moderatorRequest(`/api/moderator/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  });
}

export function sendModeratorAnnouncement(
  text: string,
  roomCode = 'ALL'
): Promise<{ sent: boolean; roomsNotified: number }> {
  return moderatorRequest('/api/moderator/broadcast', {
    method: 'POST',
    body: JSON.stringify({ text, roomCode }),
  });
}
