export interface EduQuestsAccount {
  id: string;
  username: string;
  blockSection?: string;
  block_section?: string;
}

export interface FriendRequest {
  id: string;
  username: string;
  blockSection: string;
  status: 'incoming' | 'outgoing' | 'accepted';
}

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
const TOKEN_KEY = 'eduquests-account-token';
const LOCAL_ACCOUNTS_KEY = 'eduquests-local-accounts';
const LOCAL_TOKEN_PREFIX = 'local-account-token:';
const LOCAL_FRIEND_REQUESTS_KEY = 'eduquests-local-friend-requests';

interface LocalAccountRecord {
  id: string;
  username: string;
  blockSection: string;
  salt: string;
  passwordHash: string;
}

const usesHostedBackend = Boolean(
  (import.meta.env.VITE_API_URL || '').trim() &&
  !(import.meta.env.VITE_API_URL || '').includes('natziecodes.github.io')
);

export function usesHostedAuthBackend() {
  return usesHostedBackend;
}

function getLocalAccounts(): LocalAccountRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '[]') as LocalAccountRecord[];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccountRecord[]) {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashLocalPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  );
  return bytesToHex(new Uint8Array(derived));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data as T;
}

export function saveAccountToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAccountToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function startGoogleLogin() {
  if (!usesHostedBackend) {
    throw new Error('Google sign-in requires the hosted EduQuests backend to be configured.');
  }
  window.location.assign(`${API_URL}/api/auth/google`);
}

export function clearAccountToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function registerAccount(input: { username: string; password: string; confirmPassword: string; blockSection: string }) {
  if (!usesHostedBackend) {
    if (input.password !== input.confirmPassword) throw new Error('Passwords do not match.');
    if (input.username.length < 3 || input.username.length > 32 || /[\u0000-\u001F\u007F]/.test(input.username)) {
      throw new Error('Username must be 3-32 characters and cannot contain control characters.');
    }
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');

    const accounts = getLocalAccounts();
    if (accounts.some(account => account.username.toLowerCase() === input.username.toLowerCase())) {
      throw new Error('That username is already registered.');
    }
    const salt = crypto.randomUUID();
    const account: LocalAccountRecord = {
      id: crypto.randomUUID(),
      username: input.username,
      blockSection: input.blockSection,
      salt,
      passwordHash: await hashLocalPassword(input.password, salt),
    };
    saveLocalAccounts([...accounts, account]);
    const token = `${LOCAL_TOKEN_PREFIX}${account.id}`;
    return {
      account: { id: account.id, username: account.username, blockSection: account.blockSection },
      token,
    };
  }
  return request<{ account: EduQuestsAccount; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

function getLocalFriendRequestRows() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FRIEND_REQUESTS_KEY) || '[]') as {
      id: string;
      requesterId: string;
      recipientId: string;
      status: 'pending' | 'accepted';
    }[];
  } catch {
    return [];
  }
}

export async function sendFriendRequest(username: string) {
  const cleanedUsername = username.trim().replace(/^@/, '');
  const token = getAccountToken();
  if (!token) throw new Error('Sign in to add friends.');
  if (!cleanedUsername) throw new Error('Enter a username.');

  if (!token.startsWith(LOCAL_TOKEN_PREFIX)) {
    return request<{ request: FriendRequest }>('/api/friends/requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: cleanedUsername }),
    });
  }

  const currentId = token.slice(LOCAL_TOKEN_PREFIX.length);
  const target = getLocalAccounts().find(
    (account) => account.username.toLowerCase() === cleanedUsername.toLowerCase()
  );
  if (!target) throw new Error(`No account exists for @${cleanedUsername}.`);
  if (target.id === currentId) throw new Error('You cannot add your own account.');

  const requests = getLocalFriendRequestRows();
  if (requests.some((item) =>
    (item.requesterId === currentId && item.recipientId === target.id) ||
    (item.requesterId === target.id && item.recipientId === currentId)
  )) {
    throw new Error(`A friend request or friendship with @${target.username} already exists.`);
  }

  const created = {
    id: crypto.randomUUID(),
    requesterId: currentId,
    recipientId: target.id,
    status: 'pending' as const,
  };
  localStorage.setItem(LOCAL_FRIEND_REQUESTS_KEY, JSON.stringify([...requests, created]));
  return { request: { id: created.id, username: target.username, blockSection: target.blockSection, status: 'outgoing' as const } };
}

export async function getFriendRequests() {
  const token = getAccountToken();
  if (!token) return [];
  if (!token.startsWith(LOCAL_TOKEN_PREFIX)) {
    const result = await request<{ requests: FriendRequest[] }>('/api/friends/requests', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return result.requests;
  }

  const accountId = token.slice(LOCAL_TOKEN_PREFIX.length);
  const accounts = getLocalAccounts();
  return getLocalFriendRequestRows().flatMap((item) => {
    const otherId = item.requesterId === accountId ? item.recipientId : item.requesterId;
    const other = accounts.find((account) => account.id === otherId);
    if (!other) return [];
    return [{
      id: item.id,
      username: other.username,
      blockSection: other.blockSection,
      status: item.status === 'accepted' ? 'accepted' as const : item.recipientId === accountId ? 'incoming' as const : 'outgoing' as const,
    }];
  });
}

export async function acceptFriendRequest(requestId: string) {
  const token = getAccountToken();
  if (!token) throw new Error('Sign in to accept friend requests.');
  if (!token.startsWith(LOCAL_TOKEN_PREFIX)) {
    return request<{ accepted: boolean }>(`/api/friends/requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'accept' }),
    });
  }
  const accountId = token.slice(LOCAL_TOKEN_PREFIX.length);
  const requests = getLocalFriendRequestRows();
  const requestIndex = requests.findIndex(
    (item) => item.id === requestId && item.recipientId === accountId && item.status === 'pending'
  );
  if (requestIndex < 0) throw new Error('Friend request not found or already handled.');
  requests[requestIndex] = { ...requests[requestIndex], status: 'accepted' };
  localStorage.setItem(LOCAL_FRIEND_REQUESTS_KEY, JSON.stringify(requests));
  return { accepted: true };
}

export async function loginAccount(input: { username: string; password: string }) {
  if (!usesHostedBackend) {
    const account = getLocalAccounts().find(
      candidate => candidate.username.toLowerCase() === input.username.trim().replace(/^@/, '').toLowerCase()
    );
    if (!account || await hashLocalPassword(input.password, account.salt) !== account.passwordHash) {
      throw new Error('Invalid username or password.');
    }
    return {
      account: { id: account.id, username: account.username, blockSection: account.blockSection },
      token: `${LOCAL_TOKEN_PREFIX}${account.id}`,
    };
  }
  return request<{ account: EduQuestsAccount; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCurrentAccount() {
  const token = getAccountToken();
  if (!token) return Promise.reject(new Error('Not signed in.'));
  if (token.startsWith(LOCAL_TOKEN_PREFIX)) {
    const accountId = token.slice(LOCAL_TOKEN_PREFIX.length);
    const account = getLocalAccounts().find(candidate => candidate.id === accountId);
    if (!account) throw new Error('Account not found.');
    return {
      account: { id: account.id, username: account.username, blockSection: account.blockSection },
    };
  }
  return request<{ account: EduQuestsAccount }>('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token },
  });
}

export async function deleteCurrentAccount() {
  const token = getAccountToken();
  if (!token) return Promise.reject(new Error('Not signed in.'));
  if (token.startsWith(LOCAL_TOKEN_PREFIX)) {
    const accountId = token.slice(LOCAL_TOKEN_PREFIX.length);
    saveLocalAccounts(getLocalAccounts().filter(account => account.id !== accountId));
    clearAccountToken();
    return { deleted: true };
  }
  return request<{ deleted: boolean }>('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  });
}
