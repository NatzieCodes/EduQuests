import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BATTLE_MODES,
  BattleCombatState,
  ClassmateMember,
  DEFAULT_QUIZ_DECKS,
  GameMode,
  GameShellState,
  HEROES,
  HeroId,
  QuizDeck,
  applyBattleTurn,
  createInitialCombatState,
  isBattleVictoryAtQuestionLimit,
  normalizeFreeResponse,
  shuffleQuizDeck,
} from './game/rules';
import { CombatVisualEvent, ThreeStage } from './components/ThreeStage';
import {
  BattleInvitation,
  LobbyAttachment,
  LobbyChatMessage,
  LobbyOverlay,
} from './components/LobbyOverlay';
import { BattleHud } from './components/BattleHud';
import { InventoryModal } from './components/InventoryModal';
import {
  AvailableRoomItem,
  ClassmateRoomModal,
  OnlinePlayerSummary,
} from './components/ClassmateRoomModal';
import { StatusModal } from './components/StatusModal';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { StartingLoginPage } from './components/StartingLoginPage';
import { BattleSetupModal } from './components/BattleSetupModal';
import { soundFX } from './game/sound';
import { clearAccountToken, getCurrentAccount, loginAccount, registerAccount, saveAccountToken } from './services/auth';
import {
  ScholarProgress,
  createScholarProgress,
  syncScholarProgress,
} from './services/progression';
import {
  claimAchievementReward,
  claimDailyReward as createDailyReward,
  recordBattleReward,
} from './services/rewards';

function getOrCreateSessionPlayerId(): string {
  if (typeof window === 'undefined') return 'local-player';
  try {
    const existing = window.sessionStorage.getItem('eduquests_player_id');
    if (existing && existing.trim().length > 0) return existing;
    const created = `player-${Math.random().toString(36).slice(2, 9)}`;
    window.sessionStorage.setItem('eduquests_player_id', created);
    return created;
  } catch {
    return `player-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function loadSavedDecks(accountId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(`eduquests-quiz-decks:${accountId}`) || 'null') as {
      decks?: QuizDeck[];
      activeDeckId?: string;
    } | null;
    const decks = Array.isArray(saved?.decks) && saved.decks.length > 0
      ? saved.decks
      : DEFAULT_QUIZ_DECKS;
    return {
      decks,
      activeDeck: decks.find((deck) => deck.id === saved?.activeDeckId) ?? decks[0],
    };
  } catch {
    return { decks: DEFAULT_QUIZ_DECKS, activeDeck: DEFAULT_QUIZ_DECKS[0] };
  }
}

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const initialDirectLobby =
    typeof window !== 'undefined' &&
    (initialAutostart ||
      new URLSearchParams(window.location.search).get('lobby') === '1' ||
      Boolean(new URLSearchParams(window.location.search).get('room')));

  const [localPlayerId] = useState<string>(() => getOrCreateSessionPlayerId());

  const [hasEnteredLobby, setHasEnteredLobby] = useState<boolean>(initialDirectLobby);
  const [shellState, setShellState] = useState<GameShellState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [studentName, setStudentName] = useState<string>('Honchkrow93');
  const [blockSection, setBlockSection] = useState<string>('BSCS-3A');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [progressionAccountId, setProgressionAccountId] = useState<string>('guest');
  const [scholarProgress, setScholarProgress] = useState<ScholarProgress>(() => createScholarProgress());
  const [selectedHero, setSelectedHero] = useState<HeroId>('shadow_shinobi');
  const [selectedMode, setSelectedMode] = useState<GameMode>('pvp');

  const [initialDeckState] = useState(() => loadSavedDecks(progressionAccountId));
  const [decks, setDecks] = useState<QuizDeck[]>(initialDeckState.decks);
  const [activeDeck, setActiveDeck] = useState<QuizDeck>(initialDeckState.activeDeck);
  const [battleDeck, setBattleDeck] = useState<QuizDeck>(initialDeckState.activeDeck);
  const [deckStorageAccount, setDeckStorageAccount] = useState(progressionAccountId);

  // Mandatory Pre-Battle Room/Invite & PDF/Notes Reference tracking
  const [hasCustomNotes, setHasCustomNotes] = useState<boolean>(initialAutostart);
  const [hasRoomOrInvite, setHasRoomOrInvite] = useState<boolean>(initialAutostart);
  const [startBattleAfterNotes, setStartBattleAfterNotes] = useState<boolean>(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [battleSetupOpen, setBattleSetupOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Character Customization State (Sex, Outfit, Accent Glow)
  const [characterGender, setCharacterGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [outfitStyle, setOutfitStyle] = useState<string>('cozy');
  const [accentColor, setAccentColor] = useState<string>('amber');
  const [characterStyleReadyFor, setCharacterStyleReadyFor] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState<boolean>(false);
  const characterAppearance = useMemo(
    () => ({ gender: characterGender, outfitStyle, accentColor }),
    [characterGender, outfitStyle, accentColor]
  );

  // Real-time Classmate Invitations & Live Directory
  const [invitations, setInvitations] = useState<BattleInvitation[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomItem[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerSummary[]>([]);
  const [chatMessages, setChatMessages] = useState<LobbyChatMessage[]>([]);
  const [roomJoinError, setRoomJoinError] = useState<string | null>(null);

  // Track whether the player is actively joined in a room (chatbox & top room bar only show when joined in a room)
  const [isJoinedInRoom, setIsJoinedInRoom] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const paramRoom = new URLSearchParams(window.location.search).get('room');
      return Boolean(paramRoom && paramRoom.trim().length >= 3);
    }
    return false;
  });

  // Multiplayer Room & Classmates State (Supports ?room=CODE in shared links)
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const paramRoom = new URLSearchParams(window.location.search).get('room');
      if (paramRoom && paramRoom.trim().length >= 3) {
        return paramRoom.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      }
    }
    return 'CS3A99';
  });

  // Initialize with ONLY the real local player (zero simulated bots)
  const [classmates, setClassmates] = useState<ClassmateMember[]>(() => [
    {
      id: localPlayerId,
      name: 'Honchkrow93',
      blockSection: 'BSCS-3A',
      heroId: 'shadow_shinobi',
      cp: 2299,
      team: 'alpha',
      score: 1420,
      damageDealt: 0,
      isReady: true,
      isHost: true,
    },
  ]);

  // Active Battle State
  const [combat, setCombat] = useState<BattleCombatState>(() =>
    createInitialCombatState('pvp', 'shadow_shinobi')
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeRemainingSec, setTimeRemainingSec] = useState(120);
  const [battleDurationSec, setBattleDurationSec] = useState(180);
  const [useShieldNext, setUseShieldNext] = useState(false);
  const [combatEvent, setCombatEvent] = useState<CombatVisualEvent | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  useEffect(() => {
    if (deckStorageAccount === progressionAccountId) return;
    const saved = loadSavedDecks(progressionAccountId);
    setDecks(saved.decks);
    setActiveDeck(saved.activeDeck);
    setBattleDeck(saved.activeDeck);
    setDeckStorageAccount(progressionAccountId);
  }, [progressionAccountId, deckStorageAccount]);

  useEffect(() => {
    if (deckStorageAccount !== progressionAccountId) return;
    try {
      localStorage.setItem(`eduquests-quiz-decks:${progressionAccountId}`, JSON.stringify({
        decks,
        activeDeckId: activeDeck.id,
      }));
    } catch {
      setLiveToast('Could not save your quiz decks in this browser.');
    }
  }, [progressionAccountId, deckStorageAccount, decks, activeDeck]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`eduquests-character-style:${progressionAccountId}`) || 'null') as {
        gender?: 'male' | 'female' | 'neutral';
        outfitStyle?: string;
        accentColor?: string;
      } | null;
      if (saved?.gender) setCharacterGender(saved.gender);
      if (saved?.outfitStyle) setOutfitStyle(saved.outfitStyle);
      if (saved?.accentColor) setAccentColor(saved.accentColor);
    } catch {
      setLiveToast('Could not load saved character appearance.');
    }
    setCharacterStyleReadyFor(progressionAccountId);
  }, [progressionAccountId]);

  useEffect(() => {
    if (characterStyleReadyFor !== progressionAccountId) return;
    try {
      localStorage.setItem(`eduquests-character-style:${progressionAccountId}`, JSON.stringify({
        gender: characterGender,
        outfitStyle,
        accentColor,
      }));
    } catch {
      setLiveToast('Could not save character appearance in this browser.');
    }
  }, [progressionAccountId, characterStyleReadyFor, characterGender, outfitStyle, accentColor]);

  const [lastFeedback, setLastFeedback] = useState<{
    isCorrect: boolean;
    damageDealt: number;
    counterDamage: number;
    explanation: string;
    selectedIndex: number;
    correctIndex: number;
    selectedAnswer?: string;
    correctAnswer?: string;
    blockedByPlayer?: boolean;
  } | null>(null);

  const [runSnapshot, setRunSnapshot] = useState<{
    mode: GameMode;
    score: number;
    bestScore: number;
    accuracyPct: number;
    questionsAnswered: number;
    totalQuestions: number;
    clearTimeSec: number;
    totalDamage: number;
    bossHpRemaining: number;
    victory: boolean;
  } | null>(null);

  const questionStartRef = useRef<number>(performance.now());
  const battleStartRef = useRef<number>(performance.now());
  const gameFinalizedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bestScoreRef = useRef<number>(1420);

  const showToast = useCallback((text: string) => {
    setLiveToast(text);
    setTimeout(() => {
      setLiveToast((prev) => (prev === text ? null : prev));
    }, 2800);
  }, []);

  const buildLocalMember = useCallback(
    (nameOverride?: string, blockOverride?: string, heroOverride?: HeroId): ClassmateMember => {
      const heroId = heroOverride ?? selectedHero;
      const hero = HEROES.find((h) => h.id === heroId) ?? HEROES[0];
      return {
        id: localPlayerId,
        name: nameOverride ?? studentName,
        blockSection: blockOverride ?? blockSection,
        heroId,
        cp: hero.cp,
        team: 'alpha',
        score: 1420,
        damageDealt: 0,
        isReady: true,
      };
    },
    [localPlayerId, studentName, blockSection, selectedHero]
  );

  useEffect(() => {
    const oauthToken = new URLSearchParams(window.location.search).get('auth_token');
    const oauthError = new URLSearchParams(window.location.search).get('auth_error');
    if (oauthToken) {
      saveAccountToken(oauthToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      showToast(decodeURIComponent(oauthError));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    getCurrentAccount()
      .then(({ account }) => {
        setStudentName(account.username);
        setBlockSection(account.blockSection || account.block_section || 'BSCS-3A');
        setIsLoggedIn(true);
        setProgressionAccountId(account.id);
        syncScholarProgress(account.id, 0, true).then(setScholarProgress).catch(() => {});
      })
      .catch(() => clearAccountToken());
  }, []);

  // Mirror shellState to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  // Connect to Real-Time WebSocket Room Server
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        const member = buildLocalMember();
        socket?.send(
          JSON.stringify({
            type: 'player:identify',
            player: {
              id: member.id,
              name: member.name,
              blockSection: member.blockSection,
              heroId: member.heroId,
              cp: member.cp,
            },
          })
        );

        const paramRoom = new URLSearchParams(window.location.search).get('room');
        if (paramRoom && paramRoom.trim().length >= 3) {
          const cleanCode = paramRoom.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
          socket?.send(
            JSON.stringify({
              type: 'room:join',
              roomCode: cleanCode,
              mode: selectedMode,
              member,
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'server:directory') {
            if (Array.isArray(msg.availableRooms)) {
              setAvailableRooms(msg.availableRooms);
            }
            if (Array.isArray(msg.onlinePlayers)) {
              setOnlinePlayers(msg.onlinePlayers);
            }
          } else if (
            (msg.type === 'room:joined' ||
              msg.type === 'room:updated' ||
              msg.type === 'room:deck_synced') &&
            msg.room
          ) {
            if (msg.room.code) {
              setRoomCode(msg.room.code);
            }
            if (Array.isArray(msg.room.members) && msg.room.members.length > 0) {
              setClassmates(msg.room.members);
            }
            if (Array.isArray(msg.room.messages)) {
              setChatMessages(msg.room.messages);
            }
            setRoomJoinError(null);
            if (msg.type === 'room:joined') {
              setIsJoinedInRoom(true);
              setHasRoomOrInvite(true);
              setRoomModalOpen(false);
              setBattleSetupOpen(true);
              showToast(`Joined Room #${msg.room.code} (${msg.room.members?.length ?? 1}/6 players)`);
            }
            if (msg.type === 'room:deck_synced' && msg.room.deck) {
              setActiveDeck(msg.room.deck);
              setHasCustomNotes(true);
              showToast(`Room synced new deck: ${msg.room.deck.title}`);
            }
          } else if (msg.type === 'room:join_error') {
            setRoomJoinError(msg.error || 'Unable to join room.');
            showToast(msg.error || 'Unable to join room.');
          } else if (msg.type === 'room:left') {
            setIsJoinedInRoom(false);
            setChatMessages([]);
            setClassmates([buildLocalMember()]);
          } else if (msg.type === 'chat:message' && msg.message) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === msg.message.id)) return prev;
              return [...prev, msg.message];
            });
          } else if (msg.type === 'invite:received' && msg.invitation) {
            setInvitations((prev) => {
              if (prev.some((inv) => inv.id === msg.invitation.id)) return prev;
              return [msg.invitation, ...prev];
            });
            showToast(`Battle Invite received from @${msg.invitation.username}!`);
          } else if (msg.type === 'battle:hit' && msg.memberId !== localPlayerId) {
            showToast(`${msg.memberName} dealt ${msg.damage} DMG!`);
          }
        } catch {
          // Ignore malformed WS event
        }
      };
    } catch {
      // Fallback gracefully if WS cannot open
    }

    return () => {
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPlayerId]);

  // Keep player identity synced with server when profile name, block, or hero changes
  useEffect(() => {
    const member = buildLocalMember(studentName, blockSection, selectedHero);
    setClassmates((prev) =>
      prev.map((m) =>
        m.id === localPlayerId
          ? {
              ...m,
              name: studentName,
              blockSection,
              heroId: selectedHero,
              cp: member.cp,
            }
          : m
      )
    );
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'player:identify',
          player: {
            id: member.id,
            name: member.name,
            blockSection: member.blockSection,
            heroId: member.heroId,
            cp: member.cp,
          },
        })
      );
    }
  }, [studentName, blockSection, selectedHero, localPlayerId, buildLocalMember]);

  const launchActualBattle = useCallback(
    (
      modeOverride?: GameMode,
      heroOverride?: HeroId,
      durationOverride?: number,
      deckOverride?: QuizDeck
    ) => {
      const targetMode = modeOverride ?? selectedMode;
      const targetHero = heroOverride ?? selectedHero;
      const targetDeck = deckOverride ?? activeDeck;
      const spec = BATTLE_MODES[targetMode];

      soundFX.playClick();
      const shuffledDeck = shuffleQuizDeck(targetDeck);
      setBattleDeck(shuffledDeck);
      gameFinalizedRef.current = false;
      setCombat(createInitialCombatState(targetMode, targetHero));
      setQuestionIndex(0);
      setTimeRemainingSec(
        durationOverride !== undefined
          ? durationOverride
          : battleDurationSec > 0
            ? battleDurationSec
            : spec.timeLimitSec
      );
      setLastFeedback(null);
      setUseShieldNext(false);
      setRunSnapshot(null);
      questionStartRef.current = performance.now();
      battleStartRef.current = performance.now();
      document.body.dataset.state = 'playing';
      setShellState('playing');
    },
    [selectedMode, selectedHero, battleDurationSec, activeDeck]
  );

  const restartCurrentBattle = useCallback(
    () => launchActualBattle(selectedMode, undefined, battleDurationSec, battleDeck),
    [launchActualBattle, selectedMode, battleDurationSec, battleDeck]
  );

  // Enforce mandatory pre-battle Room/Invite + PDF/notes reference before fighting in any mode
  const handleRequestStartBattle = useCallback(
    (modeOverride?: GameMode, durationOverride?: number) => {
      if (modeOverride) {
        setSelectedMode(modeOverride);
      }
      if (durationOverride !== undefined) {
        setBattleDurationSec(durationOverride);
      }
      if (!hasCustomNotes || !hasRoomOrInvite) {
        soundFX.playClick();
        setStartBattleAfterNotes(true);
        setAiModalOpen(true);
        return;
      }
      launchActualBattle(modeOverride, undefined, durationOverride);
    },
    [hasCustomNotes, hasRoomOrInvite, launchActualBattle]
  );

  const finalizeGameOver = useCallback(
    (finalState: BattleCombatState, isVictory: boolean) => {
      if (gameFinalizedRef.current) return;
      gameFinalizedRef.current = true;
      const elapsedSec = Math.max(
        1,
        Math.round((performance.now() - battleStartRef.current) / 1000)
      );
      const accuracyPct =
        finalState.answeredCount > 0
          ? Math.round((finalState.correctCount / finalState.answeredCount) * 100)
          : 0;
      const runScore = finalState.totalDamageDealt * 2 + finalState.correctCount * 150;
      bestScoreRef.current = Math.max(bestScoreRef.current, runScore);
      if (finalState.answeredCount > 0) {
        void recordBattleReward(progressionAccountId, {
          isVictory,
          isPerfect: finalState.correctCount === finalState.answeredCount,
        }).catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'Unable to save achievement progress.');
        });
      }
      const completionXp = finalState.answeredCount === 0 ? 0 : isVictory ? 100 : 25;
      void syncScholarProgress(progressionAccountId, completionXp, true)
        .then(setScholarProgress)
        .catch(() => {});
      if (completionXp > 0) {
        showToast(`${isVictory ? 'Battle victory' : 'Battle complete'} · +${completionXp} XP`);
      }

      setRunSnapshot({
        mode: finalState.mode,
        score: runScore,
        bestScore: bestScoreRef.current,
        accuracyPct,
        questionsAnswered: finalState.answeredCount,
        totalQuestions: battleDeck.questions.length,
        clearTimeSec: elapsedSec,
        totalDamage: finalState.totalDamageDealt,
        bossHpRemaining: finalState.enemyHp,
        victory: isVictory,
      });
      soundFX.playOutcome(isVictory);
      document.body.dataset.state = 'gameover';
      setShellState('gameover');
    },
    [progressionAccountId, showToast, battleDeck.questions.length]
  );

  // Countdown timer during active battle (for Raid, PvP, Team modes)
  useEffect(() => {
    if (shellState !== 'playing') return;
    if (combat.mode === 'training') return;

    const timer = window.setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeGameOver(combat, combat.enemyHp === 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [shellState, combat, finalizeGameOver]);

  const currentQuestion =
    battleDeck.questions[questionIndex] ??
    battleDeck.questions[0] ??
    activeDeck.questions[0];

  const handleAnswerQuestion = useCallback(
    (answer: number | string) => {
      if (shellState !== 'playing' || lastFeedback) return;

      const timeTakenSec = Math.max(
        0.8,
        (performance.now() - questionStartRef.current) / 1000
      );
      const isFreeResponse = currentQuestion.questionType === 'identification' ||
        currentQuestion.questionType === 'fill_in_blank';
      const correctAnswer = currentQuestion.correctAnswer ??
        currentQuestion.options[currentQuestion.correctIndex] ?? '';
      const isCorrect = typeof answer === 'number'
        ? answer === currentQuestion.correctIndex
        : isFreeResponse && normalizeFreeResponse(answer) === normalizeFreeResponse(correctAnswer);
      const selectedIndex = typeof answer === 'number' ? answer : -1;

      const { nextState, result, shieldUsedByPlayer } = applyBattleTurn(combat, {
        isCorrect,
        answerTimeSec: timeTakenSec,
        heroId: selectedHero,
        useShieldOnWrong: useShieldNext,
        isChargedMove: false,
        allyCount: Math.max(1, classmates.length - 1),
      });

      setCombat(nextState);
      if (shieldUsedByPlayer) {
        setUseShieldNext(false);
        showToast('Block Activated! Blocked 100% of classmate damage!');
      }

      if (isCorrect) {
        soundFX.playFastAttack();
        void syncScholarProgress(progressionAccountId, 25, true).then(setScholarProgress).catch(() => {});
        setCombatEvent({
          id: Date.now(),
          type: 'player_fast',
          isCritical: result.isCritical,
        });

        // Broadcast damage to connected classmates in WebSocket room
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'battle:attack',
              roomCode,
              memberId: localPlayerId,
              damage: result.totalDamage,
            })
          );
        }
      } else {
        soundFX.playEnemyCounter(shieldUsedByPlayer);
        setCombatEvent({
          id: Date.now(),
          type: 'enemy_counter',
        });
      }

      setLastFeedback({
        isCorrect,
        damageDealt: result.totalDamage,
        counterDamage: result.enemyCounterDamage,
        explanation: currentQuestion.explanation,
        selectedIndex,
        correctIndex: currentQuestion.correctIndex,
        selectedAnswer: typeof answer === 'string' ? answer.trim() : undefined,
        correctAnswer,
        blockedByPlayer: shieldUsedByPlayer,
      });

      if (nextState.status === 'victory' || nextState.status === 'defeat') {
        setTimeout(() => {
          finalizeGameOver(nextState, nextState.status === 'victory');
        }, 550);
      } else if (questionIndex + 1 >= battleDeck.questions.length) {
        setTimeout(() => {
          finalizeGameOver(nextState, isBattleVictoryAtQuestionLimit(nextState));
        }, 550);
      }
    },
    [
      shellState,
      lastFeedback,
      currentQuestion,
      combat,
      selectedHero,
      useShieldNext,
      classmates.length,
      roomCode,
      localPlayerId,
      showToast,
      finalizeGameOver,
      progressionAccountId,
      questionIndex,
      battleDeck.questions.length,
    ]
  );

  const handleNextQuestion = useCallback(() => {
    if (!lastFeedback) return;
    soundFX.playClick();
    if (questionIndex + 1 >= battleDeck.questions.length) {
      finalizeGameOver(combat, isBattleVictoryAtQuestionLimit(combat));
      return;
    }
    setLastFeedback(null);
    setQuestionIndex((prev) => prev + 1);
    questionStartRef.current = performance.now();
  }, [lastFeedback, questionIndex, battleDeck.questions.length, combat, finalizeGameOver]);

  const handleTriggerChargedMove = useCallback(
    (moveName: string) => {
      if (shellState !== 'playing' || combat.energy < 100) return;

      soundFX.playChargedMove();
      const { nextState, result, shieldUsedByEnemy } = applyBattleTurn(combat, {
        isCorrect: true,
        answerTimeSec: 2.0,
        heroId: selectedHero,
        isChargedMove: true,
        allyCount: Math.max(1, classmates.length - 1),
      });

      setCombat(nextState);
      setCombatEvent({
        id: Date.now(),
        type: 'player_charged',
        isCritical: true,
      });

      showToast(
        shieldUsedByEnemy
          ? `${moveName}! Opponent used Block (${result.totalDamage} DMG)!`
          : `${moveName} UNLEASHED! Massive ${result.totalDamage} DMG!`
      );

      if (nextState.status === 'victory') {
        setTimeout(() => {
          finalizeGameOver(nextState, true);
        }, 600);
      }
    },
    [shellState, combat, selectedHero, classmates.length, showToast, finalizeGameOver]
  );

  const handleToggleMute = useCallback(() => {
    soundFX.muted = !soundFX.muted;
    setMuted(soundFX.muted);
  }, []);

  // Unified Window Keyboard Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (aiModalOpen || roomModalOpen || battleSetupOpen) {
        if (e.key === 'Escape') {
          setAiModalOpen(false);
          setStartBattleAfterNotes(false);
          setRoomModalOpen(false);
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
        return;
      }

      if (shellState === 'title') {
        if (!hasEnteredLobby) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (selectedMode === 'training' || isJoinedInRoom) {
            setBattleSetupOpen(true);
          } else {
            setRoomJoinError(null);
            setRoomModalOpen(true);
          }
        }
      } else if (shellState === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          document.body.dataset.state = 'paused';
          setShellState('paused');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          restartCurrentBattle();
        } else if (e.key === ' ' && combat.energy >= 100 && !lastFeedback) {
          e.preventDefault();
          const hero = HEROES.find((h) => h.id === selectedHero) ?? HEROES[0];
          handleTriggerChargedMove(hero.chargedAttackName);
        } else if (e.key === 'Enter' && lastFeedback) {
          e.preventDefault();
          handleNextQuestion();
        } else if (!lastFeedback && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          handleAnswerQuestion(Number(e.key) - 1);
        }
      } else if (shellState === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          document.body.dataset.state = 'playing';
          setShellState('playing');
        }
      } else if (shellState === 'gameover') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          restartCurrentBattle();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    aiModalOpen,
    roomModalOpen,
    battleSetupOpen,
    shellState,
    hasEnteredLobby,
    selectedMode,
    isJoinedInRoom,
    combat.energy,
    lastFeedback,
    selectedHero,
    handleToggleMute,
    restartCurrentBattle,
    handleTriggerChargedMove,
    handleNextQuestion,
    handleAnswerQuestion,
  ]);

  const handleLoginStudent = async (name: string, block: string, password = '') => {
    try {
      const result = await loginAccount({ username: name, password });
      saveAccountToken(result.token);
      setProgressionAccountId(result.account.id);
      syncScholarProgress(result.account.id, 0, true).then(setScholarProgress).catch(() => {});
      setStudentName(result.account.username);
      setBlockSection(result.account.blockSection || result.account.block_section || block);
      setIsLoggedIn(true);
      setHasEnteredLobby(true);
      soundFX.playClick();
    } catch (error: any) {
      showToast(error?.message || 'Unable to sign in.');
      throw error instanceof Error ? error : new Error(error?.message || 'Unable to sign in.');
    }
  };

  const handleRegisterStudent = async (name: string, block: string, password = '', _confirmPassword = '') => {
    try {
      if (password.length < 8) throw new Error('Password must be at least 8 characters.');
      if (_confirmPassword && password !== _confirmPassword) throw new Error('Passwords do not match.');
      const result = await registerAccount({
        username: name,
        password,
        confirmPassword: _confirmPassword || password,
        blockSection: block,
      });
      saveAccountToken(result.token);
      setProgressionAccountId(result.account.id);
      syncScholarProgress(result.account.id, 0, true).then(setScholarProgress).catch(() => {});
      setStudentName(result.account.username);
      setBlockSection(result.account.blockSection || result.account.block_section || block);
      setIsLoggedIn(true);
      setHasEnteredLobby(true);
      soundFX.playClick();
    } catch (error: any) {
      showToast(error?.message || 'Unable to create account.');
      throw error instanceof Error ? error : new Error(error?.message || 'Unable to create account.');
    }
  };

  const handleLogoutStudent = () => {
    soundFX.playClick();
    clearAccountToken();
    setProgressionAccountId('guest');
    setScholarProgress(createScholarProgress());
    setIsLoggedIn(false);
    setHasEnteredLobby(false);
  };

  const handleClaimDailyReward = async () => {
    try {
      const reward = await createDailyReward(progressionAccountId, scholarProgress.streak);
      const updated = await syncScholarProgress(
        progressionAccountId,
        reward.accountSynced ? 0 : reward.xp,
        !reward.accountSynced
      );
      setScholarProgress(updated);
      showToast(`Daily reward claimed: +${reward.xp} XP!`);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to claim daily reward.');
      return false;
    }
  };

  const handleClaimAchievement = async (achievementId: string) => {
    try {
      const reward = await claimAchievementReward(progressionAccountId, achievementId, scholarProgress);
      const updated = await syncScholarProgress(
        progressionAccountId,
        reward.accountSynced ? 0 : reward.xp,
        !reward.accountSynced
      );
      setScholarProgress(updated);
      showToast(`Achievement reward claimed: +${reward.xp} XP!`);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to claim achievement reward.');
      return false;
    }
  };

  const handleCreateRoom = useCallback(
    (roomName: string, password?: string) => {
      soundFX.playClick();
      setRoomJoinError(null);
      const generatedCode = `RM${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const member = buildLocalMember();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'room:create',
            roomCode: generatedCode,
            roomName: roomName.trim() || `${studentName}'s Study Room`,
            password: password || undefined,
            mode: selectedMode,
            topic: activeDeck.title,
            member,
          })
        );
      } else {
        setRoomCode(generatedCode);
        setClassmates([{ ...member, isHost: true }]);
        setIsJoinedInRoom(true);
        setHasRoomOrInvite(true);
        setRoomModalOpen(false);
        setBattleSetupOpen(true);
        showToast(`Created Room #${generatedCode}`);
      }
    },
    [buildLocalMember, studentName, selectedMode, activeDeck.title, showToast]
  );

  const handleJoinRoomCode = useCallback(
    (code: string, password?: string) => {
      soundFX.playClick();
      setRoomJoinError(null);
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      if (!cleanCode) return;
      const member = buildLocalMember();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'room:join',
            roomCode: cleanCode,
            password: password || undefined,
            mode: selectedMode,
            topic: activeDeck.title,
            member,
          })
        );
      } else {
        setRoomCode(cleanCode);
        setClassmates([member]);
        setIsJoinedInRoom(true);
        setHasRoomOrInvite(true);
        setRoomModalOpen(false);
        setBattleSetupOpen(true);
        showToast(`Joined Room #${cleanCode}`);
      }
    },
    [buildLocalMember, selectedMode, activeDeck.title, showToast]
  );

  const handleLeaveRoom = useCallback(() => {
    soundFX.playClick();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room:leave',
          roomCode,
        })
      );
    }
    setIsJoinedInRoom(false);
    setChatMessages([]);
    setClassmates([buildLocalMember()]);
    showToast('Left the room.');
  }, [roomCode, buildLocalMember, showToast]);

  const handleSendChatMessage = useCallback(
    (text: string, attachment?: LobbyAttachment) => {
      if (!isJoinedInRoom) return;
      const trimmed = text.trim();
      if (!trimmed && !attachment) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat:send',
            roomCode,
            senderId: localPlayerId,
            sender: studentName,
            text: trimmed,
            attachment,
          })
        );
      } else {
        const fallbackMsg: LobbyChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: localPlayerId,
          sender: studentName,
          text: trimmed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachment,
        };
        setChatMessages((prev) => [...prev, fallbackMsg]);
      }
    },
    [isJoinedInRoom, roomCode, localPlayerId, studentName]
  );

  const handleDeleteChatMessage = useCallback((messageId: string) => {
    setChatMessages((current) => current.filter((message) => message.id !== messageId));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat:delete', roomCode, messageId }));
    }
  }, [roomCode]);

  const handleSendInviteUsername = useCallback(
    (username: string, mode: GameMode) => {
      soundFX.playClick();
      const cleaned = username.replace(/^@/, '').trim();
      if (!cleaned) return;

      const activeCode = roomCode || 'CS3A99';
      if (!isJoinedInRoom) {
        handleJoinRoomCode(activeCode);
      }

      const newInvite: BattleInvitation = {
        id: `inv-${Date.now()}`,
        username: cleaned,
        blockSection,
        mode,
        deckTitle: activeDeck.title,
        roomCode: activeCode,
        direction: 'outgoing',
        status: 'pending',
        timestamp: 'Just now',
      };

      setInvitations((prev) => [newInvite, ...prev]);
      setHasRoomOrInvite(true);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'invite:send',
            targetUsername: cleaned,
            fromUsername: studentName,
            fromBlockSection: blockSection,
            roomCode: activeCode,
            mode,
            deckTitle: activeDeck.title,
          })
        );
      }
      showToast(`Sent battle invite to @${cleaned} for Room #${activeCode}`);
    },
    [roomCode, isJoinedInRoom, handleJoinRoomCode, blockSection, activeDeck.title, studentName, showToast]
  );

  const handleAcceptInvite = useCallback(
    (inviteId: string) => {
      soundFX.playClick();
      const target = invitations.find((i) => i.id === inviteId);
      setInvitations((prev) => prev.filter((item) => item.id !== inviteId));
      setHasRoomOrInvite(true);
      if (target) {
        setSelectedMode(target.mode);
        if (target.deckTitle) {
          const matchedDeck = decks.find((d) => d.title === target.deckTitle);
          if (matchedDeck) {
            setActiveDeck(matchedDeck);
          }
          setHasCustomNotes(true);
        }
        if (target.roomCode) {
          handleJoinRoomCode(target.roomCode);
        } else {
          setIsJoinedInRoom(true);
        }
        showToast(
          `Joined @${target.username}'s room${target.roomCode ? ` #${target.roomCode}` : ''}!`
        );
      }
    },
    [invitations, decks, handleJoinRoomCode, showToast]
  );

  const handleDismissInvite = (id: string) => {
    soundFX.playClick();
    setInvitations((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSyncDeckToRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room:sync_deck',
          roomCode,
          deck: activeDeck,
        })
      );
    }
    showToast(`Synced "${activeDeck.title}" with Room ${roomCode}`);
  };

  const handleDeckCreated = (
    newDeck: QuizDeck,
    _source: string,
    shouldStartBattle: boolean,
    durationSec?: number
  ) => {
    setDecks((prev) => [newDeck, ...prev]);
    setActiveDeck(newDeck);
    setHasCustomNotes(true);
    setHasRoomOrInvite(true);
    setStartBattleAfterNotes(false);
    showToast(`Saved to Inventory & Loaded Topic: ${newDeck.title}`);

    if (shouldStartBattle) {
      launchActualBattle(undefined, undefined, durationSec, newDeck);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none">
      {/* Non-pressable Three.js 3D Stage (Cozy Study Room + Squad + Battle Arenas) */}
      <ThreeStage
        shellState={shellState}
        mode={selectedMode}
        selectedHero={selectedHero}
        appearance={characterAppearance}
        combatEvent={combatEvent}
        classmates={isJoinedInRoom ? classmates : []}
        localPlayerId={localPlayerId}
      />

      {/* Starting / Login Page with Circular Game Preview (shown before entering the actual Lobby) */}
      {shellState === 'title' && !hasEnteredLobby && (
        <StartingLoginPage
          defaultUsername={studentName}
          defaultBlockSection={blockSection}
          onLoginEnter={handleLoginStudent}
          onRegisterEnter={handleRegisterStudent}
        />
      )}

      {/* Main Lobby Overlay (Title State after entering from the Starting Login Page) */}
      {shellState === 'title' && hasEnteredLobby && (
        <LobbyOverlay
          localPlayerId={localPlayerId}
          studentName={studentName}
          blockSection={blockSection}
          isLoggedIn={isLoggedIn}
          onLoginStudent={handleLoginStudent}
          onRegisterStudent={handleRegisterStudent}
          onLogoutStudent={handleLogoutStudent}
          selectedMode={selectedMode}
          onSelectMode={(m) => {
            soundFX.playClick();
            setSelectedMode(m);
            setHasCustomNotes(false);
          }}
          activeDeck={activeDeck}
          hasCustomNotes={hasCustomNotes}
          onOpenInventoryModal={(startAfter = false) => {
            setStartBattleAfterNotes(Boolean(startAfter));
            setAiModalOpen(true);
          }}
          onOpenBattleSetup={(mode) => {
            if (mode) setSelectedMode(mode);
            setBattleSetupOpen(true);
          }}
          onOpenRoomModal={() => {
            setRoomJoinError(null);
            setRoomModalOpen(true);
          }}
          onStartBattle={(durationSec) => handleRequestStartBattle(undefined, durationSec)}
          roomCode={roomCode}
          isJoinedInRoom={isJoinedInRoom}
          classmates={classmates}
          onlinePlayers={onlinePlayers}
          chatMessages={chatMessages}
          onSendChatMessage={handleSendChatMessage}
          onDeleteChatMessage={handleDeleteChatMessage}
          invitations={invitations}
          onSendInviteUsername={handleSendInviteUsername}
          onAcceptInvite={handleAcceptInvite}
          onDismissInvite={handleDismissInvite}
          onOpenCustomizer={() => setCustomizerOpen(true)}
          selectedHero={selectedHero}
          onSelectHero={setSelectedHero}
          characterGender={characterGender}
          onChangeCharacterGender={setCharacterGender}
          outfitStyle={outfitStyle}
          onChangeOutfitStyle={setOutfitStyle}
          accentColor={accentColor}
          onChangeAccentColor={setAccentColor}
          muted={muted}
          onToggleMute={handleToggleMute}
          scholarProgress={scholarProgress}
          rewardAccountId={progressionAccountId}
          onClaimDailyReward={handleClaimDailyReward}
          onClaimAchievementReward={handleClaimAchievement}
        />
      )}

      {/* Character Customization Modal (Sex & Outfit) */}
      <CharacterCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        selectedHero={selectedHero}
        onSelectHero={setSelectedHero}
        gender={characterGender}
        onChangeGender={setCharacterGender}
        outfitStyle={outfitStyle}
        onChangeOutfitStyle={setOutfitStyle}
        accentColor={accentColor}
        onChangeAccentColor={setAccentColor}
      />

      {/* Active Battle HUD + Bottom Quiz Dock */}
      {shellState !== 'title' && (
        <BattleHud
          combat={combat}
          heroId={selectedHero}
          studentName={isLoggedIn ? studentName : 'Guest'}
          deck={battleDeck}
          currentQuestion={currentQuestion}
          questionIndex={questionIndex}
          timeRemainingSec={timeRemainingSec}
          useShieldNext={useShieldNext}
          onToggleShieldNext={() => setUseShieldNext((prev) => !prev)}
          lastFeedback={lastFeedback}
          onAnswerQuestion={handleAnswerQuestion}
          onNextQuestion={handleNextQuestion}
          onTriggerChargedMove={handleTriggerChargedMove}
          onPause={() => {
            document.body.dataset.state = 'paused';
            setShellState('paused');
          }}
          onRestart={restartCurrentBattle}
          onExitToLobby={() => {
            document.body.dataset.state = 'title';
            setShellState('title');
          }}
          muted={muted}
          onToggleMute={handleToggleMute}
          classmates={classmates}
          liveToast={liveToast}
        />
      )}

      <BattleSetupModal
        isOpen={battleSetupOpen}
        selectedMode={selectedMode}
        roomCode={roomCode}
        isHost={
          classmates.find((member) => member.id === localPlayerId)?.isHost ??
          !isJoinedInRoom
        }
        localPlayerId={localPlayerId}
        classmates={classmates}
        decks={decks}
        activeDeck={activeDeck}
        onSelectDeck={(deck) => {
          setActiveDeck(deck);
          setHasCustomNotes(true);
          showToast(`Selected ${deck.title} for the battle`);
        }}
        onCreateStudyDeck={(deck) => {
          setDecks((current) => [deck, ...current]);
          setActiveDeck(deck);
          setHasCustomNotes(true);
          showToast(`Loaded battle material: ${deck.title}`);
        }}
        onStartBattle={(durationSec, questionCount) => {
          const cappedCount = Math.min(questionCount, activeDeck.questions.length);
          const selectedDeck = {
            ...activeDeck,
            questions: activeDeck.questions.slice(0, cappedCount),
          };
          setBattleDurationSec(durationSec);
          setHasCustomNotes(true);
          setHasRoomOrInvite(true);
          setBattleSetupOpen(false);
          launchActualBattle(selectedMode, undefined, durationSec, selectedDeck);
        }}
        onClose={() => setBattleSetupOpen(false)}
      />

      {/* Inventory & PDF/Notes Storage Modal */}
      <InventoryModal
        isOpen={aiModalOpen}
        accountId={progressionAccountId}
        startBattleAfter={startBattleAfterNotes}
        selectedMode={selectedMode}
        onStartBattle={(durationSec) => {
          setAiModalOpen(false);
          setStartBattleAfterNotes(false);
          launchActualBattle(undefined, undefined, durationSec);
        }}
        roomCode={roomCode}
        hasRoomOrInvite={hasRoomOrInvite}
        classmates={classmates}
        decks={decks}
        activeDeck={activeDeck}
        onSelectDeck={(deck) => {
          setActiveDeck(deck);
          setHasCustomNotes(true);
          showToast(`Active Topic set to: ${deck.title}`);
        }}
        onCreateOrJoinRoom={(code) => {
          handleJoinRoomCode(code);
        }}
        onInviteClassmateUsername={(username) =>
          handleSendInviteUsername(username, selectedMode)
        }
        onClose={() => {
          setAiModalOpen(false);
          setStartBattleAfterNotes(false);
        }}
        onLaunchDeck={(deck, durationSec) => {
          setActiveDeck(deck);
          setHasCustomNotes(true);
          setAiModalOpen(false);
          setStartBattleAfterNotes(false);
          launchActualBattle(undefined, undefined, durationSec, deck);
        }}
        onDeckCreated={handleDeckCreated}
      />

      {/* Classmate Multiplayer Room Modal */}
      <ClassmateRoomModal
        isOpen={roomModalOpen}
        onClose={() => {
          setRoomJoinError(null);
          setRoomModalOpen(false);
        }}
        roomCode={roomCode}
        isJoinedInRoom={isJoinedInRoom}
        onLeaveRoom={handleLeaveRoom}
        onJoinRoomCode={handleJoinRoomCode}
        onCreateRoom={handleCreateRoom}
        availableRooms={availableRooms}
        classmates={classmates}
        joinError={roomJoinError}
        onInvitePlayer={(username) => handleSendInviteUsername(username, selectedMode)}
        activeDeck={activeDeck}
        onSyncDeckToRoom={handleSyncDeckToRoom}
        onStartQuizTogether={(mode) => handleRequestStartBattle(mode)}
      />

      {/* Pause / Victory / Defeat Status Modal */}
      <StatusModal
        shellState={shellState}
        Snapshot={runSnapshot}
        onResume={() => {
          document.body.dataset.state = 'playing';
          setShellState('playing');
        }}
        onRestart={restartCurrentBattle}
        onReturnToTitle={() => {
          document.body.dataset.state = 'title';
          setShellState('title');
        }}
      />
    </main>
  );
}
