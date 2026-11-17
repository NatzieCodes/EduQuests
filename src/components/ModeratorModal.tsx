import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Database,
  DoorClosed,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Shield,
  Square,
  Trash2,
  UserCheck,
  UserCog,
  UserMinus,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  clearModeratorSession,
  closeModeratorRoom,
  deleteModeratorMessage,
  deleteRegisteredAccount,
  endModeratorBattle,
  getModeratorConfig,
  getModeratorOverview,
  kickModeratorPlayer,
  loadModeratorSession,
  loginModerator,
  ModerationLogEntry,
  ModeratorConfig,
  ModeratorOverview,
  ModeratorSession,
  sendModeratorAnnouncement,
  setPlayerBanStatus,
  setPlayerMuteStatus,
  updateRegisteredAccount,
} from '../services/moderator';

interface ModeratorModalProps {
  isOpen: boolean;
  mode?: 'modal' | 'page';
  onClose: () => void;
}

type NavSection = 'rooms' | 'players' | 'accounts' | 'system' | 'logs';
type RoomInspectorTab = 'members' | 'chat' | 'deck';

function formatLogTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

const ACTION_LABELS: Record<ModerationLogEntry['action'], string> = {
  close_room: 'Closed Room',
  end_battle: 'Ended Battle',
  kick_player: 'Kicked Player',
  delete_message: 'Deleted Message',
  mute_player: 'Muted Chat',
  unmute_player: 'Unmuted Chat',
  ban_player: 'Banned User',
  unban_player: 'Unbanned User',
  update_account: 'Updated Account',
  delete_account: 'Deleted Account',
  announcement: 'System Broadcast',
};

export const ModeratorModal: React.FC<ModeratorModalProps> = ({
  isOpen,
  mode = 'modal',
  onClose,
}) => {
  const [session, setSession] = useState<ModeratorSession | null>(() => loadModeratorSession());
  const [config, setConfig] = useState<ModeratorConfig | null>(null);
  const [displayName, setDisplayName] = useState('App Moderator');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [overview, setOverview] = useState<ModeratorOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavSection>('rooms');
  const [roomTab, setRoomTab] = useState<RoomInspectorTab>('members');
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');

  const [announcementText, setAnnouncementText] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState('ALL');
  const [roomChatText, setRoomChatText] = useState('');

  const [confirmCloseCode, setConfirmCloseCode] = useState<string | null>(null);
  const [confirmEndBattleCode, setConfirmEndBattleCode] = useState<string | null>(null);
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);
  const [confirmResetAccountId, setConfirmResetAccountId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const showFeedback = useCallback((kind: 'success' | 'error', text: string) => {
    setFeedbackBanner({ kind, text });
    window.setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    getModeratorConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [isOpen]);

  const fetchOverview = useCallback(async (quiet = false) => {
    if (!loadModeratorSession()) return;
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await getModeratorOverview();
      setOverview(data);
      setOverviewError(null);
      setLastUpdatedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setSelectedRoomCode((prev) => {
        if (prev && data.rooms.some((room) => room.code === prev)) return prev;
        return data.rooms[0]?.code ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load moderator state.';
      setOverviewError(message);
      if (!loadModeratorSession()) {
        setSession(null);
      }
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !session) return;
    void fetchOverview(false);
    const interval = window.setInterval(() => {
      void fetchOverview(true);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isOpen, session, fetchOverview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const nextSession = await loginModerator(passcode, displayName);
      setSession(nextSession);
      setPasscode('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    clearModeratorSession();
    setSession(null);
    setOverview(null);
    setConfirmCloseCode(null);
    setConfirmEndBattleCode(null);
    setConfirmDeleteAccountId(null);
    setConfirmResetAccountId(null);
  };

  const filteredRooms = useMemo(() => {
    const rooms = overview?.rooms ?? [];
    const q = roomSearch.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.host.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q)
    );
  }, [overview?.rooms, roomSearch]);

  const selectedRoom = useMemo(() => {
    if (!overview?.rooms.length) return null;
    return (
      overview.rooms.find((r) => r.code === selectedRoomCode) ??
      filteredRooms[0] ??
      overview.rooms[0] ??
      null
    );
  }, [overview?.rooms, filteredRooms, selectedRoomCode]);

  const filteredPlayers = useMemo(() => {
    const players = overview?.onlinePlayers ?? [];
    const q = playerSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.blockSection.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.roomCode || '').toLowerCase().includes(q)
    );
  }, [overview?.onlinePlayers, playerSearch]);

  const filteredAccounts = useMemo(() => {
    const accounts = overview?.registeredAccounts ?? [];
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (s) =>
        s.username.toLowerCase().includes(q) ||
        s.blockSection.toLowerCase().includes(q)
    );
  }, [overview?.registeredAccounts, accountSearch]);

  if (!isOpen) return null;

  const runModAction = async (
    busyKey: string,
    fn: () => Promise<void>,
    successMsg: string
  ) => {
    setActionBusy(busyKey);
    try {
      await fn();
      showFeedback('success', successMsg);
      await fetchOverview(true);
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setActionBusy(null);
    }
  };

  const wrapperClass =
    mode === 'page'
      ? 'fixed inset-0 z-50 pointer-events-auto bg-slate-100 flex flex-col'
      : 'fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-3 sm:p-5 bg-slate-950/75';

  const cardClass =
    mode === 'page'
      ? 'w-full h-full bg-white text-slate-900 flex flex-col overflow-hidden'
      : 'w-full max-w-[1360px] h-[min(90vh,860px)] rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden';

  if (!session) {
    return (
      <div
        data-testid="moderator-login-view"
        className={wrapperClass}
        role="dialog"
        aria-modal="true"
        aria-label="App Moderator Sign In"
      >
        <div
          className={
            mode === 'page'
              ? 'flex-1 flex items-center justify-center p-4 bg-slate-100'
              : 'w-full max-w-md rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.45)] overflow-hidden'
          }
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-lg">
            <div className="px-6 py-4 bg-[oklch(0.21_0.04_265.75/_1)] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-amber-300 tracking-wide truncate">
                    EduQuests Admin &amp; Operations
                  </div>
                  <h2 className="text-base font-display font-black text-white truncate">
                    App Moderator Console
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Return to Application"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {mode === 'page' ? <ArrowLeft className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Authenticate with your server moderator passcode to inspect live WebSocket rooms,
                moderate chat &amp; users, administer accounts, and view runtime state.
              </p>

              {config && !config.configured && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Moderator passcode is not configured on this server. Set{' '}
                    <code className="font-mono font-bold">MODERATOR_PASSCODE</code> in the environment.
                  </span>
                </div>
              )}

              {config?.usingDevFallback && config.devPasscodeHint && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 flex items-center justify-between gap-2">
                  <span>
                    Dev passcode:{' '}
                    <code className="font-mono font-bold text-slate-900">
                      {config.devPasscodeHint}
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPasscode(config.devPasscodeHint || '')}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Fill Passcode
                  </button>
                </div>
              )}

              {authError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
                >
                  {authError}
                </div>
              )}

              <div>
                <label
                  htmlFor="moderator-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Moderator Handle
                </label>
                <input
                  id="moderator-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. App Moderator or Admin-Dev"
                  maxLength={40}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/25"
                />
              </div>

              <div>
                <label
                  htmlFor="moderator-passcode-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Moderator Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="moderator-passcode-input"
                    data-testid="moderator-passcode-input"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter MODERATOR_PASSCODE"
                    required
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/25"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Back to App
                </button>
                <button
                  type="submit"
                  data-testid="moderator-login-submit"
                  disabled={authLoading}
                  className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-yellow-300 font-display font-bold text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0"
                >
                  {authLoading ? 'Authenticating...' : 'Open Console'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: NavSection;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'rooms', label: 'Rooms & Chat', count: overview?.stats.activeRooms ?? 0, icon: MessageSquare },
    { id: 'players', label: 'Live Sockets', count: overview?.stats.onlinePlayers ?? 0, icon: Users },
    { id: 'accounts', label: 'User Accounts', count: overview?.stats.registeredAccounts ?? 0, icon: UserCog },
    { id: 'system', label: 'System & Config', count: overview?.systemHealth.wsConnections ?? 0, icon: Server },
    { id: 'logs', label: 'Audit Log', count: overview?.moderationLogs.length ?? 0, icon: ClipboardList },
  ];

  return (
    <div
      data-testid="moderator-dashboard"
      className={wrapperClass}
      role="dialog"
      aria-modal="true"
      aria-label="App Moderator Console"
    >
      <div className={cardClass}>
        {/* Top Bar */}
        <header className="px-5 py-3.5 bg-[oklch(0.21_0.04_265.75/_1)] text-white flex items-center justify-between gap-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-300 truncate">
                EduQuests · App Moderation &amp; Admin · {session.name}
              </div>
              <h1 className="text-base sm:text-lg font-display font-black text-white truncate">
                Application Moderator Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastUpdatedAt && (
              <span className="hidden md:inline text-xs font-mono-num text-slate-300 mr-2">
                Synced {lastUpdatedAt}
              </span>
            )}
            <button
              type="button"
              onClick={() => void fetchOverview(false)}
              disabled={isRefreshing}
              className="h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              type="button"
              data-testid="close-moderator-btn"
              onClick={onClose}
              aria-label="Close Moderator Console"
              className="h-9 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-display font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {mode === 'page' ? <ArrowLeft className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{mode === 'page' ? 'Back to App' : 'Close'}</span>
            </button>
          </div>
        </header>

        {/* Global Summary Metrics Strip & System Broadcast Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1">
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Rooms</span>
              <span className="text-base font-display font-bold text-slate-900 font-mono-num">
                {overview?.stats.activeRooms ?? 0}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Battles</span>
              <span className="text-base font-display font-bold text-amber-700 font-mono-num">
                {overview?.stats.liveBattles ?? 0}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Sockets</span>
              <span className="text-base font-display font-bold text-slate-900 font-mono-num">
                {overview?.stats.onlinePlayers ?? 0}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Muted</span>
              <span className="text-base font-display font-bold text-amber-700 font-mono-num">
                {overview?.stats.mutedPlayers ?? 0}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500">Banned</span>
              <span className="text-base font-display font-bold text-rose-700 font-mono-num">
                {overview?.stats.bannedPlayers ?? 0}
              </span>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!announcementText.trim()) return;
              const msg = announcementText.trim();
              void runModAction(
                'global-announce',
                async () => {
                  await sendModeratorAnnouncement(msg, announcementTarget);
                  setAnnouncementText('');
                },
                `System broadcast sent to ${announcementTarget === 'ALL' ? 'all active rooms' : `Room #${announcementTarget}`}.`
              );
            }}
            className="flex items-center gap-2 lg:w-[440px] shrink-0"
          >
            <select
              aria-label="Broadcast Target"
              value={announcementTarget}
              onChange={(e) => setAnnouncementTarget(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Rooms</option>
              {(overview?.rooms ?? []).map((room) => (
                <option key={room.code} value={room.code}>
                  #{room.code}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Send system broadcast message..."
              maxLength={300}
              className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!announcementText.trim() || actionBusy === 'global-announce'}
              className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-yellow-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>
          </form>
        </div>

        {(feedbackBanner || overviewError) && (
          <div
            className={`px-5 py-2 text-xs font-semibold border-b flex items-center justify-between gap-2 shrink-0 ${
              overviewError || feedbackBanner?.kind === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="flex items-center gap-2">
              {overviewError || feedbackBanner?.kind === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{overviewError || feedbackBanner?.text}</span>
            </span>
          </div>
        )}

        {/* Main Workspace: Sidebar Navigation + Viewport */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <nav
            aria-label="Moderator Sections"
            className="md:w-60 shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-3 flex md:flex-col gap-1.5 overflow-x-auto"
          >
            {navItems.map(({ id, label, count, icon: Icon }) => {
              const active = activeNav === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`mod-nav-${id}`}
                  onClick={() => setActiveNav(id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-yellow-300'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </span>
                  <span
                    className={`font-mono-num text-[11px] ${
                      active ? 'text-yellow-200' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <div className="hidden md:block mt-auto pt-3 border-t border-slate-200 px-2 space-y-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Backend State</span>
              </div>
              <p className="leading-snug">
                {overview?.databaseConnected
                  ? 'PostgreSQL + WebSocket server active.'
                  : 'In-memory WebSocket rooms active (PostgreSQL optional via DATABASE_URL).'}
              </p>
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-white flex flex-col">
            {activeNav === 'rooms' && (
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                {/* Rooms List */}
                <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-0 overflow-hidden">
                  <div className="p-3.5 border-b border-slate-200 shrink-0">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        placeholder="Filter rooms by code, host, topic..."
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto drawer-scroll divide-y divide-slate-200">
                    {filteredRooms.length === 0 ? (
                      <div className="p-8 text-center space-y-1.5">
                        <p className="text-sm font-semibold text-slate-800">No active rooms</p>
                        <p className="text-xs text-slate-500">
                          Active multiplayer rooms created over WebSockets will appear here.
                        </p>
                      </div>
                    ) : (
                      filteredRooms.map((room) => {
                        const isSelected = selectedRoom?.code === room.code;
                        return (
                          <button
                            key={room.code}
                            type="button"
                            onClick={() => {
                              setSelectedRoomCode(room.code);
                              setConfirmCloseCode(null);
                              setConfirmEndBattleCode(null);
                            }}
                            className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-display font-bold text-slate-900 truncate flex items-center gap-1.5">
                                {room.isPrivate && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                                <span className="truncate">{room.name}</span>
                              </span>
                              <span className="font-mono-num text-xs font-semibold text-slate-700 shrink-0">
                                {room.members.length}/6
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono font-semibold text-slate-700">#{room.code}</span>
                              <span aria-hidden="true">·</span>
                              <span className="uppercase">{room.mode}</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  room.status === 'playing'
                                    ? 'font-semibold text-amber-700'
                                    : 'text-emerald-700 font-medium'
                                }
                              >
                                {room.status === 'playing' ? 'In Battle' : 'In Lobby'}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500 truncate">
                              Host @{room.host} · {room.topic}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Room Inspector */}
                <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden bg-slate-50/40">
                  {!selectedRoom ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <Shield className="w-10 h-10 text-slate-300 mb-3" />
                      <h2 className="text-sm font-display font-bold text-slate-800">
                        Select a Room Instance
                      </h2>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Inspect active WebSocket room state, kick/mute/ban users, review chat logs
                        and synced quiz decks, or force-close sessions.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Room Header */}
                      <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-slate-800">
                              Room #{selectedRoom.code}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="uppercase">{selectedRoom.mode}</span>
                            <span aria-hidden="true">·</span>
                            <span>{selectedRoom.isPrivate ? 'Private' : 'Public'}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                selectedRoom.status === 'playing'
                                  ? 'font-semibold text-amber-700'
                                  : 'font-semibold text-emerald-700'
                              }
                            >
                              {selectedRoom.status === 'playing' ? 'Battle Active' : 'Lobby Idle'}
                            </span>
                          </div>
                          <h2 className="text-base font-display font-black text-slate-900 truncate mt-0.5">
                            {selectedRoom.name} — {selectedRoom.topic}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {selectedRoom.status === 'playing' && (
                            confirmEndBattleCode === selectedRoom.code ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={actionBusy === `end-${selectedRoom.code}`}
                                  onClick={() =>
                                    void runModAction(
                                      `end-${selectedRoom.code}`,
                                      async () => {
                                        await endModeratorBattle(selectedRoom.code);
                                        setConfirmEndBattleCode(null);
                                      },
                                      `Ended battle in Room #${selectedRoom.code}.`
                                    )
                                  }
                                  className="h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Confirm End Battle
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmEndBattleCode(null)}
                                  className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmCloseCode(null);
                                  setConfirmEndBattleCode(selectedRoom.code);
                                }}
                                className="h-9 px-3.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              >
                                <Square className="w-3.5 h-3.5" />
                                <span>End Battle</span>
                              </button>
                            )
                          )}

                          {confirmCloseCode === selectedRoom.code ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={actionBusy === `close-${selectedRoom.code}`}
                                onClick={() =>
                                  void runModAction(
                                    `close-${selectedRoom.code}`,
                                    async () => {
                                      await closeModeratorRoom(selectedRoom.code);
                                      setConfirmCloseCode(null);
                                    },
                                    `Closed Room #${selectedRoom.code}.`
                                  )
                                }
                                className="h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                Confirm Close Room
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCloseCode(null)}
                                className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmEndBattleCode(null);
                                setConfirmCloseCode(selectedRoom.code);
                              }}
                              className="h-9 px-3.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <DoorClosed className="w-3.5 h-3.5" />
                              <span>Close Room</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sub-tabs inside Room Inspector */}
                      <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setRoomTab('members')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              roomTab === 'members'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Members ({selectedRoom.members.length}/6)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoomTab('chat')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              roomTab === 'chat'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Chat Log ({selectedRoom.messages.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoomTab('deck')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              roomTab === 'deck'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Synced Deck ({selectedRoom.questionCount})
                          </button>
                        </div>
                        <span className="text-xs font-mono-num text-slate-500">
                          Boss HP: {selectedRoom.bossHp}/{selectedRoom.bossMaxHp}
                        </span>
                      </div>

                      {/* Room Inspector Content */}
                      {roomTab === 'members' && (
                        <div className="flex-1 min-h-0 overflow-y-auto drawer-scroll bg-white divide-y divide-slate-200">
                          {selectedRoom.members.map((member) => {
                            const onlineMatch = overview?.onlinePlayers.find(
                              (p) =>
                                p.id === member.id ||
                                p.name.toLowerCase() === member.name.toLowerCase()
                            );
                            const isMuted = Boolean(onlineMatch?.isMuted);
                            const isBanned = Boolean(onlineMatch?.isBanned);
                            return (
                              <div
                                key={member.id}
                                className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-900 truncate">
                                    @{member.name}
                                    {member.isHost ? ' · Host' : ''}
                                    {isMuted ? ' · Muted' : ''}
                                    {isBanned ? ' · Banned' : ''}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono-num mt-0.5">
                                    ID: {member.id} · {member.blockSection} · CP {member.cp} · {member.score} pts · {member.damageDealt} dmg
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runModAction(
                                        `mute-${member.id}`,
                                        async () => {
                                          await setPlayerMuteStatus(member.name, !isMuted, member.id);
                                        },
                                        isMuted
                                          ? `Unmuted @${member.name}.`
                                          : `Muted @${member.name}.`
                                      )
                                    }
                                    className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                      isMuted
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runModAction(
                                        `kick-${member.id}`,
                                        async () => {
                                          await kickModeratorPlayer(
                                            selectedRoom.code,
                                            member.id,
                                            member.name
                                          );
                                        },
                                        `Kicked @${member.name} from Room #${selectedRoom.code}.`
                                      )
                                    }
                                    className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    <span>Kick</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runModAction(
                                        `ban-${member.id}`,
                                        async () => {
                                          await setPlayerBanStatus(member.name, !isBanned, member.id);
                                        },
                                        isBanned
                                          ? `Lifted suspension for @${member.name}.`
                                          : `Banned @${member.name} from multiplayer rooms.`
                                      )
                                    }
                                    className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>{isBanned ? 'Unban' : 'Ban'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {roomTab === 'chat' && (
                        <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
                          <div className="flex-1 min-h-0 overflow-y-auto drawer-scroll p-4 space-y-2.5 bg-slate-50/40">
                            {selectedRoom.messages.length === 0 ? (
                              <div className="py-12 text-center text-xs text-slate-500">
                                No chat messages in Room #{selectedRoom.code} yet.
                              </div>
                            ) : (
                              selectedRoom.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="font-semibold text-slate-900">
                                        {msg.senderId === 'moderator' ? msg.sender : `@${msg.sender}`}
                                      </span>
                                      <span className="text-[11px] font-mono-num text-slate-400">
                                        {msg.timestamp}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {msg.id}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-700 mt-1 break-words leading-relaxed">
                                      {msg.text}
                                    </p>
                                    {msg.attachment && (
                                      <div className="mt-1.5 text-[11px] text-amber-800 font-medium">
                                        Attachment: {msg.attachment.type.toUpperCase()} — {msg.attachment.title}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runModAction(
                                        `delmsg-${msg.id}`,
                                        async () => {
                                          await deleteModeratorMessage(selectedRoom.code, msg.id);
                                        },
                                        `Deleted message ${msg.id}.`
                                      )
                                    }
                                    aria-label={`Delete message from ${msg.sender}`}
                                    title="Delete message"
                                    className="w-8 h-8 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-700 flex items-center justify-center shrink-0 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!roomChatText.trim()) return;
                              const msg = roomChatText.trim();
                              void runModAction(
                                'room-msg',
                                async () => {
                                  await sendModeratorAnnouncement(msg, selectedRoom.code);
                                  setRoomChatText('');
                                },
                                `Sent moderator notice to Room #${selectedRoom.code}.`
                              );
                            }}
                            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
                          >
                            <input
                              type="text"
                              value={roomChatText}
                              onChange={(e) => setRoomChatText(e.target.value)}
                              placeholder={`Post moderator notice to Room #${selectedRoom.code}...`}
                              maxLength={300}
                              className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="submit"
                              disabled={!roomChatText.trim() || actionBusy === 'room-msg'}
                              className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-yellow-300 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Send Notice
                            </button>
                          </form>
                        </div>
                      )}

                      {roomTab === 'deck' && (
                        <div className="flex-1 min-h-0 overflow-y-auto drawer-scroll bg-white p-4 space-y-2.5">
                          {!selectedRoom.deckQuestions?.length ? (
                            <div className="py-12 text-center space-y-1.5">
                              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-xs font-semibold text-slate-700">
                                No custom quiz deck synced to this room yet
                              </p>
                              <p className="text-xs text-slate-500">
                                When the room host syncs a study deck via <code className="font-mono">room:sync_deck</code>, questions appear here.
                              </p>
                            </div>
                          ) : (
                            selectedRoom.deckQuestions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                                  <span>
                                    Q{idx + 1} · {q.questionType} · {q.difficulty}
                                  </span>
                                  <span>{q.conceptTag}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-900">{q.question}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeNav === 'players' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div>
                    <h2 className="text-sm font-display font-bold text-slate-900">
                      Connected WebSocket Clients &amp; Suspensions
                    </h2>
                    <p className="text-xs text-slate-500">
                      Real-time connected socket sessions. Mute chat, kick from rooms, or suspend abusive users.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Filter by username, ID, room..."
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto drawer-scroll">
                  {filteredPlayers.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-500">
                      No active WebSocket player sessions match this filter.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">User / Socket ID</th>
                          <th className="py-2.5 px-4">Section</th>
                          <th className="py-2.5 px-4">Room</th>
                          <th className="py-2.5 px-4">State</th>
                          <th className="py-2.5 px-4 text-right">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {filteredPlayers.map((player) => (
                          <tr key={player.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900">@{player.name}</div>
                              <div className="text-[11px] font-mono text-slate-400">{player.id}</div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{player.blockSection}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-700">
                              {player.roomCode ? `#${player.roomCode}` : 'Lobby'}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={
                                  player.isBanned
                                    ? 'font-semibold text-rose-700'
                                    : player.isMuted
                                      ? 'font-semibold text-amber-700'
                                      : 'font-medium text-emerald-700'
                                }
                              >
                                {player.isBanned ? 'Banned' : player.isMuted ? 'Muted' : 'Active'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void runModAction(
                                      `pmute-${player.id}`,
                                      async () => {
                                        await setPlayerMuteStatus(
                                          player.name,
                                          !player.isMuted,
                                          player.id
                                        );
                                      },
                                      player.isMuted
                                        ? `Unmuted @${player.name}.`
                                        : `Muted @${player.name}.`
                                    )
                                  }
                                  className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  {player.isMuted ? 'Unmute' : 'Mute'}
                                </button>
                                {player.roomCode && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runModAction(
                                        `pkick-${player.id}`,
                                        async () => {
                                          await kickModeratorPlayer(
                                            player.roomCode!,
                                            player.id,
                                            player.name
                                          );
                                        },
                                        `Kicked @${player.name} from Room #${player.roomCode}.`
                                      )
                                    }
                                    className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                  >
                                    Kick
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    void runModAction(
                                      `pban-${player.id}`,
                                      async () => {
                                        await setPlayerBanStatus(
                                          player.name,
                                          !player.isBanned,
                                          player.id
                                        );
                                      },
                                      player.isBanned
                                        ? `Unbanned @${player.name}.`
                                        : `Banned @${player.name} from rooms.`
                                    )
                                  }
                                  className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  {player.isBanned ? 'Unban' : 'Ban'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {(overview?.bannedPlayers.length ?? 0) > 0 && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2">
                      <h3 className="text-xs font-display font-bold text-slate-800">
                        Active Bans ({overview?.bannedPlayers.length})
                      </h3>
                      <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
                        {overview?.bannedPlayers.map((ban) => (
                          <div
                            key={ban.key}
                            className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">@{ban.username}</span>
                              <span className="text-slate-500 ml-2">
                                {ban.reason || 'Suspended'} · by {ban.bannedBy}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void runModAction(
                                  `unban-${ban.key}`,
                                  async () => {
                                    await setPlayerBanStatus(ban.username, false, ban.playerId);
                                  },
                                  `Unbanned @${ban.username}.`
                                )
                              }
                              className="h-7 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Lift Ban</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeNav === 'accounts' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div>
                    <h2 className="text-sm font-display font-bold text-slate-900">
                      Registered User Accounts (PostgreSQL)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Inspect accounts, suspend/unsuspend room access, reset XP counters, or delete accounts.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      placeholder="Search username or section..."
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto drawer-scroll">
                  {!overview?.databaseConnected ? (
                    <div className="p-10 text-center max-w-md mx-auto space-y-2">
                      <Database className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-800">
                        PostgreSQL Not Connected
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Set <code className="font-mono">DATABASE_URL</code> in <code className="font-mono">.env</code> to manage persisted user accounts, XP totals, and battle records.
                      </p>
                    </div>
                  ) : filteredAccounts.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-500">
                      No user accounts match this search filter.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Username</th>
                          <th className="py-2.5 px-4">Section</th>
                          <th className="py-2.5 px-4 text-right">XP</th>
                          <th className="py-2.5 px-4 text-right">Quizzes</th>
                          <th className="py-2.5 px-4 text-right">Wins</th>
                          <th className="py-2.5 px-4 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {filteredAccounts.map((acc) => (
                          <tr key={acc.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900">
                                @{acc.username}
                                {acc.isBanned ? ' · Banned' : ''}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{acc.id}</div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{acc.blockSection}</td>
                            <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-slate-900">
                              {acc.totalXp.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-slate-700">
                              {acc.quizzesCompleted}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-slate-700">
                              {acc.battleWins}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void runModAction(
                                      `accban-${acc.id}`,
                                      async () => {
                                        await setPlayerBanStatus(acc.username, !acc.isBanned);
                                      },
                                      acc.isBanned
                                        ? `Unbanned @${acc.username}.`
                                        : `Banned @${acc.username}.`
                                    )
                                  }
                                  className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  {acc.isBanned ? 'Unban' : 'Ban'}
                                </button>

                                {confirmResetAccountId === acc.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void runModAction(
                                          `reset-${acc.id}`,
                                          async () => {
                                            await updateRegisteredAccount(acc.id, {
                                              resetProgress: true,
                                            });
                                            setConfirmResetAccountId(null);
                                          },
                                          `Reset XP/stats for @${acc.username}.`
                                        )
                                      }
                                      className="h-8 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                    >
                                      Confirm Reset
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmResetAccountId(null)}
                                      className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-700 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteAccountId(null);
                                      setConfirmResetAccountId(acc.id);
                                    }}
                                    className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset XP</span>
                                  </button>
                                )}

                                {confirmDeleteAccountId === acc.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void runModAction(
                                          `delacc-${acc.id}`,
                                          async () => {
                                            await deleteRegisteredAccount(acc.id);
                                            setConfirmDeleteAccountId(null);
                                          },
                                          `Deleted account @${acc.username}.`
                                        )
                                      }
                                      className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteAccountId(null)}
                                      className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-700 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmResetAccountId(null);
                                      setConfirmDeleteAccountId(acc.id);
                                    }}
                                    className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeNav === 'system' && (
              <div className="flex-1 min-h-0 overflow-auto drawer-scroll p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-display font-bold text-slate-900">
                    Server Runtime &amp; Service Configuration
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live backend state reported directly by the Express &amp; WebSocket server process.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs text-slate-500">Server Uptime</div>
                    <div className="text-lg font-display font-bold text-slate-900 font-mono-num">
                      {overview ? formatUptime(overview.systemHealth.uptimeSec) : '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs text-slate-500">Open WebSockets (/ws)</div>
                    <div className="text-lg font-display font-bold text-slate-900 font-mono-num">
                      {overview?.systemHealth.wsConnections ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs text-slate-500">Node.js Runtime</div>
                    <div className="text-lg font-display font-bold text-slate-900 font-mono-num">
                      {overview?.systemHealth.nodeVersion ?? '—'} · {overview?.systemHealth.environment ?? '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs text-slate-500">PostgreSQL Pool</div>
                    <div
                      className={`text-sm font-semibold ${
                        overview?.systemHealth.databaseConnected ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {overview?.systemHealth.databaseConnected
                        ? 'Connected (accounts & rewards enabled)'
                        : 'Not configured (in-memory room mode)'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs text-slate-500">Gemini Quiz Generator API</div>
                    <div
                      className={`text-sm font-semibold ${
                        overview?.systemHealth.geminiConfigured ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {overview?.systemHealth.geminiConfigured
                        ? 'Configured (GEMINI_API_KEY active)'
                        : 'Missing GEMINI_API_KEY'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs text-slate-500">Passcode Mode</div>
                    <div className="text-sm font-semibold text-slate-800">
                      {config?.usingDevFallback
                        ? 'Development fallback active'
                        : 'Custom MODERATOR_PASSCODE active'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'logs' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 shrink-0">
                  <h2 className="text-sm font-display font-bold text-slate-900">
                    Moderation Audit Log
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological trail of all moderator and administrative actions executed in this runtime session.
                  </p>
                </div>

                <div className="flex-1 min-h-0 overflow-auto drawer-scroll">
                  {(overview?.moderationLogs.length ?? 0) === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-500">
                      No moderation actions recorded yet in this session.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Time</th>
                          <th className="py-2.5 px-4">Moderator</th>
                          <th className="py-2.5 px-4">Action</th>
                          <th className="py-2.5 px-4">Target</th>
                          <th className="py-2.5 px-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {overview?.moderationLogs.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono-num text-slate-500 whitespace-nowrap">
                              {formatLogTime(entry.timestamp)}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {entry.actor}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                              {ACTION_LABELS[entry.action]}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                              {entry.target}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{entry.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
