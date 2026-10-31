import React, { useEffect, useRef, useState } from 'react';
import {
  BATTLE_MODES,
  ClassmateMember,
  GameMode,
  HEROES,
  HeroId,
  QuizDeck,
} from '../game/rules';
import { ProfileCharacter3D } from './ProfileCharacter3D';
import { OnlinePlayerSummary } from './ClassmateRoomModal';
import {
  Volume2,
  VolumeX,
  UserCheck,
  UserPlus,
  Bell,
  Check,
  X,
  Send,
  Settings,
  LogIn,
  LogOut,
  Shirt,
  FolderOpen,
  Trophy,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Image as ImageIcon,
  Film,
  Link2,
  FileText,
  BookOpen,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  Palette,
  User,
  Globe,
  MessageCircle,
  ChevronRight,
  Swords,
  Download,
  Maximize2,
} from 'lucide-react';

export interface BattleInvitation {
  id: string;
  username: string;
  blockSection: string;
  roomCode?: string;
  mode: GameMode;
  deckTitle?: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted';
  timestamp: string;
}

export type ChatAttachmentType = 'photo' | 'video' | 'link' | 'pdf' | 'notes';

export interface LobbyChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  text: string;
  timestamp: string;
  attachment?: {
    type: ChatAttachmentType;
    title: string;
    url?: string;
    subtitle?: string;
  };
}

interface LobbyOverlayProps {
  studentName: string;
  blockSection: string;
  isLoggedIn: boolean;
  localPlayerId?: string;
  onLoginStudent: (name: string, block: string) => void;
  onRegisterStudent: (name: string, block: string) => void;
  onLogoutStudent: () => void;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  activeDeck: QuizDeck;
  hasCustomNotes: boolean;
  onOpenInventoryModal: (startBattleAfter?: boolean) => void;
  onOpenRoomModal: () => void;
  onStartBattle: () => void;
  roomCode: string;
  isJoinedInRoom?: boolean;
  classmates: ClassmateMember[];
  onlinePlayers?: OnlinePlayerSummary[];
  chatMessages?: LobbyChatMessage[];
  onSendChatMessage?: (text: string, attachment?: LobbyChatMessage['attachment']) => void;
  invitations: BattleInvitation[];
  onSendInviteUsername: (username: string, mode: GameMode) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDismissInvite: (inviteId: string) => void;
  onOpenCustomizer: () => void;
  selectedHero?: HeroId;
  onSelectHero?: (heroId: HeroId) => void;
  characterGender?: 'male' | 'female' | 'neutral';
  onChangeCharacterGender?: (gender: 'male' | 'female' | 'neutral') => void;
  outfitStyle?: string;
  onChangeOutfitStyle?: (style: string) => void;
  accentColor?: string;
  onChangeAccentColor?: (color: string) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const MAX_ROOM_PLAYERS = 6;

const OUTFIT_PRESETS = [
  {
    id: 'cozy',
    name: 'Cozy Knit',
    fullName: 'Cozy Knit Turtleneck (Study Lobby)',
    topFill: '#5c4033',
    trimFill: '#4a3228',
    pantsFill: '#1e293b',
    shoeFill: '#facc15',
    badgeClass: 'from-amber-700 to-amber-900',
  },
  {
    id: 'instinct',
    name: 'Instinct Jacket',
    fullName: 'Team Instinct (Yellow Sporty Jacket)',
    topFill: '#facc15',
    trimFill: '#0f172a',
    pantsFill: '#1e293b',
    shoeFill: '#facc15',
    badgeClass: 'from-yellow-300 to-amber-500',
  },
  {
    id: 'mystic',
    name: 'Mystic Coat',
    fullName: 'Team Mystic (Blue Long Coat)',
    topFill: '#2563eb',
    trimFill: '#93c5fd',
    pantsFill: '#0f172a',
    shoeFill: '#3b82f6',
    badgeClass: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'valor',
    name: 'Valor Trench',
    fullName: 'Team Valor (Crimson & White Trench)',
    topFill: '#e11d48',
    trimFill: '#f8fafc',
    pantsFill: '#18181b',
    shoeFill: '#f43f5e',
    badgeClass: 'from-rose-500 to-red-600',
  },
  {
    id: 'shinobi',
    name: 'Shinobi Gi',
    fullName: 'Cyber Shinobi Tactical Gi',
    topFill: '#1e293b',
    trimFill: '#facc15',
    pantsFill: '#090d16',
    shoeFill: '#eab308',
    badgeClass: 'from-slate-700 to-slate-900',
  },
];

const ACCENT_PRESETS = [
  { id: 'amber', hex: '#facc15', name: 'Logo Yellow' },
  { id: 'cyan', hex: '#06b6d4', name: 'Cyan Glow' },
  { id: 'emerald', hex: '#10b981', name: 'Emerald' },
  { id: 'rose', hex: '#f43f5e', name: 'Valor Rose' },
  { id: 'violet', hex: '#8b5cf6', name: 'Mystic Violet' },
];

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  studentName,
  blockSection,
  isLoggedIn,
  localPlayerId = 'local-player',
  onLoginStudent,
  onRegisterStudent,
  onLogoutStudent,
  selectedMode,
  onSelectMode,
  activeDeck,
  hasCustomNotes,
  onOpenInventoryModal,
  onOpenRoomModal,
  onStartBattle,
  roomCode,
  isJoinedInRoom = false,
  classmates,
  onlinePlayers = [],
  chatMessages = [],
  onSendChatMessage,
  invitations,
  onSendInviteUsername,
  onAcceptInvite,
  onDismissInvite,
  selectedHero = 'shadow_shinobi',
  onSelectHero,
  characterGender = 'neutral',
  onChangeCharacterGender,
  outfitStyle = 'cozy',
  onChangeOutfitStyle,
  accentColor = 'amber',
  onChangeAccentColor,
  muted,
  onToggleMute,
}) => {
  const [authModalMode, setAuthModalMode] = useState<'closed' | 'profile' | 'login' | 'register'>('closed');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<'live' | 'room' | 'gh' | 'social' | null>(null);

  const [draftName, setDraftName] = useState(studentName);
  const [draftBlock, setDraftBlock] = useState(blockSection);
  const [draftPassword, setDraftPassword] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Friends List (Synced with real online players + user-added friends)
  const [customFriends, setCustomFriends] = useState<
    { id: string; name: string; block: string; level: number }[]
  >([]);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [friendToast, setFriendToast] = useState<string | null>(null);

  const liveSharedUrl =
    typeof window !== 'undefined' && !window.location.origin.includes('localhost')
      ? window.location.origin + window.location.pathname
      : 'https://ais-pre-uj7ndjye4xip46hgbwljpl-907503175078.asia-southeast1.run.app';
  const roomInviteUrl = `${liveSharedUrl.replace(/\/$/, '')}/?room=${roomCode}`;
  const githubPagesTemplateUrl = `https://<your-github-username>.github.io/eduquests/?room=${roomCode}`;

  const handleCopyText = (text: string, key: 'live' | 'room' | 'gh' | 'social') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newFriendInput.trim().replace(/^@/, '');
    if (!cleaned) return;
    if (!customFriends.some((f) => f.name.toLowerCase() === cleaned.toLowerCase())) {
      setCustomFriends((prev) => [
        {
          id: `fr-${Date.now()}`,
          name: cleaned,
          block: blockSection || 'BSCS-3A',
          level: 40,
        },
        ...prev,
      ]);
    }
    setNewFriendInput('');
    setFriendToast(`Added @${cleaned} to your Friends list!`);
    setTimeout(() => setFriendToast(null), 2200);
  };

  // Combine real online players (excluding self) + user-added friends
  const combinedFriends = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; block: string; level: number; status: string; isOnline: boolean }
    >();

    for (const online of onlinePlayers) {
      if (online.id === localPlayerId) continue;
      map.set(online.name.toLowerCase(), {
        id: online.id,
        name: online.name,
        block: online.blockSection,
        level: 40,
        status: online.roomCode ? `Online · In Room #${online.roomCode}` : 'Online · In Lobby',
        isOnline: true,
      });
    }

    for (const cf of customFriends) {
      const key = cf.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: cf.id,
          name: cf.name,
          block: cf.block,
          level: cf.level,
          status: 'Added Friend · Tap Invite to play',
          isOnline: false,
        });
      }
    }

    return Array.from(map.values());
  }, [onlinePlayers, localPlayerId, customFriends]);

  const activeHeroObj = HEROES.find((h) => h.id === selectedHero) ?? HEROES[0];
  const activeOutfitObj = OUTFIT_PRESETS.find((o) => o.id === outfitStyle) ?? OUTFIT_PRESETS[0];
  const activeAccentObj = ACCENT_PRESETS.find((a) => a.id === accentColor) ?? ACCENT_PRESETS[0];

  // Room Chat & Real Webcam / Mic State
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [expandedVideoPeerId, setExpandedVideoPeerId] = useState<string | null>(null);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>('');
  const [activeAttachMenu, setActiveAttachMenu] = useState<ChatAttachmentType | null>(null);
  const [attachUrlInput, setAttachUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFileType, setPendingFileType] = useState<ChatAttachmentType>('photo');
  const [expandedAttachment, setExpandedAttachment] = useState<LobbyChatMessage['attachment'] | null>(null);

  // Microphone remains muted on lobby/room entry and only starts after the user enables it.
  useEffect(() => {
    if (!micEnabled) {
      microphoneStreamRef.current?.getAudioTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      return;
    }

    let cancelled = false;
    let requestedStream: MediaStream | null = null;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          requestedStream = stream;
          microphoneStreamRef.current = stream;
          setMediaPermissionError(null);
        })
        .catch((error: DOMException) => {
          setMicEnabled(false);
          setMediaPermissionError(
            error?.name === 'NotAllowedError'
              ? 'Microphone access was denied. Allow it in browser settings.'
              : 'Microphone is unavailable on this device.'
          );
        });
    } else {
      setMicEnabled(false);
      setMediaPermissionError('This browser does not support microphone access.');
    }

    return () => {
      cancelled = true;
      requestedStream?.getTracks().forEach((track) => track.stop());
      if (microphoneStreamRef.current === requestedStream) {
        microphoneStreamRef.current = null;
      }
    };
  }, [micEnabled]);

  // Manage real webcam stream when videoEnabled is toggled
  useEffect(() => {
    if (!videoEnabled) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setLocalMediaStream(null);
      return;
    }

    let cancelled = false;
    let requestedStream: MediaStream | null = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          requestedStream = stream;
          cameraStreamRef.current = stream;
          setLocalMediaStream(stream);
          setMediaPermissionError(null);
        })
        .catch((error: DOMException) => {
          setVideoEnabled(false);
          setMediaPermissionError(
            error?.name === 'NotAllowedError'
              ? 'Camera access was denied. Allow it in browser settings.'
              : 'Camera is unavailable on this device.'
          );
        });
    } else {
      setVideoEnabled(false);
      setMediaPermissionError('This browser does not support camera access.');
    }

    return () => {
      cancelled = true;
      requestedStream?.getTracks().forEach((track) => track.stop());
      if (cameraStreamRef.current === requestedStream) {
        cameraStreamRef.current = null;
      }
    };
  }, [videoEnabled]);

  useEffect(() => {
    if (localVideoRef.current && localMediaStream) {
      localVideoRef.current.srcObject = localMediaStream;
    }
  }, [localMediaStream, expandedVideoPeerId]);

  const currentMode = BATTLE_MODES[selectedMode];
  const squadMembers = classmates.slice(0, MAX_ROOM_PLAYERS);
  const activeVideoPeers = squadMembers;
  const selectedVideoPeer =
    activeVideoPeers.find((p) => p.id === expandedVideoPeerId) || activeVideoPeers[0] || null;
  const sortedPopupVideoPeers = selectedVideoPeer
    ? [
        selectedVideoPeer,
        ...activeVideoPeers.filter((peer) => peer.id !== selectedVideoPeer.id),
      ]
    : activeVideoPeers;

  const handleOpenVideoChat = (peerId?: string) => {
    const targetPeer =
      activeVideoPeers.find((peer) => peer.id === peerId) ||
      activeVideoPeers.find((peer) => peer.id === localPlayerId) ||
      activeVideoPeers[0];
    setVideoEnabled(true);
    if (targetPeer) setExpandedVideoPeerId(targetPeer.id);
  };

  const handleOpenAuthModal = (mode: 'profile' | 'login' | 'register') => {
    setDraftName(isLoggedIn ? studentName : '');
    setDraftBlock(blockSection || 'BSCS-3A');
    setDraftPassword('');
    setAuthSuccessMsg(null);
    setAuthModalMode(mode);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = draftName.trim().replace(/^@/, '');
    const cleanBlock = draftBlock.trim() || 'BSCS-3A';
    if (!cleanName) return;

    if (authModalMode === 'register') {
      onRegisterStudent(cleanName, cleanBlock);
      setAuthSuccessMsg(`Registered & logged in as @${cleanName} (${cleanBlock})!`);
    } else {
      onLoginStudent(cleanName, cleanBlock);
      setAuthSuccessMsg(`Logged in as @${cleanName} (${cleanBlock})!`);
    }
    setTimeout(() => {
      setAuthSuccessMsg(null);
      setAuthModalMode('closed');
    }, 900);
  };

  const dispatchChatMessage = (
    text: string,
    attachment?: LobbyChatMessage['attachment']
  ) => {
    onSendChatMessage?.(text, attachment);
  };

  const handleSendChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      dispatchChatMessage(trimmed, {
        type: 'link',
        title: urlMatch[0],
        url: urlMatch[0],
        subtitle: 'Shared Study Hyperlink',
      });
    } else {
      dispatchChatMessage(trimmed);
    }
    setChatInput('');
  };

  const handleQuickShareAttachment = (type: ChatAttachmentType) => {
    if (type === 'notes') {
      dispatchChatMessage(`Shared study notes for ${activeDeck.title}`, {
        type: 'notes',
        title: activeDeck.title,
        subtitle: `${activeDeck.questions.length} Qs · ${activeDeck.subject}`,
      });
      setActiveAttachMenu(null);
      return;
    }

    if (type === 'link') {
      if (activeAttachMenu === 'link') {
        const url = attachUrlInput.trim();
        if (!url) return;
        dispatchChatMessage(`Shared a study hyperlink:`, {
          type: 'link',
          title: url,
          url: url.startsWith('http') ? url : `https://${url}`,
          subtitle: 'External Study Resource',
        });
        setAttachUrlInput('');
        setActiveAttachMenu(null);
      } else {
        setActiveAttachMenu('link');
      }
      return;
    }

    // Trigger real file picker for photo, video, or pdf (and also dispatch if user wants immediate share)
    setPendingFileType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatchChatMessage(`Uploaded ${pendingFileType.toUpperCase()}: ${file.name}`, {
        type: pendingFileType,
        title: file.name,
        url: typeof reader.result === 'string' ? reader.result : undefined,
        subtitle: `${(file.size / 1024).toFixed(1)} KB`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* =====================================================================
          TOP ROW: LOGO ON LEFT, CENTER ROOM SQUAD BAR (WHEN IN ROOM), UTILITIES ON RIGHT
         ===================================================================== */}
      <div className="relative w-full flex items-center justify-between gap-2">
        {/* Left: User-Provided Pokémon-Style EduQuests Logo */}
        <div className="pointer-events-auto flex items-center" data-testid="eduquests-logo">
          <img
            src={`${import.meta.env.BASE_URL}assets/aistudio/image_d8bbdfa5.png`}
            alt="EduQuests Logo"
            className="h-12 md:h-16 w-auto drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] object-contain"
          />
        </div>

        {/* Center: Active Room Squad Nametag Header (Only shown when joined in a room, centered above the character) */}
        {isJoinedInRoom && (
          <div
            data-testid="lobby-squad-bar"
            className="pointer-events-auto hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2 items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/85 text-white border border-yellow-400/60 shadow-md max-w-[330px] xl:max-w-[430px]"
          >
            <span className="text-xs font-display font-black text-yellow-300 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
              <span>Room #{roomCode}</span>
            </span>
            <span className="text-yellow-400/40 shrink-0" aria-hidden="true">·</span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono truncate">
              {squadMembers.slice(0, 2).map((member) => {
                const isYou = member.id === localPlayerId || member.id === 'local-player';
                return (
                  <span
                    key={member.id}
                    className={
                      isYou
                        ? 'text-yellow-300 font-bold truncate'
                        : 'text-amber-100 font-medium truncate'
                    }
                  >
                    @{member.name}
                  </span>
                );
              })}
              {squadMembers.length > 2 && (
                <span className="text-yellow-200/90 font-bold shrink-0">
                  +{squadMembers.length - 2}
                </span>
              )}
            </div>
            <span className="text-yellow-400/40 shrink-0" aria-hidden="true">·</span>
            <span className="text-xs font-mono font-bold text-yellow-300 shrink-0 tabular-nums">
              {squadMembers.length}/{MAX_ROOM_PLAYERS}
            </span>
          </div>
        )}

        {/* Right: Real Utility Controls (Share Link & Settings — No Simulations!) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            data-testid="share-link-btn"
            onClick={() => setShareModalOpen(true)}
            aria-label="Open Share & GitHub Link"
            className="px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-yellow-300 hover:-translate-y-0.5 active:translate-y-0 text-slate-900 border border-slate-200 hover:border-amber-400 font-display font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-amber-600" />
            <span>SHARE LINK</span>
          </button>

          <button
            type="button"
            data-testid="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open Settings"
            className="px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-yellow-300 hover:-translate-y-0.5 active:translate-y-0 text-slate-900 border border-slate-200 hover:border-amber-400 font-display font-extrabold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-600" />
            <span>SETTINGS</span>
          </button>
        </div>
      </div>

      {/* Empty space in middle for the centered 3D Character & Room Squad */}
      <div className="flex-1" />

      {/* =====================================================================
          BOTTOM ROW:
          Bottom-Left: Transparent Room Chat Drawer (when in room) + Interactive Profile Card
          Bottom-Right: Live Invitations Stack + Hierarchical Battle Section Card
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        {/* Bottom-Left Stack */}
        <div
          data-testid="player-info-card"
          className="pointer-events-auto lg:col-span-4 flex flex-col gap-2.5 w-full max-w-[360px]"
        >
          {/* TRANSPARENT ROOM CHAT & MIC/VIDEO CALL DRAWER (Only visible if joined in a room) */}
          {isJoinedInRoom && (
            <div
              data-testid="profile-top-chat-drawer"
              className="group/room-chat w-full min-h-[260px] rounded-3xl bg-slate-950/35 text-white border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col cursor-pointer hover:border-yellow-400/70 hover:bg-gradient-to-br hover:from-slate-950/45 hover:via-slate-900/40 hover:to-amber-950/35 hover:ring-4 hover:ring-yellow-400/15 active:scale-[0.995] transition-all duration-200"
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('button, input, form, a')) return;
                handleOpenVideoChat();
              }}
            >
              {/* When Camera is ON: Pressable Video Feeds of Joined Users at the VERY TOP of the Chat */}
              {videoEnabled && (
                <div
                  data-testid="chat-top-video-strip"
                  className="px-3 pt-2.5 pb-2 bg-slate-950/55 border-b border-white/15 shrink-0"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-display font-extrabold text-yellow-300 uppercase tracking-wider">
                      Room Cameras ({activeVideoPeers.length}) · Tap video to expand
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 overflow-x-auto drawer-scroll pb-0.5">
                    {activeVideoPeers.slice(0, 6).map((peer) => {
                      const isSelf = peer.id === localPlayerId || peer.id === 'local-player';
                      return (
                        <button
                          key={peer.id}
                          type="button"
                          data-testid={`chat-video-feed-${peer.id}`}
                          onClick={() => handleOpenVideoChat(peer.id)}
                          className="group relative rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-amber-950/75 hover:from-amber-900/90 hover:to-yellow-900/80 border border-yellow-400/40 hover:border-yellow-300 p-1.5 flex flex-col items-center justify-center overflow-hidden transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 text-left cursor-pointer"
                          title={`Press to open bigger video & chat for @${peer.name}`}
                        >
                          <span className="absolute top-1 right-1 px-1 py-0.2 rounded bg-yellow-400 text-[7px] font-mono font-bold text-slate-950 uppercase">
                            CAM
                          </span>
                          {isSelf && localMediaStream ? (
                            <video
                              autoPlay
                              playsInline
                              muted
                              ref={(video) => {
                                if (video) video.srcObject = localMediaStream;
                              }}
                              className="w-8 h-8 rounded-full object-cover border border-yellow-300 shadow-sm"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-300 to-amber-500 text-slate-950 font-display font-black text-[11px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              {peer.name[0]}
                            </div>
                          )}
                          <span className="text-[9px] font-mono font-bold text-white truncate max-w-full mt-1">
                            @{peer.name}
                          </span>
                          <span className="text-[8px] font-mono text-yellow-200/90 truncate max-w-full">
                            {isSelf ? 'You' : peer.blockSection}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat Drawer Header with Mic & Video Call Toggles */}
              <div className="px-3.5 py-2 border-b border-white/15 bg-white/5 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenVideoChat()}
                  className="min-w-0 flex-1 text-left rounded-xl cursor-pointer hover:bg-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 px-1 py-0.5 transition-colors"
                >
                  <div className="text-[10px] font-display font-extrabold text-yellow-300 uppercase tracking-wider truncate">
                    ROOM #{roomCode} CHAT · {squadMembers.length}/{MAX_ROOM_PLAYERS} SQUAD
                  </div>
                  <div className="text-[11px] font-bold text-white/90 truncate">
                    {micEnabled ? 'Mic Active' : 'Mic Muted'} · {videoEnabled ? 'Camera On (Tap Video)' : 'Camera Off'}
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="chat-mic-toggle"
                    onClick={() => setMicEnabled((prev) => !prev)}
                    aria-label={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                    className={`p-2 rounded-full border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      micEnabled
                        ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-sm'
                        : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                    }`}
                  >
                    {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    data-testid="chat-video-toggle"
                    onClick={() => {
                      setVideoEnabled((prev) => {
                        const next = !prev;
                        if (!next) setExpandedVideoPeerId(null);
                        return next;
                      });
                    }}
                    aria-label={videoEnabled ? 'Turn Off Video Call' : 'Turn On Video Call'}
                    className={`p-2 rounded-full border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      videoEnabled
                        ? 'bg-amber-400 text-slate-950 border-yellow-200 shadow-sm'
                        : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                    }`}
                  >
                    {videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {mediaPermissionError && (
                <div className="px-3.5 py-2 bg-rose-950/70 border-b border-rose-400/40 text-[10px] text-rose-100 font-semibold shrink-0">
                  {mediaPermissionError}
                </div>
              )}

              {/* Scrollable Transparent Messages Container */}
              <div
                className="px-3.5 py-2.5 min-h-[150px] max-h-[240px] flex-1 overflow-y-auto drawer-scroll space-y-2 bg-transparent"
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('button, input, form, a')) return;
                  handleOpenVideoChat();
                }}
              >
                {chatMessages.length === 0 ? (
                  <div className="py-3 text-center text-[11px] font-mono text-white/75">
                    Room #{roomCode} live chat ready. Send a message, link, or study file to your squad!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2 rounded-2xl bg-slate-950/55 border border-white/15 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-extrabold text-yellow-300 text-[11px]">
                          @{msg.sender}
                        </span>
                        <span className="text-[9px] font-mono text-white/60">{msg.timestamp}</span>
                      </div>
                      <p className="text-white/95 text-[11px] leading-snug break-words">{msg.text}</p>

                      {msg.attachment && (
                        <button
                          type="button"
                          onClick={() => setExpandedAttachment(msg.attachment ?? null)}
                          className="mt-1 w-full p-2 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between gap-2 text-left hover:bg-white/15 hover:border-yellow-400/70 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-display font-bold text-yellow-300 uppercase">
                              {msg.attachment.type}
                            </div>
                            {msg.attachment.type === 'link' && msg.attachment.url ? (
                              <a
                                href={msg.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-yellow-200 underline truncate block"
                              >
                                {msg.attachment.title}
                              </a>
                            ) : (
                              <div className="text-[11px] font-bold text-white truncate">
                                {msg.attachment.title}
                              </div>
                            )}
                            {msg.attachment.subtitle && (
                              <div className="text-[9px] font-mono text-white/70">
                                {msg.attachment.subtitle}
                              </div>
                            )}
                          </div>

                          {msg.attachment.type === 'photo' && msg.attachment.url && (
                            <img
                              src={msg.attachment.url}
                              alt={msg.attachment.title}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover border border-white/25 shrink-0"
                            />
                          )}
                          <Maximize2 className="w-4 h-4 text-yellow-300 shrink-0" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Optional Hyperlink URL Input Bar */}
              {activeAttachMenu === 'link' && (
                <div className="px-3 py-1.5 bg-slate-950/60 border-t border-white/15 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={attachUrlInput}
                    onChange={(e) => setAttachUrlInput(e.target.value)}
                    placeholder="https://canvas.edu/course-notes..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-[11px] text-white placeholder:text-white/60 focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickShareAttachment('link')}
                    className="px-2.5 py-1 rounded-lg bg-yellow-400 text-slate-950 font-display font-bold text-[10px] cursor-pointer"
                  >
                    Attach Link
                  </button>
                </div>
              )}

              {/* Rich Attachment Buttons: Photos, Videos, Hyperlinks, PDF Files, Notes */}
              <div className="px-3 pt-2 pb-1 border-t border-white/15 bg-white/5 flex items-center justify-between gap-1 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept={
                    pendingFileType === 'photo'
                      ? 'image/*'
                      : pendingFileType === 'video'
                        ? 'video/*'
                        : pendingFileType === 'pdf'
                          ? 'application/pdf,.pdf'
                          : undefined
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => handleQuickShareAttachment('photo')}
                  className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[10px] font-display font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Upload Photo in Chat"
                >
                  <ImageIcon className="w-3 h-3 text-yellow-300" />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShareAttachment('video')}
                  className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[10px] font-display font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Upload Video in Chat"
                >
                  <Film className="w-3 h-3 text-amber-300" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShareAttachment('link')}
                  className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[10px] font-display font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Send Hyperlink in Chat"
                >
                  <Link2 className="w-3 h-3 text-yellow-200" />
                  <span>Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShareAttachment('pdf')}
                  className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[10px] font-display font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Upload PDF File in Chat"
                >
                  <FileText className="w-3 h-3 text-rose-300" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShareAttachment('notes')}
                  className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[10px] font-display font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Send Active Study Notes in Chat"
                >
                  <BookOpen className="w-3 h-3 text-amber-300" />
                  <span>Notes</span>
                </button>
              </div>

              {/* Chat Text Input & Send */}
              <form
                onSubmit={handleSendChatSubmit}
                className="px-3 pb-2.5 pt-1 bg-white/5 flex items-center gap-1.5 shrink-0"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send message, link, or notes to room..."
                  aria-label="Room Chat Input"
                  className="flex-1 px-3 py-1.5 rounded-full bg-slate-950/55 border border-white/25 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="submit"
                  aria-label="Send Chat Message"
                  className="p-2 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* =================================================================
              PROFILE SECTION CARD:
              - Entire card padding is pressable with clear hover lift, golden ring glow, and cursor-pointer affordance
              - Strong visual hierarchy between Primary Profile Trigger (Top) and Secondary Account Actions (Bottom)
             ================================================================= */}
          <div
            data-testid="profile-card-surface"
            onClick={() => handleOpenAuthModal('profile')}
            className="group/profile w-full rounded-3xl bg-white/95 hover:bg-gradient-to-br hover:from-amber-50/95 hover:via-white hover:to-yellow-50/90 text-slate-900 border-2 border-slate-200/90 hover:border-yellow-400 hover:ring-4 hover:ring-yellow-400/25 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] hover:shadow-[0_20px_48px_rgba(250,204,21,0.38)] hover:-translate-y-1 active:translate-y-0 transition-all duration-200 relative overflow-hidden cursor-pointer"
            title="Click anywhere on this Profile card to open your 3D Character, Customization & Friends"
          >
            {/* Level Badge Header */}
            <div className="absolute top-0 right-0 px-3.5 py-1 bg-slate-900 group-hover/profile:bg-gradient-to-r group-hover/profile:from-yellow-300 group-hover/profile:via-amber-400 group-hover/profile:to-yellow-500 text-yellow-300 group-hover/profile:text-slate-950 font-display font-black text-[10px] tracking-widest rounded-bl-2xl uppercase shadow-sm flex items-center gap-1 transition-colors">
              <Trophy className="w-3 h-3" />
              <span>LV. 40 · SCHOLAR</span>
            </div>

            {/* Primary Action Area: View Full 3D Profile */}
            <button
              type="button"
              data-testid="player-info-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAuthModal('profile');
              }}
              className="w-full text-left flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/90 rounded-xl transition-colors cursor-pointer focus:outline-none"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>01 · SCHOLAR PROFILE</span>
                </div>
                <div className="text-base font-display font-black text-slate-900 leading-tight mt-0.5 group-hover/profile:text-amber-700 transition-colors truncate">
                  {isLoggedIn ? `@${studentName}` : 'Guest Student'}{' '}
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    · {isLoggedIn ? blockSection : 'Guest'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5">
                  <span>3D Avatar, Outfit &amp; Friends</span>
                </div>
              </div>

              {/* Explicit Pressable Callout Pill */}
              <span className="shrink-0 mt-3 px-2.5 py-1.5 rounded-xl bg-amber-100/90 group-hover/profile:bg-yellow-400 text-amber-950 group-hover/profile:text-slate-950 font-display font-black text-[11px] flex items-center gap-1 shadow-2xs group-hover/profile:shadow-sm group-hover/profile:translate-x-0.5 transition-all">
                <span>View Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* Secondary Account Actions Footer (Subdued Neutral Hierarchy so it doesn't compete with Primary Profile Action) */}
            <div
              className="grid grid-cols-3 gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                data-testid="player-login-btn"
                onClick={() => handleOpenAuthModal('login')}
                className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-yellow-300 border border-slate-200/90 hover:border-slate-900 font-display font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>

              <button
                type="button"
                data-testid="player-register-btn"
                onClick={() => handleOpenAuthModal('register')}
                className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-yellow-300 border border-slate-200/90 hover:border-slate-900 font-display font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>

              <button
                type="button"
                data-testid="player-logout-btn"
                onClick={onLogoutStudent}
                disabled={!isLoggedIn}
                className="py-2 px-2.5 rounded-xl bg-white hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 font-display font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================
            BOTTOM-RIGHT: LIVE INVITATIONS + HIERARCHICAL BATTLE SECTION CARD
           ================================================================= */}
        <div
          data-testid="battle-section-column"
          className="pointer-events-auto lg:col-span-4 lg:col-start-9 w-full max-w-[360px] ml-auto flex flex-col gap-2.5"
        >
          {/* Real-Time Incoming/Outgoing Invitations Stack */}
          {invitations.length > 0 && (
            <div
              data-testid="right-invitations-panel"
              className="w-full rounded-3xl bg-white/95 text-slate-900 border-2 border-amber-300 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col gap-2"
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-display font-black text-amber-800 uppercase tracking-wide">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>Live Battle Invitations ({invitations.length})</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto drawer-scroll pr-1">
                {invitations.map((inv) => {
                  const modeTitle = BATTLE_MODES[inv.mode].title;
                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl bg-slate-50 border border-slate-200 p-3 shadow-2xs flex items-start justify-between gap-2.5 transition-all"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell className="w-3.5 h-3.5 text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-display font-black tracking-wide text-slate-900 truncate">
                            {inv.direction === 'incoming'
                              ? `@${inv.username} invites you!`
                              : `Invited @${inv.username}`}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 font-mono truncate">
                            {inv.blockSection} · {modeTitle}
                            {inv.deckTitle ? ` · ${inv.deckTitle}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {inv.direction === 'incoming' && inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => onAcceptInvite(inv.id)}
                            aria-label={`Accept invite from ${inv.username}`}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-400 hover:from-yellow-200 hover:to-amber-300 text-slate-950 font-display font-extrabold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDismissInvite(inv.id)}
                          aria-label={`Dismiss invite ${inv.username}`}
                          className="w-7 h-7 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN BATTLE SECTION CARD (3 Clear Action Levels) */}
          <div className="w-full rounded-3xl bg-white/95 text-slate-900 border border-slate-200/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] overflow-hidden cursor-default">
            {/* Header: Section Label + Active Mode vs Active Topic */}
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-200">
              <div>
                <div
                  data-testid="battle-section-kicker"
                  className="text-[10px] font-mono font-bold text-amber-700 tracking-widest uppercase flex items-center gap-1"
                >
                  <Swords className="w-3 h-3 text-amber-600" />
                  <span>02 · BATTLE ARENA</span>
                </div>
                <div className="text-base font-display font-black text-slate-900 truncate mt-0.5">
                  {currentMode.title}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">
                  ACTIVE TOPIC
                </div>
                <div className="text-xs font-bold text-amber-700 mt-0.5 truncate max-w-[140px]">
                  {activeDeck.title}
                </div>
              </div>
            </div>

            {/* TIER 1: Segmented Battle Mode Selector (Dark Active Pill in Recessed Neutral Track) */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Step 1 · Select Mode
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentMode.timeLimitSec > 0 ? `${currentMode.timeLimitSec}s Match` : 'Untimed'}
                </span>
              </div>
              <div
                className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80"
                role="group"
                aria-label="Battle Mode Selection"
              >
                {(Object.keys(BATTLE_MODES) as GameMode[]).map((mKey) => {
                  const spec = BATTLE_MODES[mKey];
                  const isSelected = selectedMode === mKey;
                  return (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => onSelectMode(mKey)}
                      className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-yellow-300 font-black shadow-xs scale-[1.02]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-bold'
                      }`}
                    >
                      <div className="text-[10px] font-display font-extrabold leading-tight whitespace-nowrap">
                        {spec.shortTitle}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] text-slate-600 font-mono bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-900">{currentMode.title}:</span>{' '}
                {selectedMode === 'raid'
                  ? 'Co-op boss raid with squadmates vs Virizion.'
                  : selectedMode === 'pvp'
                  ? '1v1 quiz duel with 2 protect shields.'
                  : selectedMode === 'team'
                  ? '3v3 squad battle (Alpha vs Omega).'
                  : 'Solo practice training with study notes.'}
              </div>
            </div>

            {/* TIER 2: Single Dominant Primary Action CTA */}
            <div className="mt-3">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartBattle();
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] text-slate-950 font-display font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(245,158,11,0.45)] hover:shadow-[0_12px_28px_rgba(245,158,11,0.6)] transition-all whitespace-nowrap cursor-pointer"
              >
                <span>{hasCustomNotes ? 'PLAY NOW' : 'OPEN INVENTORY & PLAY'}</span>
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* TIER 3: Secondary Setup Drawers (Room & Inventory — Distinct Secondary Styling) */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="open-room-btn"
                onClick={onOpenRoomModal}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 text-white font-display font-extrabold text-xs flex items-center justify-between gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Users className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <span>Room</span>
                </span>
                <span className="text-[10px] font-mono text-yellow-300/90 shrink-0">
                  {isJoinedInRoom ? `#${roomCode}` : 'Join'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenInventoryModal(false)}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 hover:-translate-y-0.5 active:translate-y-0 border border-slate-300 text-slate-800 font-display font-extrabold text-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Inventory</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {activeDeck.questions.length} Qs
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SETTINGS POP-UP WINDOW (Hierarchical Dark Header + Numbered Sections)
         ===================================================================== */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-sm">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-yellow-300 uppercase tracking-wider">
                    System Preferences &amp; Squad Standings
                  </div>
                  <h2 id="settings-modal-title" className="text-lg font-display font-black text-white">
                    Game Settings &amp; Standings
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close Settings Modal"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto drawer-scroll space-y-4">
              {/* Section 01: Audio */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">01 · AUDIO</div>
                  <div className="text-sm font-display font-bold text-slate-900">Arena Sound Effects</div>
                  <div className="text-xs text-slate-600">Toggle synthesized combat audio [Key: M]</div>
                </div>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                    muted
                      ? 'bg-rose-100 border border-rose-300 text-rose-700'
                      : 'bg-slate-900 text-yellow-300 shadow-2xs'
                  }`}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{muted ? 'Muted' : 'Sound ON'}</span>
                </button>
              </div>

              {/* Section 02: Study Topic */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">
                    02 · ACTIVE STUDY DECK
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeDeck.title}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {activeDeck.questions.length} Questions Loaded
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    onOpenInventoryModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-xs whitespace-nowrap cursor-pointer transition-colors"
                >
                  Open Inventory
                </button>
              </div>

              {/* Section 03: Live Room Standings */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">
                      03 · MULTIPLAYER SCOREBOARD
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-display font-bold text-slate-900">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {isJoinedInRoom
                          ? `Room #${roomCode} Standings (${squadMembers.length}/${MAX_ROOM_PLAYERS})`
                          : 'Solo Session Standings'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      onOpenRoomModal();
                    }}
                    className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    Manage Room
                  </button>
                </div>
                <div className="divide-y divide-slate-200 max-h-36 overflow-y-auto drawer-scroll pr-1">
                  {squadMembers
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((m, idx) => (
                      <div key={m.id} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-900 font-semibold">
                          #{idx + 1} @{m.name} ({m.blockSection})
                        </span>
                        <span className="font-mono text-amber-700 font-bold tabular-nums">{m.score} PTS</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Primary CTA: Share Live Multiplayer Link */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-display font-black text-slate-900">
                    Invite Real Players via Link
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Share your direct room URL so classmates join in real time
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setShareModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SHARE LINK & GITHUB PAGES ACCESS MODAL
         ===================================================================== */}
      {shareModalOpen && (
        <div
          data-testid="share-link-modal"
          className="fixed inset-0 z-30 pointer-events-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-sm">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-yellow-300 uppercase tracking-wider">
                    Multiplayer Invite Links &amp; Deployment
                  </div>
                  <h2 id="share-modal-title" className="text-lg font-display font-black text-white">
                    Share Game Link &amp; GitHub Access
                  </h2>
                </div>
              </div>
              <button
                type="button"
                data-testid="close-share-modal-btn"
                onClick={() => setShareModalOpen(false)}
                aria-label="Close Share Link Modal"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto drawer-scroll space-y-4">
              {/* 1. Direct Room Invite Link (Primary) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-black text-slate-900 uppercase tracking-wide">
                    01 · Direct Room #{roomCode} Multiplayer Link
                  </span>
                  <span className="text-[11px] font-mono text-amber-800 font-bold">
                    Auto-joins Room #{roomCode}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Send this link to real players or open it in another browser tab to join Room #{roomCode} together in real time:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={roomInviteUrl}
                    aria-label="Direct Room Invite URL"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    data-testid="copy-room-link-btn"
                    onClick={() => handleCopyText(roomInviteUrl, 'room')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    {copiedKey === 'room' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'room' ? 'Copied!' : 'Copy Room Link'}</span>
                  </button>
                </div>
              </div>

              {/* 2. Direct Live Playable Link */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-black text-slate-800 uppercase tracking-wide">
                    02 · Main Lobby Link
                  </span>
                  <a
                    href={liveSharedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-display font-bold text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveSharedUrl}
                    aria-label="Live Playable App URL"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    data-testid="copy-live-link-btn"
                    onClick={() => handleCopyText(liveSharedUrl, 'live')}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'live' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'live' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* 3. GitHub Repository & GitHub Pages Deployment */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-black text-slate-800 uppercase tracking-wide">
                    03 · GitHub Pages URL (.github/workflows/deploy.yml)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={githubPagesTemplateUrl}
                    aria-label="GitHub Pages URL Pattern"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(githubPagesTemplateUrl, 'gh')}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-display font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'gh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'gh' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PLAYER PROFILE POP-UP WINDOW
          - Level 0 Dark Slate Header with Segmented Switcher (ME / PROFILE | LOGIN | REGISTER)
          - Section 01 (Left Top): 3D Full-Body Standing Lobby Character with Motion (<ProfileCharacter3D />)
          - Section 02 (Left Bottom): Character Customization
          - Section 03 (Right Top): Friends & Live Online Players + Socials
          - Section 04 (Right Bottom): Scholar Combat Record
         ===================================================================== */}
      {authModalMode !== 'closed' && (
        <div
          data-testid="student-profile-modal"
          className="fixed inset-0 z-30 pointer-events-auto flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div
            className={`w-full ${
              authModalMode === 'profile' ? 'max-w-4xl' : 'max-w-md'
            } max-h-[90vh] rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col`}
          >
            {/* LEVEL 0: Dark Slate Modal Header with Clear Purpose & Segmented Switcher */}
            <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <div className="text-[10px] font-mono font-bold text-yellow-300 uppercase tracking-widest">
                  Scholar Identity · 3D Avatar &amp; Live Socials
                </div>
                <h2 id="auth-modal-title" className="text-lg sm:text-xl font-display font-black text-white">
                  {authModalMode === 'profile'
                    ? `${isLoggedIn ? studentName : 'Guest'} & ${activeHeroObj.name}`
                    : authModalMode === 'register'
                    ? 'Register Student Account'
                    : 'Student Account Login'}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Segmented Mode Tabs inside Dark Header Track */}
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-800 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('profile')}
                    className={`px-3 py-1.5 rounded-xl font-display font-extrabold text-xs transition-all cursor-pointer ${
                      authModalMode === 'profile'
                        ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    ME / PROFILE
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('login')}
                    className={`px-3 py-1.5 rounded-xl font-display font-extrabold text-xs transition-all cursor-pointer ${
                      authModalMode === 'login'
                        ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    LOGIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('register')}
                    className={`px-3 py-1.5 rounded-xl font-display font-extrabold text-xs transition-all cursor-pointer ${
                      authModalMode === 'register'
                        ? 'bg-amber-400 text-slate-950 shadow-2xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    REGISTER
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="close-profile-modal-btn"
                  onClick={() => setAuthModalMode('closed')}
                  aria-label="Close Account Modal"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto drawer-scroll flex-1">
              {authModalMode === 'profile' ? (
                <div
                  data-testid="student-profile-view"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
                >
                  {/* =========================================================
                      LEFT COLUMN (7 COLS):
                      Section 01: 3D Full-Body Standing Character & Companion Stage
                      Section 02: Character Customization Directly Underneath
                     ========================================================= */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {/* SECTION 01: 3D Standing Character Stage */}
                    <section
                      data-testid="profile-fullbody-character"
                      className="relative rounded-3xl bg-gradient-to-b from-sky-200/80 via-amber-50/60 to-slate-100 border border-slate-200 p-4 sm:p-5 shadow-inner overflow-hidden flex flex-col justify-between"
                    >
                      {/* Section Header Overlay */}
                      <div className="flex items-start justify-between gap-2 z-10">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-widest">
                            SECTION 01 · 3D STANDING CHARACTER (DRAG TO ROTATE)
                          </div>
                          <div className="text-xl font-display font-black text-slate-900 leading-tight mt-0.5">
                            {isLoggedIn ? `@${studentName}` : 'GuestScholar'}
                          </div>
                          <div className="text-xs font-display font-bold text-slate-600">
                            Standing with Otter Companion &amp; {activeHeroObj.name}
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-slate-900 text-yellow-300 font-mono font-bold text-xs shadow-2xs tabular-nums">
                          {isLoggedIn ? blockSection : 'GUEST'} · CP {activeHeroObj.cp}
                        </span>
                      </div>

                      {/* Real 3D Standing Character & Companion Canvas */}
                      <div className="relative my-1 flex items-center justify-center">
                        <ProfileCharacter3D
                          gender={characterGender}
                          topHex={activeOutfitObj.topFill}
                          trimHex={activeOutfitObj.trimFill}
                          pantsHex={activeOutfitObj.pantsFill}
                          shoeHex={activeOutfitObj.shoeFill}
                          accentHex={activeAccentObj.hex}
                          heroId={selectedHero}
                        />
                      </div>

                      {/* Level & XP Progress Bar under 3D Character */}
                      <div className="pt-2.5 border-t border-slate-200/90 flex items-end justify-between gap-4">
                        <div>
                          <div className="text-3xl font-display font-black text-amber-600 leading-none tabular-nums">
                            40
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            SCHOLAR LEVEL
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-600 mb-1">
                            <span>{activeOutfitObj.name} · {characterGender.toUpperCase()}</span>
                            <span className="text-amber-700 tabular-nums">240,500 / 500,000 XP</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* SECTION 02: UNDER YOUR CHARACTER — Character Customization */}
                    <section
                      data-testid="profile-character-customization"
                      className="rounded-3xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                            SECTION 02 · APPEARANCE &amp; LOADOUT
                          </div>
                          <h3 className="text-sm font-display font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Shirt className="w-4 h-4 text-amber-600" />
                            <span>Character Customization</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Changes update your 3D standing character above in real time.
                          </p>
                        </div>
                      </div>

                      {/* Body Type / Sex */}
                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          <span>1. Body Proportions</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'male', label: 'Male' },
                            { id: 'female', label: 'Female' },
                            { id: 'neutral', label: 'Neutral' },
                          ].map((g) => {
                            const active = characterGender === g.id;
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => onChangeCharacterGender?.(g.id as 'male' | 'female' | 'neutral')}
                                className={`py-2 px-3 rounded-xl border text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  active
                                    ? 'bg-slate-900 border-slate-900 text-yellow-300 shadow-2xs font-black'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                {active && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                                <span>{g.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Outfit & Clothes Style */}
                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          <Shirt className="w-3.5 h-3.5 text-amber-600" />
                          <span>2. Outfit &amp; Sweater Style</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {OUTFIT_PRESETS.map((o) => {
                            const active = outfitStyle === o.id;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => onChangeOutfitStyle?.(o.id)}
                                className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                  active
                                    ? 'bg-slate-900 border-slate-900 text-yellow-300 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`w-4 h-4 rounded-md bg-gradient-to-br ${o.badgeClass} border border-white/40`}
                                  />
                                  {active && <Check className="w-3 h-3 text-yellow-400" />}
                                </div>
                                <span className="text-[11px] font-display font-bold leading-tight truncate">
                                  {o.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Combat Guardian & Energy Aura */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                        <div className="sm:col-span-7">
                          <label className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>3. 3D Guardian Companion</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {HEROES.map((h) => {
                              const active = selectedHero === h.id;
                              return (
                                <button
                                  key={h.id}
                                  type="button"
                                  onClick={() => onSelectHero?.(h.id)}
                                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    active
                                      ? 'bg-slate-900 border-slate-900 text-yellow-300 font-black shadow-2xs'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="text-[11px] font-display font-bold truncate">{h.name}</div>
                                  <div
                                    className={`text-[10px] font-mono font-bold tabular-nums ${
                                      active ? 'text-yellow-200/80' : 'text-amber-700'
                                    }`}
                                  >
                                    CP {h.cp}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="sm:col-span-5">
                          <label className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            <Palette className="w-3.5 h-3.5 text-amber-600" />
                            <span>4. Pedestal Aura</span>
                          </label>
                          <div className="flex items-center gap-2 pt-1">
                            {ACCENT_PRESETS.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => onChangeAccentColor?.(a.id)}
                                aria-label={a.name}
                                className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                                  accentColor === a.id
                                    ? 'border-slate-950 scale-110 shadow-sm'
                                    : 'border-transparent opacity-80 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: a.hex }}
                              >
                                {accentColor === a.id && (
                                  <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* =========================================================
                      RIGHT COLUMN (5 COLS):
                      Section 03: Friends & Live Online Players + Socials
                      Section 04: Scholar Combat Record
                     ========================================================= */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* SECTION 03: FRIENDS & SOCIALS SECTION */}
                    <section
                      data-testid="profile-friends-socials"
                      className="rounded-3xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3.5"
                    >
                      <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                            SECTION 03 · FRIENDS &amp; LIVE PLAYERS
                          </div>
                          <h3 className="text-sm font-display font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Users className="w-4 h-4 text-amber-600" />
                            <span>Friends &amp; Socials</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Real online players &amp; classmates you can invite to battle.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-yellow-300 font-mono font-bold text-[10px] shrink-0">
                          {onlinePlayers.length} ONLINE
                        </span>
                      </div>

                      {/* Add Friend Input (Secondary Action Button) */}
                      <form onSubmit={handleAddFriendSubmit} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newFriendInput}
                          onChange={(e) => setNewFriendInput(e.target.value)}
                          placeholder="Add classmate friend (@username)..."
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Add</span>
                        </button>
                      </form>

                      {friendToast && (
                        <div className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900">
                          {friendToast}
                        </div>
                      )}

                      {/* Friends & Live Online Players List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto drawer-scroll pr-1">
                        {combinedFriends.length === 0 ? (
                          <div className="p-3.5 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-1">
                            <div className="text-xs font-display font-bold text-slate-800">
                              No Other Players Connected Yet
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Open the app in a second tab or share your party link below to see real online players appear here automatically, or add a friend by username above.
                            </p>
                          </div>
                        ) : (
                          combinedFriends.map((friend) => (
                            <div
                              key={friend.id}
                              className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-yellow-300 font-display font-black text-xs flex items-center justify-center shrink-0">
                                  {friend.name[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-display font-black text-slate-900 truncate">
                                    @{friend.name}{' '}
                                    <span className="text-[10px] font-mono text-amber-700">
                                      · {friend.block}
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 truncate">
                                    {friend.status}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onSendInviteUsername(friend.name, selectedMode);
                                  setFriendToast(`Sent live battle invite to @${friend.name}!`);
                                  setTimeout(() => setFriendToast(null), 2200);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-800 hover:text-yellow-300 border border-slate-200 font-display font-extrabold text-[11px] shrink-0 transition-colors cursor-pointer"
                              >
                                Invite
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Socials & Connected Study Profiles */}
                      <div className="pt-2.5 border-t border-slate-200 space-y-2.5">
                        <div className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-600" />
                          <span>Connected Study Socials</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[9px] font-mono text-slate-400 uppercase">Discord</div>
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                @{isLoggedIn ? studentName : 'guest'}
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[9px] font-mono text-slate-400 uppercase">Canvas LMS</div>
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                {isLoggedIn ? blockSection : 'BSCS-3A'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Single Primary CTA in Friends & Socials Section */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(roomInviteUrl, 'social')}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          {copiedKey === 'social' ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>
                            {copiedKey === 'social'
                              ? 'Copied Party Invite Link!'
                              : `Copy Party Invite Link (Room #${roomCode})`}
                          </span>
                        </button>
                      </div>
                    </section>

                    {/* SECTION 04: SCHOLAR COMBAT RECORD */}
                    <section className="rounded-3xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3">
                      <div className="border-b border-slate-200 pb-2">
                        <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                          SECTION 04 · CAREER RECORD
                        </div>
                        <h3 className="text-sm font-display font-black text-slate-900 mt-0.5">
                          Total Scholar Activity
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] font-mono text-slate-500">Arena Battles Won</div>
                          <div className="text-sm font-display font-black text-slate-900 tabular-nums mt-0.5">
                            48 Wins
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] font-mono text-slate-500">Questions Mastered</div>
                          <div className="text-sm font-display font-black text-slate-900 tabular-nums mt-0.5">
                            642 Qs
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] font-mono text-slate-500">Active Study Topic</div>
                          <div className="text-xs font-display font-bold text-amber-700 truncate mt-0.5">
                            {activeDeck.title}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] font-mono text-slate-500">Total Scholar XP</div>
                          <div className="text-sm font-display font-black text-slate-900 tabular-nums mt-0.5">
                            240,500 XP
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                      {authModalMode === 'register' ? 'NEW SCHOLAR REGISTRATION' : 'SCHOLAR ACCOUNT SIGN-IN'}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Your username and class block identify you to real players in multiplayer rooms and battles.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="auth-username-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Student Username *
                    </label>
                    <input
                      id="auth-username-input"
                      type="text"
                      required
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="e.g. Honchkrow93 or Jonathan"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-block-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Class Block / Section *
                    </label>
                    <input
                      id="auth-block-input"
                      type="text"
                      required
                      value={draftBlock}
                      onChange={(e) => setDraftBlock(e.target.value)}
                      placeholder="e.g. BSCS-3A"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-password-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      id="auth-password-input"
                      type="password"
                      value={draftPassword}
                      onChange={(e) => setDraftPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {authSuccessMsg && (
                    <p className="text-xs font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-300">
                      {authSuccessMsg}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                    {isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => {
                          onLogoutStudent();
                          setAuthModalMode('closed');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Guest Session</span>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs uppercase tracking-wide shadow-sm cursor-pointer transition-all"
                    >
                      {authModalMode === 'register' ? 'Complete Registration' : 'Login Now'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          EXPANDED VIDEO & CHAT POP-UP WINDOW
          Left Side: Users' Videos in a Bigger Version (Real Webcam for Local Player)
          Right Side: Live Room Chat Box
         ===================================================================== */}
      {videoEnabled && expandedVideoPeerId !== null && selectedVideoPeer && (
        <div
          data-testid="video-chat-popup-modal"
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4 md:p-6 bg-slate-950/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-chat-popup-title"
        >
          <div className="relative w-full max-w-[1500px] h-[92vh] max-h-[900px] rounded-2xl bg-slate-300 text-slate-900 border border-slate-400/70 shadow-[0_24px_70px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col">
            <button
              type="button"
              data-testid="close-video-popup-btn"
              onClick={() => setExpandedVideoPeerId(null)}
              aria-label="Close Video & Chat Pop-Up"
              className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Split Content: Left = Bigger User Videos, Right = Room Chat Box */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              {/* LEFT SIDE: BIGGER VERSION OF ROOM USERS' VIDEOS */}
              <div
                data-testid="popup-left-videos"
                className="md:col-span-8 bg-slate-300 text-white p-3 md:p-4 flex flex-col gap-3 overflow-hidden border-b md:border-b-0 md:border-r border-slate-400/70"
              >
                <div
                  data-testid="popup-camera-grid"
                  className={`flex-1 min-h-[300px] grid gap-3 ${
                    sortedPopupVideoPeers.length === 1
                      ? 'grid-cols-1 grid-rows-1'
                      : sortedPopupVideoPeers.length === 2
                        ? 'grid-cols-2 grid-rows-1'
                        : sortedPopupVideoPeers.length === 3
                          ? 'grid-cols-2 grid-rows-2'
                          : sortedPopupVideoPeers.length === 4
                            ? 'grid-cols-2 grid-rows-2'
                            : 'grid-cols-3 grid-rows-2'
                  }`}
                >
                  {sortedPopupVideoPeers.map((peer, index) => {
                    const isSelf = peer.id === localPlayerId || peer.id === 'local-player';
                    const isPinned = peer.id === selectedVideoPeer?.id;
                    const hasLiveSelfVideo = isSelf && videoEnabled && localMediaStream;
                    return (
                      <button
                        key={peer.id}
                        type="button"
                        data-testid={`popup-video-tile-${peer.id}`}
                        onClick={() => setExpandedVideoPeerId(peer.id)}
                        aria-label={`Pin ${peer.name}'s camera`}
                        aria-pressed={isPinned}
                        className={`relative min-h-0 rounded-xl bg-slate-950 border overflow-hidden text-center cursor-pointer transition-all duration-200 ${
                          isPinned
                            ? 'border-violet-400 ring-2 ring-violet-400/50 shadow-[0_12px_28px_rgba(139,92,246,0.22)]'
                            : 'border-slate-700 hover:border-yellow-400/80 hover:-translate-y-0.5'
                        } ${sortedPopupVideoPeers.length === 3 && index === 0 ? 'col-span-2' : ''}`}
                      >
                        {hasLiveSelfVideo ? (
                          <video
                            autoPlay
                            playsInline
                            muted
                            ref={(video) => {
                              if (video) video.srcObject = localMediaStream;
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-slate-800 border border-slate-700 text-yellow-300 font-display font-black text-2xl flex items-center justify-center">
                            {peer.name[0]}
                          </span>
                        )}
                        <span className="absolute left-3 bottom-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs md:text-sm font-display font-black text-white">
                          @{peer.name}
                        </span>
                        {isPinned && (
                          <span className="absolute right-3 top-3 px-2.5 py-1 rounded-lg bg-violet-500 text-white text-[9px] font-mono uppercase tracking-wider">
                            Pinned
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-700/80 px-2.5 py-2 shrink-0">
                  {activeAttachMenu === 'link' && (
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={attachUrlInput}
                        onChange={(event) => setAttachUrlInput(event.target.value)}
                        placeholder="https://study-resource..."
                        className="flex-1 h-9 px-3 rounded-lg bg-slate-800 border border-slate-600 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-yellow-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickShareAttachment('link')}
                        className="h-9 px-3 rounded-lg bg-yellow-400 text-slate-950 font-display font-black text-xs cursor-pointer"
                      >
                        Attach
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { type: 'photo' as const, label: 'Photo', icon: ImageIcon, color: 'text-yellow-300' },
                      { type: 'video' as const, label: 'Video', icon: Film, color: 'text-amber-300' },
                      { type: 'link' as const, label: 'Link', icon: Link2, color: 'text-yellow-200' },
                      { type: 'pdf' as const, label: 'PDF', icon: FileText, color: 'text-rose-300' },
                      { type: 'notes' as const, label: 'Notes', icon: BookOpen, color: 'text-amber-300' },
                    ].map(({ type, label, icon: Icon, color }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleQuickShareAttachment(type)}
                        className="h-10 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-yellow-400/70 text-white text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title={`Share ${label}`}
                      >
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: INTERACTIVE ROOM CHAT BOX */}
              <div
                data-testid="popup-right-chat"
                className="md:col-span-4 bg-white flex flex-col min-h-0 overflow-hidden"
              >
                <div className="px-4 py-3 pr-14 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                  <div>
                    <div className="text-xs font-display font-black text-amber-700 uppercase tracking-wider">
                      Room #{roomCode} Chat Box
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Real-time messages, photos, videos, links, PDFs &amp; notes
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-yellow-300 font-mono font-bold text-[11px]">
                    {chatMessages.length} msgs
                  </span>
                </div>

                {/* Chat Messages Scroll Area */}
                <div className="flex-1 p-4 overflow-y-auto drawer-scroll space-y-2.5 bg-slate-50/50">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-extrabold text-amber-700 text-xs">
                          @{msg.sender}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-800 text-xs leading-relaxed break-words">{msg.text}</p>
                      {msg.attachment && (
                        <button
                          type="button"
                          onClick={() => setExpandedAttachment(msg.attachment ?? null)}
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-left hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[9px] font-display font-bold text-amber-700 uppercase">
                              {msg.attachment.type}
                            </div>
                            <div className="text-xs font-bold text-slate-900 truncate">{msg.attachment.title}</div>
                            {msg.attachment.subtitle && (
                              <div className="text-[10px] font-mono text-slate-500">{msg.attachment.subtitle}</div>
                            )}
                          </div>
                          <Maximize2 className="w-4 h-4 text-amber-600 shrink-0" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pop-Up Chat Input Form */}
                <form
                  onSubmit={handleSendChatSubmit}
                  className="px-4 pb-3.5 pt-2 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    data-testid="popup-chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message to the room..."
                    className="flex-1 px-3.5 py-2 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    data-testid="popup-chat-send-btn"
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-400 text-slate-950 font-display font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {expandedAttachment && (
        <div
          data-testid="expanded-chat-attachment"
          className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center p-4 sm:p-8 bg-slate-950/85 backdrop-blur-sm"
          onClick={() => setExpandedAttachment(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${expandedAttachment.type} preview`}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-5xl h-[min(82vh,760px)] rounded-3xl bg-slate-900 border border-yellow-400/50 shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col"
          >
            <div className="h-14 px-4 sm:px-5 flex items-center justify-between gap-3 border-b border-white/15 bg-slate-950 shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                  {expandedAttachment.type}
                </div>
                <div className="text-sm sm:text-base font-display font-bold text-white truncate">
                  {expandedAttachment.title}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {expandedAttachment.type === 'notes' ? (
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${expandedAttachment.title}\n${expandedAttachment.subtitle || ''}`)}`}
                    download={`${expandedAttachment.title.replace(/[^a-z0-9]+/gi, '-') || 'study-notes'}.txt`}
                    className="h-9 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                ) : expandedAttachment.type === 'link' ? (
                  <a
                    href={expandedAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                ) : expandedAttachment.url ? (
                  <a
                    href={expandedAttachment.url}
                    download={expandedAttachment.title}
                    className="h-9 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setExpandedAttachment(null)}
                  aria-label="Close attachment preview"
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-slate-950 p-3 sm:p-4">
              {expandedAttachment.type === 'photo' && expandedAttachment.url && (
                <img src={expandedAttachment.url} alt={expandedAttachment.title} referrerPolicy="no-referrer" className="w-full h-full object-contain rounded-xl" />
              )}
              {expandedAttachment.type === 'video' && expandedAttachment.url && (
                <video src={expandedAttachment.url} controls className="w-full h-full rounded-xl bg-black object-contain" />
              )}
              {expandedAttachment.type === 'pdf' && expandedAttachment.url && (
                <iframe src={expandedAttachment.url} title={expandedAttachment.title} className="w-full h-full rounded-xl bg-white border-0" />
              )}
              {expandedAttachment.type === 'link' && (
                <div className="w-full h-full rounded-xl border border-white/15 bg-white flex flex-col items-center justify-center p-8 text-center">
                  <Link2 className="w-14 h-14 text-amber-500 mb-4" />
                  <div className="text-xl font-display font-black text-slate-900 mb-2">{expandedAttachment.title}</div>
                  <div className="text-sm text-slate-500 mb-5">{expandedAttachment.subtitle}</div>
                  <a href={expandedAttachment.url} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-300 font-bold flex items-center gap-2 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Open Resource
                  </a>
                </div>
              )}
              {expandedAttachment.type === 'notes' && (
                <div className="w-full h-full rounded-xl border border-white/15 bg-amber-50 flex flex-col items-center justify-center p-8 text-center">
                  <BookOpen className="w-14 h-14 text-amber-600 mb-4" />
                  <div className="text-2xl font-display font-black text-slate-900 mb-2">{expandedAttachment.title}</div>
                  <div className="text-sm text-slate-600">{expandedAttachment.subtitle}</div>
                </div>
              )}
              {!expandedAttachment.url && expandedAttachment.type !== 'link' && expandedAttachment.type !== 'notes' && (
                <div className="w-full h-full flex items-center justify-center text-white/70">Preview unavailable for this file.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
