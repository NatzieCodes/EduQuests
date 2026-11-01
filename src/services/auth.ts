export interface EduQuestsAccount {
  id: string;
  username: string;
  blockSection?: string;
  block_section?: string;
}

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
const TOKEN_KEY = 'eduquests-account-token';
const LOCAL_ACCOUNTS_KEY = 'eduquests-local-accounts';
const LOCAL_TOKEN_PREFIX = 'local-account-token:';

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

