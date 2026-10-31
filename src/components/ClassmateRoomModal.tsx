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
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [directCodeInput, setDirectCodeInput] = useState('');
  const [directPasswordInput, setDirectPasswordInput] = useState('');
  const [inviteUsernameInput, setInviteUsernameInput] = useState('');

  if (!isOpen) return null;

  const otherOnlinePlayers = onlinePlayers.filter((player) => player.id !== localPlayerId);
  const displayedError = joinError || localError;

  const handleSelectJoinRoom = (room: AvailableRoomItem) => {
    onClearJoinError?.();
    setLocalError(null);
    const alreadyJoined = isJoinedInRoom && room.code === roomCode;
    const count = room.memberCount ?? room.members.length;
    if (count >= MAX_ROOM_LIMIT && !alreadyJoined) return;
    if (room.isPrivate && !alreadyJoined) {
      setUnlockingRoomCode(room.code);
      setPasswordAttempt('');
      return;
    }
    onJoinRoomCode(room.code);
    setUnlockingRoomCode(null);
  };

  const handleCreateRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newRoomName.trim()) {
      setLocalError('Please enter a room name.');
      return;
    }
    setLocalError(null);
    onClearJoinError?.();
    onCreateRoom(newRoomName.trim(), newRoomPassword.trim() || undefined);
    setNewRoomName('');
    setNewRoomPassword('');
  };

  const handleDirectJoin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!directCodeInput.trim()) {
      setLocalError('Enter a room code.');
      return;
    }
    setLocalError(null);
    onClearJoinError?.();
    onJoinRoomCode(directCodeInput.trim().toUpperCase(), directPasswordInput.trim() || undefined);
  };

  const handleInvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteUsernameInput.trim()) return;
    onInvitePlayer(inviteUsernameInput.trim());
    setInviteUsernameInput('');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="flex h-[82vh] max-h-[760px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,0.35)] select-text">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-300">
                Multiplayer Rooms · {availableRooms.length} Available
              </p>
              <h2 className="text-lg font-display font-black leading-tight sm:text-xl">Room Directory · Join &amp; Create</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white" aria-label="Close Room Directory">
            <X size={18} />
          </button>
        </div>

        {displayedError && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-2 text-xs font-bold text-red-700">
            <span>{displayedError}</span>
            <button onClick={() => { setLocalError(null); onClearJoinError?.(); }}><X size={14} /></button>
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.7fr)_340px] lg:overflow-hidden">
          <section className="min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-5">
            <form onSubmit={handleDirectJoin} className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                <KeyRound size={17} className="text-amber-500" />
                JOIN WITH ROOM CODE
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                <input value={directCodeInput} onChange={(e) => setDirectCodeInput(e.target.value.toUpperCase())} placeholder="ROOM CODE" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black uppercase outline-none focus:border-amber-500" />
                <input value={directPasswordInput} onChange={(e) => setDirectPasswordInput(e.target.value)} placeholder="Password" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-amber-500" />
                <button className="h-11 cursor-pointer rounded-lg bg-slate-900 px-5 text-xs font-black text-yellow-300 transition hover:bg-slate-800">JOIN</button>
              </div>
            </form>

            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Discover</p>
                <h3 className="text-lg font-black text-slate-900">Available rooms</h3>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">{availableRooms.length} rooms</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {availableRooms.map((room) => {
                const memberCount = room.memberCount ?? room.members.length;
                const current = isJoinedInRoom && room.code === roomCode;
                const full = memberCount >= MAX_ROOM_LIMIT && !current;
                return (
                  <article key={room.code} className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition ${current ? 'border-amber-400' : 'border-slate-200 hover:border-amber-300'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-black text-slate-900">{room.name}</h4>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">{room.topic || 'General Study'} · Host: {room.host}</p>
                      </div>
                      {room.isPrivate ? <Lock size={18} className="text-slate-700" /> : <Unlock size={18} className="text-amber-500" />}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1 text-xs font-black text-slate-600"><Users size={14} /> {memberCount}/{MAX_ROOM_LIMIT}</span>
                      <button disabled={full && !current} onClick={() => handleSelectJoinRoom(room)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">
                        {current ? 'JOINED' : full ? 'FULL' : room.isPrivate ? 'UNLOCK' : 'JOIN'}
                      </button>
                    </div>
                    {unlockingRoomCode === room.code && (
                      <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-2">
                        <input type="password" autoFocus value={passwordAttempt} onChange={(e) => setPasswordAttempt(e.target.value)} placeholder="Room password" className="min-w-0 flex-1 rounded-lg border border-amber-300 px-2 text-xs font-bold outline-none" />
                        <button onClick={() => onJoinRoomCode(room.code, passwordAttempt)} className="rounded-lg bg-amber-400 px-3 text-xs font-black"><Check size={14} /></button>
                      </div>
                    )}
                  </article>
                );
              })}
              {!availableRooms.length && (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-400 md:col-span-2">
                  No public rooms yet. Create the first room.
                </div>
              )}
            </div>
          </section>

          <aside className="border-l border-slate-200 bg-slate-50/60 p-4 lg:overflow-y-auto sm:p-5">
            <form onSubmit={handleCreateRoom} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">Create / Add</p>
                  <div className="mt-0.5 flex items-center gap-2 text-sm font-display font-black text-slate-900"><Plus size={17} className="text-amber-500" /> NEW ROOM</div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-yellow-400"><Sparkles size={16} /></div>
              </div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">Room Name *</label>
              <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Study Squad" className="mb-3 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-amber-500" />
              <label className="mb-1 block text-[10px] font-bold text-slate-700">Password <span className="font-normal">(optional)</span></label>
              <input value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)} placeholder="Leave blank for public" className="mb-3 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-amber-500" />
              <button className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-xs font-display font-black text-slate-950 shadow-md transition hover:from-yellow-200 hover:to-amber-400"><Plus size={16} /> CREATE ROOM</button>
            </form>

            <form onSubmit={handleInvite} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><UserPlus size={17} className="text-amber-500" /> INVITE PLAYER</div>
              <div className="flex gap-2">
                <input value={inviteUsernameInput} onChange={(e) => setInviteUsernameInput(e.target.value)} placeholder="Username" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-amber-400" />
                <button className="h-10 cursor-pointer rounded-lg bg-slate-900 px-3 text-xs font-black text-yellow-300">INVITE</button>
              </div>
            </form>

            {isJoinedInRoom && (
              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active room</p>
                    <p className="font-black text-slate-900">{roomCode}</p>
                  </div>
                  <ShieldCheck size={22} className="text-amber-500" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-500">Deck: {activeDeck.title}</p>
                <button onClick={onSyncDeckToRoom} className="mt-3 h-9 w-full rounded-xl border-2 border-slate-900 text-xs font-black text-slate-900">SYNC DECK</button>
                <button onClick={onLeaveRoom} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-red-50 text-xs font-black text-red-600"><LogOut size={14} /> LEAVE ROOM</button>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Online now</p>
              <div className="space-y-2">
                {otherOnlinePlayers.slice(0, 6).map((player) => (
                  <div key={player.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-xs font-black text-slate-800">{player.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{player.blockSection}</p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${player.roomCode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                ))}
                {!otherOnlinePlayers.length && <p className="rounded-xl bg-slate-50 py-4 text-center text-xs font-bold text-slate-400">No other players online</p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
