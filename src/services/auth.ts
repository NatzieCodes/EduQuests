export interface EduQuestsAccount {
  id: string;
  username: string;
  blockSection?: string;
  block_section?: string;
}

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
const TOKEN_KEY = 'eduquests-account-token';

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

export function clearAccountToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function registerAccount(input: { username: string; password: string; blockSection: string }) {
  return request<{ account: EduQuestsAccount; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function loginAccount(input: { username: string; password: string }) {
  return request<{ account: EduQuestsAccount; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getCurrentAccount() {
  const token = getAccountToken();
  if (!token) return Promise.reject(new Error('Not signed in.'));
  return request<{ account: EduQuestsAccount }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteCurrentAccount() {
  const token = getAccountToken();
  if (!token) return Promise.reject(new Error('Not signed in.'));
  return request<{ deleted: boolean }>('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
