import React, { useState } from 'react';
import { ClassmateMember, HEROES, HeroId, QuizDeck, GameMode } from '../game/rules';
import {
  Users,
  Plus,
  Check,
  X,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react';

export interface AvailableRoomItem {
  code: string;
  name: string;
  host: string;
  topic: string;
  isPrivate: boolean;
  mode?: GameMode;
  memberCount?: number;
  members: ClassmateMember[];
}

export interface OnlinePlayerSummary {
  id: string;
  name: string;
  blockSection: string;
  heroId: HeroId;
  roomCode: string | null;
}

interface ClassmateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  isJoinedInRoom?: boolean;
  localPlayerId?: string;
  availableRooms?: AvailableRoomItem[];
  onlinePlayers?: OnlinePlayerSummary[];
  joinError?: string | null;
  onClearJoinError?: () => void;
  onLeaveRoom?: () => void;
  onCreateRoom: (roomName: string, password?: string) => void;
  onJoinRoomCode: (code: string, password?: string) => void;
  classmates: ClassmateMember[];
  onInvitePlayer: (username: string) => void;
  activeDeck: QuizDeck;
  onSyncDeckToRoom: () => void;
  onStartQuizTogether: (mode: GameMode) => void;
}

const MAX_ROOM_LIMIT = 6;

export const ClassmateRoomModal: React.FC<ClassmateRoomModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  isJoinedInRoom = false,
  localPlayerId = 'local-player',
  availableRooms = [],
  onlinePlayers = [],
  joinError = null,
  onClearJoinError,
  onLeaveRoom,
  onCreateRoom,
  onJoinRoomCode,
  classmates,
  onInvitePlayer,
  activeDeck,
  onSyncDeckToRoom,
}) => {
  const [unlockingRoomCode, setUnlockingRoomCode] = useState<string | null>(null);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Create new room state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Direct room code join state
  const [directCodeInput, setDirectCodeInput] = useState('');
  const [directPasswordInput, setDirectPasswordInput] = useState('');

  // Invite real player by username
  const [inviteUsernameInput, setInviteUsernameInput] = useState('');

  if (!isOpen) return null;

  const isCurrentRoomFull = classmates.length >= MAX_ROOM_LIMIT;
  const otherOnlinePlayers = onlinePlayers.filter((p) => p.id !== localPlayerId);

  const handleSelectJoinRoom = (room: AvailableRoomItem) => {
    onClearJoinError?.();
    setLocalError(null);
    const isAlreadyInThisRoom = isJoinedInRoom && room.code === roomCode;
    const memberCount = room.memberCount ?? room.members.length;
    if (memberCount >= MAX_ROOM_LIMIT && !isAlreadyInThisRoom) {
      return;
    }

    if (room.isPrivate && !isAlreadyInThisRoom) {
      setUnlockingRoomCode(room.code);
      setPasswordAttempt('');
      return;
    }

    onJoinRoomCode(room.code);
    setUnlockingRoomCode(null);
  };

  const handleConfirmPrivateJoin = (e: React.FormEvent, room: AvailableRoomItem) => {
    e.preventDefault();
    if (!passwordAttempt.trim()) {
      setLocalError('Please enter the room password.');
      return;
    }
    setLocalError(null);
    onJoinRoomCode(room.code, passwordAttempt.trim());
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onClearJoinError?.();
    setLocalError(null);
    onCreateRoom(newRoomName.trim(), newRoomPassword.trim() || undefined);
    setNewRoomName('');
    setNewRoomPassword('');
    setIsCreatingRoom(false);
  };

  const handleDirectCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = directCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 3) {
      setLocalError('Enter a valid Room Code (at least 3 characters).');
      return;
    }
    setLocalError(null);
    onClearJoinError?.();
    onJoinRoomCode(cleaned, directPasswordInput.trim() || undefined);
    setDirectCodeInput('');
    setDirectPasswordInput('');
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inviteUsernameInput.trim().replace(/^@/, '');
    if (!cleaned) return;
    onInvitePlayer(cleaned);
    setInviteUsernameInput('');
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-drawer-title"
    >
      {/* Pop-Up Container with Clear Visual Hierarchy */}
      <div className="w-full max-w-2xl rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* LEVEL 0: High-Contrast Dark Header Bar Explaining Window Purpose */}
        <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold text-yellow-300 uppercase tracking-wider">
                Live Multiplayer Server · {onlinePlayers.length} Player{onlinePlayers.length === 1 ? '' : 's'} Online
              </div>
              <h2 id="room-drawer-title" className="text-lg sm:text-xl font-display font-black text-white leading-tight">
                Room Directory &amp; Squad Setup
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Secondary Action: Toggle Create Room Form */}
            <button
              type="button"
              onClick={() => setIsCreatingRoom((prev) => !prev)}
              className={`py-2 px-3.5 rounded-xl font-display font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isCreatingRoom
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  : 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 shadow-sm hover:-translate-y-0.5'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingRoom ? 'Cancel' : 'Create Room'}</span>
            </button>

            {/* Tertiary Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Room"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Pop-Up Body with Numbered Hierarchical Sections */}
        <div className="p-5 sm:p-6 overflow-y-auto drawer-scroll space-y-5">
          {(joinError || localError) && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center justify-between">
              <span>{joinError || localError}</span>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  onClearJoinError?.();
                }}
                className="text-rose-500 hover:text-rose-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OPTIONAL CREATE ROOM PANEL */}
          {isCreatingRoom && (
            <form
              onSubmit={handleCreateRoomSubmit}
              className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <div>
                  <h3 className="text-xs font-display font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Create New Live Room (Up to 6 Real Players)</span>
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Host a public room or set a password for private squad access.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. BSCS-3A Study Squad"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Password (Optional for Private Room)
                  </label>
                  <input
                    type="password"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    placeholder="Leave blank for Public Room"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-600">
                  {newRoomPassword.trim()
                    ? 'Private Room · Password required to join'
                    : 'Public Room · Visible to all online players'}
                </span>
                {/* Primary CTA inside Create Form */}
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Create &amp; Join Room
                </button>
              </div>
            </form>
          )}

          {/* =================================================================
              SECTION 01: LIVE AVAILABLE ROOMS TO JOIN
             ================================================================= */}
          <section className="space-y-3">
            <div className="flex items-end justify-between border-b border-slate-200 pb-2">
              <div>
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  SECTION 01 · BROWSE &amp; JOIN
                </div>
                <h3 className="text-sm font-display font-black text-slate-900">
                  Available Live Rooms ({availableRooms.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Join an existing room created by a classmate or enter a room code directly below.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">
                Max {MAX_ROOM_LIMIT} Players / Room
              </span>
            </div>

            {availableRooms.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                <div className="text-xs font-display font-black text-slate-800">
                  No Active Rooms Created Yet
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click <strong>Create Room</strong> at the top-right or enter a room code below to start a real-time room with your classmates.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {availableRooms.map((room) => {
                  const isJoined = isJoinedInRoom && room.code === roomCode;
                  const count = isJoined
                    ? classmates.length
                    : Math.min(MAX_ROOM_LIMIT, room.memberCount ?? room.members.length);
                  const isFull = count >= MAX_ROOM_LIMIT && !isJoined;
                  const isUnlocking = unlockingRoomCode === room.code;

                  return (
                    <div
                      key={room.code}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isJoined
                          ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-black text-sm text-slate-900 truncate">
                              {room.name}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-amber-700">
                              #{room.code}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            {room.isPrivate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-700">
                                <Lock className="w-3 h-3" /> Private
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600">
                                <Unlock className="w-3 h-3" /> Public
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 font-mono mt-0.5 truncate">
                            Host: @{room.host} · Topic:{' '}
                            <span className="font-semibold text-slate-800">{room.topic}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-mono font-bold tabular-nums ${
                              count >= MAX_ROOM_LIMIT ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {count}/{MAX_ROOM_LIMIT}
                          </span>

                          {isJoined ? (
                            <div className="flex items-center gap-1.5">
                              <span className="py-1.5 px-3 rounded-xl bg-slate-900 text-yellow-300 font-display font-extrabold text-xs flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Active</span>
                              </span>
                              {onLeaveRoom && (
                                <button
                                  type="button"
                                  data-testid="leave-room-btn"
                                  onClick={onLeaveRoom}
                                  className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-display font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>Leave</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-testid={`join-room-${room.code}`}
                              disabled={isFull}
                              onClick={() => handleSelectJoinRoom(room)}
                              className="py-2 px-4 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-display font-black text-xs shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer"
                            >
                              {isFull ? 'FULL' : room.isPrivate ? 'Unlock & Join' : 'Join Room'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Password Input if Private Room is Selected */}
                      {isUnlocking && (
                        <form
                          onSubmit={(e) => handleConfirmPrivateJoin(e, room)}
                          className="mt-3 pt-2.5 border-t border-slate-200 flex items-center gap-2"
                        >
                          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                          <input
                            type="password"
                            value={passwordAttempt}
                            onChange={(e) => setPasswordAttempt(e.target.value)}
                            placeholder={`Enter password for ${room.name}...`}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="submit"
                            className="py-1.5 px-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-display font-extrabold text-xs cursor-pointer"
                          >
                            Confirm Join
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Join by Room Code */}
            <form
              onSubmit={handleDirectCodeSubmit}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2"
            >
              <input
                type="text"
                value={directCodeInput}
                onChange={(e) => setDirectCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter Room Code (e.g. CS3A99)..."
                aria-label="Direct Room Code"
                className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <input
                type="password"
                value={directPasswordInput}
                onChange={(e) => setDirectPasswordInput(e.target.value)}
                placeholder="Password (if private)"
                aria-label="Direct Room Password"
                className="w-36 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                data-testid="direct-join-room-btn"
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-xs whitespace-nowrap transition-colors cursor-pointer"
              >
                Join by Code
              </button>
            </form>
          </section>

          {/* =================================================================
              SECTION 02: CURRENT ROOM SQUAD & REAL-TIME INVITATIONS
             ================================================================= */}
          <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  SECTION 02 · ACTIVE SQUAD ROSTER
                </div>
                <h3 className="text-sm font-display font-black text-slate-900">
                  {isJoinedInRoom
                    ? `Room #${roomCode} Squad (${classmates.length}/${MAX_ROOM_LIMIT})`
                    : 'Not Currently in a Room'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isJoinedInRoom
                    ? 'Connected players in your room stand beside your character in the 3D lobby.'
                    : 'Join or create a room above so real players can stand beside you and chat.'}
                </p>
              </div>

              {isJoinedInRoom && (
                <button
                  type="button"
                  onClick={onSyncDeckToRoom}
                  className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-display font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Broadcast your active study deck to everyone in this room"
                >
                  <RefreshCw className="w-3 h-3 text-amber-600" />
                  <span>Sync Topic</span>
                </button>
              )}
            </div>

            {isJoinedInRoom ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {classmates.slice(0, MAX_ROOM_LIMIT).map((peer, idx) => {
                  const isYou = peer.id === localPlayerId || peer.id === 'local-player';
                  const heroName = HEROES.find((h) => h.id === peer.heroId)?.name || 'Guardian';
                  return (
                    <div
                      key={peer.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        isYou
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display font-extrabold text-xs text-slate-900 truncate">
                          @{peer.name} {isYou ? '(You)' : ''}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          Slot #{idx + 1} · {peer.blockSection} · {heroName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono py-1">
                Solo Mode · Join any room above to activate live 3D squad &amp; room chat.
              </div>
            )}

            {/* Live Online Players & Direct Username Invite */}
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-display font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Invite Real Online Players ({otherOnlinePlayers.length} Other Online)</span>
                </span>
              </div>

              {otherOnlinePlayers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {otherOnlinePlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onInvitePlayer(p.name)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-50 border border-slate-300 text-xs font-display font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3 text-amber-600" />
                      <span>Invite @{p.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={isCurrentRoomFull}
                  value={inviteUsernameInput}
                  onChange={(e) => setInviteUsernameInput(e.target.value)}
                  placeholder={
                    isCurrentRoomFull
                      ? 'Room is at maximum capacity (6/6 players)'
                      : 'Send live invite to player username (@username)...'
                  }
                  aria-label="Invite Player Username"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isCurrentRoomFull}
                  className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-display font-extrabold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Send Live Invite</span>
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
