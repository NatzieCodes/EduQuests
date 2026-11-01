import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import {
  ClassmateMember,
  GameMode,
  HeroId,
  QuizDeck,
  QuizQuestion,
  parseNotesIntoFallbackQuestions,
} from './src/game/rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface RoomChatMsg {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  timestamp: string;
  attachment?: {
    type: 'photo' | 'video' | 'link' | 'pdf' | 'notes';
    title: string;
    url?: string;
    subtitle?: string;
  };
}

interface MultiplayerRoom {
  code: string;
  name: string;
  host: string;
  topic: string;
  isPrivate: boolean;
  password?: string;
  mode: GameMode;
  deck: QuizDeck | null;
  members: ClassmateMember[];
  messages: RoomChatMsg[];
  bossHp: number;
  bossMaxHp: number;
  status: 'lobby' | 'playing';
}

interface ConnectedClientMeta {
  playerId: string;
  name: string;
  blockSection: string;
  heroId: HeroId;
  cp: number;
  roomCode: string | null;
}

const MAX_ROOM_PLAYERS = 6;
const rooms = new Map<string, MultiplayerRoom>();
const clientMetaMap = new Map<WebSocket, ConnectedClientMeta>();

function serializePublicRooms() {
  return Array.from(rooms.values()).map((r) => ({
    code: r.code,
    name: r.name,
    host: r.host,
    topic: r.deck?.title || r.topic || 'Data Structures & Algorithms',
    isPrivate: r.isPrivate,
    mode: r.mode,
    memberCount: r.members.length,
    members: r.members,
    status: r.status,
  }));
}

function serializeOnlinePlayers() {
  const unique = new Map<
    string,
    { id: string; name: string; blockSection: string; heroId: HeroId; roomCode: string | null }
  >();
  for (const meta of clientMetaMap.values()) {
    unique.set(meta.playerId, {
      id: meta.playerId,
      name: meta.name,
      blockSection: meta.blockSection,
      heroId: meta.heroId,
      roomCode: meta.roomCode,
    });
  }
  return Array.from(unique.values());
}

function broadcastDirectory() {
  const publicRooms = serializePublicRooms();
  const payload = JSON.stringify({
    type: 'server:directory',
    rooms: publicRooms,
    availableRooms: publicRooms,
    onlinePlayers: serializeOnlinePlayers(),
  });
  for (const ws of clientMetaMap.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function broadcastRoomState(roomCode: string, eventType = 'room:updated') {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify({
    type: eventType,
    room: {
      code: room.code,
      name: room.name,
      host: room.host,
      topic: room.deck?.title || room.topic,
      isPrivate: room.isPrivate,
      mode: room.mode,
      deck: room.deck,
      members: room.members,
      messages: room.messages,
      bossHp: room.bossHp,
      bossMaxHp: room.bossMaxHp,
      status: room.status,
    },
  });
  for (const [ws, meta] of clientMetaMap.entries()) {
    if (meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function removePlayerFromCurrentRoom(ws: WebSocket) {
  const meta = clientMetaMap.get(ws);
  if (!meta || !meta.roomCode) return;
  const oldCode = meta.roomCode;
  meta.roomCode = null;
  const room = rooms.get(oldCode);
  if (!room) return;
  room.members = room.members.filter((m) => m.id !== meta.playerId);
  if (room.members.length === 0) {
    rooms.delete(oldCode);
  } else {
    if (!room.members.some((m) => m.isHost)) {
      room.members[0].isHost = true;
      room.host = room.members[0].name;
    }
    broadcastRoomState(oldCode, 'room:updated');
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  const allowedOrigin = process.env.APP_URL?.replace(/\/$/, '') || '';
  app.use((req, res, next) => {
    if (allowedOrigin && req.headers.origin && req.headers.origin === allowedOrigin) {
      res.header('Access-Control-Allow-Origin', allowedOrigin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  }) : null;

  async function ensureAccountsTable() {
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(32) UNIQUE NOT NULL,
        email VARCHAR(254) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        block_section VARCHAR(64) NOT NULL DEFAULT 'BSCS-3A',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  if (pool) {
    ensureAccountsTable().catch((error) => console.error('Account table initialization failed:', error));
  }

  const jwtSecret = process.env.JWT_SECRET || '';

  function accountToken(account: { id: string; username: string; email: string; block_section: string }) {
    if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
    return jwt.sign(
      { sub: account.id, username: account.username, blockSection: account.block_section },
      jwtSecret,
      { expiresIn: '30d' }
    );
  }

  function getBearer(req: express.Request) {
    const header = req.headers.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : '';
  }

  app.post('/api/auth/register', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Account database is not configured.' });
    try {
      const username = String(req.body?.username || '').trim().replace(/^@/, '').slice(0, 32);
      const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
      const password = String(req.body?.password || '');
      const blockSection = String(req.body?.blockSection || 'BSCS-3A').trim().slice(0, 64);
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-32 letters, numbers, underscores, or hyphens.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      await ensureAccountsTable();
      const passwordHash = await bcrypt.hash(password, 12);
      const result = await pool.query(
        `INSERT INTO accounts (username, email, password_hash, block_section)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, block_section`,
        [username, email, passwordHash, blockSection]
      );
      const account = result.rows[0];
      res.status(201).json({ account, token: accountToken(account) });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ error: 'That username or email is already registered.' });
      console.error('Registration failed:', error);
      res.status(500).json({ error: 'Unable to create account.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Account database is not configured.' });
    try {
      const username = String(req.body?.username || '').trim().replace(/^@/, '').toLowerCase();
      const password = String(req.body?.password || '');
      await ensureAccountsTable();
      const result = await pool.query(
        `SELECT id, username, email, password_hash, block_section FROM accounts WHERE LOWER(username) = $1`,
        [username]
      );
      const account = result.rows[0];
      if (!account || !(await bcrypt.compare(password, account.password_hash))) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
      res.json({
        account: {
          id: account.id,
          username: account.username,
          email: account.email,
          blockSection: account.block_section,
        },
        token: accountToken(account),
      });
    } catch (error) {
      console.error('Login failed:', error);
      res.status(500).json({ error: 'Unable to sign in.' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Account database is not configured.' });
    try {
      const token = getBearer(req);
      if (!token) return res.status(401).json({ error: 'Not signed in.' });
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      const result = await pool.query(
        `SELECT id, username, email, block_section FROM accounts WHERE id = $1`,
        [payload.sub]
      );
      if (!result.rows[0]) return res.status(401).json({ error: 'Account not found.' });
      res.json({ account: result.rows[0] });
    } catch {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
  });

  app.delete('/api/auth/me', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Account database is not configured.' });
    try {
      const token = getBearer(req);
      if (!token) return res.status(401).json({ error: 'Not signed in.' });
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      await pool.query(`DELETE FROM accounts WHERE id = $1`, [payload.sub]);
      res.json({ deleted: true });
    } catch {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
  });

  // Live rooms & online players endpoint
  app.get('/api/rooms', (_req, res) => {
    res.json({
      rooms: serializePublicRooms(),
      onlinePlayers: serializeOnlinePlayers(),
    });
  });

  // Gemini AI Quiz Generation from pasted PDF text / study notes / topic
  app.post('/api/quiz/generate', async (req, res) => {
    const { title, subject, notes, questionCount = 6 } = req.body ?? {};
    const cleanTitle = String(title || 'Custom Study Topic').trim();
    const cleanSubject = String(subject || 'Class Review').trim();
    const cleanNotes = String(notes || '').trim();

    if (!cleanNotes || cleanNotes.length < 15) {
      res.status(400).json({
        error: 'Please paste at least a short paragraph of study notes, PDF text, or topic details.',
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasRealKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10);

    if (hasRealKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const count = Math.min(Math.max(Number(questionCount) || 6, 4), 100);
        const prompt = `You are an expert university professor and interactive game quiz designer for EduQuests.
Generate ${count} multiple-choice quiz battle questions based on the following student study notes / PDF extract / topic.
Topic Title: ${cleanTitle}
Subject/Course: ${cleanSubject}
Study Notes / Material:
"""
${cleanNotes.slice(0, 12000)}
"""

Requirements:
- Each question must test genuine conceptual understanding, definitions, problem-solving, or cause-and-effect from the material.
- Provide exactly 4 clear, plausible options per question (no "All of the above").
- Set correctIndex to the 0-based index (0, 1, 2, or 3) of the correct option.
- Provide a concise, helpful 1-2 sentence explanation so students learn while battling.`;

        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: {
                      type: Type.STRING,
                      description: 'The multiple-choice question prompt.',
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exactly 4 answer choices.',
                    },
                    correctIndex: {
                      type: Type.INTEGER,
                      description: '0-based index (0-3) of the correct option.',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'Concise educational explanation of the correct answer.',
                    },
                    conceptTag: {
                      type: Type.STRING,
                      description: 'Short 1-3 word subtopic tag.',
                    },
                    difficulty: {
                      type: Type.STRING,
                      description: 'One of: Standard, Advanced, Boss Challenge',
                    },
                  },
                  required: ['question', 'options', 'correctIndex', 'explanation', 'conceptTag', 'difficulty'],
                },
              },
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 1800)
          ),
        ]);

        const rawJson = (response.text ?? '[]').trim();
        const parsed = JSON.parse(rawJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const questions: QuizQuestion[] = parsed.map((item: any, idx: number) => {
            const opts = Array.isArray(item.options) ? item.options.slice(0, 4) : [];
            while (opts.length < 4) {
              opts.push(`Option ${opts.length + 1}`);
            }
            const cIdx = Number(item.correctIndex);
            const validIdx = Number.isInteger(cIdx) && cIdx >= 0 && cIdx < 4 ? cIdx : 0;
            const diff =
              item.difficulty === 'Advanced' || item.difficulty === 'Boss Challenge'
                ? item.difficulty
                : 'Standard';

            return {
              id: `ai-${Date.now()}-${idx}`,
              question: String(item.question || `Question ${idx + 1}`),
              options: [String(opts[0]), String(opts[1]), String(opts[2]), String(opts[3])],
              correctIndex: validIdx,
              explanation: String(item.explanation || 'Review the concept in your study notes.'),
              conceptTag: String(item.conceptTag || cleanTitle).slice(0, 28),
              difficulty: diff,
            };
          });

          const deck: QuizDeck = {
            id: `deck-ai-${Date.now()}`,
            title: cleanTitle,
            subject: cleanSubject,
            sourceSummary: cleanNotes.slice(0, 160) + (cleanNotes.length > 160 ? '...' : ''),
            createdAt: new Date().toISOString().slice(0, 10),
            questions,
          };

          res.json({ deck, source: 'gemini-3.8-flash' });
          return;
        }
      } catch (err: any) {
        console.warn('Gemini generation fallback triggered:', err?.message || err);
      }
    }

    // Fallback: deterministic extraction from the student's pasted notes so the app works even without an API key
    const fallbackQuestions = parseNotesIntoFallbackQuestions(cleanTitle, cleanNotes, Number(questionCount) || 10);
    const deck: QuizDeck = {
      id: `deck-notes-${Date.now()}`,
      title: cleanTitle,
      subject: cleanSubject,
      sourceSummary: cleanNotes.slice(0, 160) + (cleanNotes.length > 160 ? '...' : ''),
      createdAt: new Date().toISOString().slice(0, 10),
      questions: fallbackQuestions,
    };

    res.json({ deck, source: 'notes-extractor' });
  });

  const server = http.createServer(app);

  // WebSocket Server for Real-Time Classmate Rooms & Raid / PvP / Team Sync
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    // Send initial directory immediately on connect
    const publicRooms = serializePublicRooms();
    ws.send(
      JSON.stringify({
        type: 'server:directory',
        rooms: publicRooms,
        availableRooms: publicRooms,
        onlinePlayers: serializeOnlinePlayers(),
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        const type = msg.type;

        if (type === 'player:identify') {
          const existing = clientMetaMap.get(ws);
          const p = msg.player || msg;
          const playerId = String(p.id || p.playerId || existing?.playerId || `player-${Date.now()}`);
          const name = String(p.name || existing?.name || 'Scholar').replace(/^@/, '').trim() || 'Scholar';
          const blockSection = String(p.blockSection || existing?.blockSection || 'BSCS-3A').trim() || 'BSCS-3A';
          const heroId = ((p.heroId as HeroId) || existing?.heroId || 'shadow_shinobi') as HeroId;
          const cp = Number(p.cp) || existing?.cp || 2299;

          const meta: ConnectedClientMeta = {
            playerId,
            name,
            blockSection,
            heroId,
            cp,
            roomCode: existing?.roomCode ?? null,
          };
          clientMetaMap.set(ws, meta);

          // If player is already in a room, update their member info in that room
          if (meta.roomCode) {
            const room = rooms.get(meta.roomCode);
            if (room) {
              const memberIdx = room.members.findIndex((m) => m.id === playerId);
              if (memberIdx >= 0) {
                room.members[memberIdx] = {
                  ...room.members[memberIdx],
                  name,
                  blockSection,
                  heroId,
                  cp,
                };
                if (room.members[memberIdx].isHost) {
                  room.host = name;
                }
                broadcastRoomState(meta.roomCode, 'room:updated');
              }
            }
          }

          broadcastDirectory();
        } else if (type === 'room:create' || type === 'room:join') {
          const meta = clientMetaMap.get(ws);
          const playerId = String(msg.member?.id || meta?.playerId || `player-${Date.now()}`);
          const name = String(msg.member?.name || meta?.name || 'Scholar').replace(/^@/, '').trim() || 'Scholar';
          const blockSection = String(msg.member?.blockSection || meta?.blockSection || 'BSCS-3A');
          const heroId = ((msg.member?.heroId as HeroId) || meta?.heroId || 'shadow_shinobi') as HeroId;
          const cp = Number(msg.member?.cp || meta?.cp || 2299);

          const code =
            String(msg.roomCode || 'CS3A99')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 10) || 'CS3A99';

          let room = rooms.get(code);

          if (!room) {
            const rawPassword = String(msg.password || '').trim();
            const isPrivate = Boolean(rawPassword.length > 0);
            room = {
              code,
              name: String(msg.roomName || `Room #${code}`).trim(),
              host: name,
              topic: String(msg.topic || msg.deck?.title || 'Data Structures & Algorithms'),
              isPrivate,
              password: isPrivate ? rawPassword : undefined,
              mode: (msg.mode as GameMode) || 'pvp',
              deck: msg.deck || null,
              members: [],
              messages: [],
              bossHp: 2400,
              bossMaxHp: 2400,
              status: 'lobby',
            };
            rooms.set(code, room);
          } else if (type === 'room:join') {
            const alreadyInRoom = room.members.some((m) => m.id === playerId);
            if (!alreadyInRoom && room.members.length >= MAX_ROOM_PLAYERS) {
              ws.send(
                JSON.stringify({
                  type: 'room:join_error',
                  roomCode: code,
                  error: `Room #${code} is full (${MAX_ROOM_PLAYERS}/${MAX_ROOM_PLAYERS} players).`,
                })
              );
              return;
            }
            if (!alreadyInRoom && room.isPrivate && room.password) {
              const attempt = String(msg.password || '').trim();
              if (attempt !== room.password) {
                ws.send(
                  JSON.stringify({
                    type: 'room:join_error',
                    roomCode: code,
                    error: 'Incorrect password for this private room.',
                  })
                );
                return;
              }
            }
          }

          // If switching from another room, remove from previous room first
          if (meta && meta.roomCode && meta.roomCode !== code) {
            removePlayerFromCurrentRoom(ws);
          }

          const member: ClassmateMember = {
            id: playerId,
            name,
            blockSection,
            heroId,
            cp,
            team: room.members.length % 2 === 0 ? 'alpha' : 'omega',
            score: 0,
            damageDealt: 0,
            isReady: true,
          };

          const existingIdx = room.members.findIndex((m) => m.id === playerId);
          if (existingIdx >= 0) {
            room.members[existingIdx] = {
              ...room.members[existingIdx],
              ...member,
              score: room.members[existingIdx].score,
              damageDealt: room.members[existingIdx].damageDealt,
              isHost: room.members[existingIdx].isHost,
            };
          } else {
            member.isHost = room.members.length === 0;
            room.members.push(member);
          }

          clientMetaMap.set(ws, {
            playerId,
            name,
            blockSection,
            heroId,
            cp,
            roomCode: code,
          });

          broadcastRoomState(code, 'room:joined');
          broadcastDirectory();
        } else if (type === 'room:leave') {
          removePlayerFromCurrentRoom(ws);
          ws.send(JSON.stringify({ type: 'room:left' }));
          broadcastDirectory();
        } else if (type === 'chat:send') {
          const meta = clientMetaMap.get(ws);
          const code = String(msg.roomCode || meta?.roomCode || '');
          const room = rooms.get(code);
          if (room && msg.message) {
            const chatMsg: RoomChatMsg = {
              id: String(msg.message.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
              sender: String(msg.message.sender || meta?.name || 'Scholar'),
              senderId: String(meta?.playerId || 'player'),
              text: String(msg.message.text || ''),
              timestamp: String(
                msg.message.timestamp ||
                  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              ),
              attachment: msg.message.attachment,
            };
            if (!room.messages.some((m) => m.id === chatMsg.id)) {
              room.messages.push(chatMsg);
              if (room.messages.length > 50) {
                room.messages.shift();
              }
            }
            const payload = JSON.stringify({
              type: 'chat:message',
              roomCode: code,
              message: chatMsg,
            });
            for (const [clientWs, clientMeta] of clientMetaMap.entries()) {
              if (clientMeta.roomCode === code && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(payload);
              }
            }
          }
        } else if (type === 'invite:send') {
          const meta = clientMetaMap.get(ws);
          const targetUsername = String(msg.targetUsername || '').replace(/^@/, '').trim().toLowerCase();
          const senderName = String(msg.fromUsername || meta?.name || 'Scholar').replace(/^@/, '');
          const senderBlock = String(msg.blockSection || meta?.blockSection || 'BSCS-3A');
          const roomCode = String(msg.roomCode || meta?.roomCode || 'CS3A99');
          const mode = ((msg.mode as GameMode) || 'pvp') as GameMode;
          const deckTitle = String(msg.deckTitle || 'Data Structures & Algorithms');

          const invitePayload = JSON.stringify({
            type: 'invite:received',
            invitation: {
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              username: senderName,
              blockSection: senderBlock,
              roomCode,
              mode,
              deckTitle,
              direction: 'incoming',
              status: 'pending',
              timestamp: 'Just now',
            },
          });

          for (const [clientWs, clientMeta] of clientMetaMap.entries()) {
            if (clientWs === ws || clientWs.readyState !== WebSocket.OPEN) continue;
            if (
              !targetUsername ||
              clientMeta.name.toLowerCase() === targetUsername ||
              clientMeta.playerId.toLowerCase() === targetUsername
            ) {
              clientWs.send(invitePayload);
            }
          }
        } else if (type === 'room:sync_deck') {
          const meta = clientMetaMap.get(ws);
          const code = String(msg.roomCode || meta?.roomCode || '');
          const room = rooms.get(code);
          if (room && msg.deck) {
            room.deck = msg.deck;
            room.topic = msg.deck.title;
            broadcastRoomState(code, 'room:deck_synced');
            broadcastDirectory();
          }
        } else if (type === 'battle:attack') {
          const meta = clientMetaMap.get(ws);
          const code = String(msg.roomCode || meta?.roomCode || '');
          const room = rooms.get(code);
          if (room) {
            const damage = Math.max(0, Number(msg.damage) || 0);
            room.bossHp = Math.max(0, room.bossHp - damage);
            const member = room.members.find((m) => m.id === (msg.memberId || meta?.playerId));
            if (member) {
              member.damageDealt += damage;
              member.score += damage * 2;
            }
            const eventPayload = JSON.stringify({
              type: 'battle:hit',
              memberId: msg.memberId || meta?.playerId,
              memberName: member?.name || meta?.name || 'Classmate',
              damage,
              bossHp: room.bossHp,
            });
            for (const [clientWs, clientMeta] of clientMetaMap.entries()) {
              if (clientMeta.roomCode === code && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(eventPayload);
              }
            }
          }
        }
      } catch {
        // Ignore malformed socket message
      }
    });

    ws.on('close', () => {
      removePlayerFromCurrentRoom(ws);
      clientMetaMap.delete(ws);
      broadcastDirectory();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`EduQuests server running on http://localhost:${PORT}`);
  });
}

startServer();
