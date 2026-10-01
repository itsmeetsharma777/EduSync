export type AuthRole = 'student' | 'admin';
export type AuthUser = {
  id: string; fullName: string; email: string; phone: string; role: AuthRole;
  isEmailVerified: boolean; avatarUrl?: string; isSuspended?: boolean;
};
type LocalAccount = AuthUser & { passwordHash: string; isSuspended?: boolean };
const sessionKey = 'edusync-auth-session';
const accountsKey = 'edusync-demo-accounts';
const apiRoot = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

function makeId() { return `user-${crypto.randomUUID()}`; }
async function hashPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function readAccounts(): LocalAccount[] {
  try { return JSON.parse(localStorage.getItem(accountsKey) ?? '[]') as LocalAccount[]; } catch { return []; }
}
function writeAccounts(accounts: LocalAccount[]) { localStorage.setItem(accountsKey, JSON.stringify(accounts)); }
export const apiConfigured = Boolean(apiRoot);
export function readSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) ?? 'null') as AuthUser | null; } catch { return null; }
}
export function saveSession(user: AuthUser) { localStorage.setItem(sessionKey, JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem(sessionKey); }

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiRoot}${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, credentials: 'include',
  });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? 'The request could not be completed.');
  return payload;
}

export async function createAccount(input: { fullName: string; email: string; phone: string; password: string }) {
  if (apiRoot) {
    const payload = await request<{ user: AuthUser }>('/auth/sign-up', { method: 'POST', body: JSON.stringify({ ...input, confirmPassword: input.password, acceptedTerms: true }) });
    saveSession(payload.user); return payload.user;
  }
  const accounts = readAccounts(); const email = input.email.toLowerCase();
  if (accounts.some((account) => account.email === email)) throw new Error('An account with this email already exists.');
  const account: LocalAccount = { id: makeId(), fullName: input.fullName, email, phone: input.phone, role: 'student', isEmailVerified: false, passwordHash: await hashPassword(input.password) };
  writeAccounts([...accounts, account]); saveSession(account); return account;
}

export async function signIn(input: { email: string; password: string; portal: AuthRole }) {
  if (apiRoot) {
    const endpoint = input.portal === 'admin' ? '/auth/admin/sign-in' : '/auth/sign-in';
    const payload = await request<{ user: AuthUser }>(endpoint, { method: 'POST', body: JSON.stringify({ email: input.email, password: input.password }) });
    saveSession(payload.user); return payload.user;
  }
  const account = readAccounts().find((item) => item.email === input.email.toLowerCase());
  if (!account || (await hashPassword(input.password)) !== account.passwordHash) throw new Error('Invalid email or password.');
  if (account.isSuspended) throw new Error('This account is suspended.');
  if (account.role !== input.portal) throw new Error(input.portal === 'admin' ? 'This is not an administrator account.' : 'Please use the administrator portal for this account.');
  saveSession(account); return account;
}

export async function signOut() {
  if (apiRoot) await request('/auth/sign-out', { method: 'POST' }).catch(() => undefined);
  clearSession();
}
export async function summarizeLecture(input: { title: string; transcript: string; courseContext?: string }) {
  if (!apiRoot) throw new Error('Video summaries need the API URL and an OPENAI_API_KEY configured on the server.');
  return request<{ summary: string }>('/ai/lectures/summary', { method: 'POST', body: JSON.stringify(input) });
}
export function localAdminExists() { return readAccounts().some((account) => account.role === 'admin'); }
export async function createDemoAdmin(email: string, password: string) {
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === email.toLowerCase())) throw new Error('That email is already in use.');
  const account: LocalAccount = { id: makeId(), fullName: 'Workspace administrator', email: email.toLowerCase(), phone: '', role: 'admin', isEmailVerified: true, passwordHash: await hashPassword(password) };
  writeAccounts([...accounts, account]); return account;
}
export function localUsers() { return readAccounts().map(({ passwordHash: _passwordHash, ...user }) => user); }
export function updateLocalUser(user: AuthUser & { isSuspended?: boolean }) {
  writeAccounts(readAccounts().map((account) => account.id === user.id ? { ...account, ...user } : account));
}
export async function loadAdminStats() {
  if (!apiRoot) return null;
  return request<{ users: number; activeUsers: number; subjects: number }>('/admin/stats');
}

export async function listManagedUsers() {
  if (apiRoot) return (await request<{ users: AuthUser[] }>('/admin/users')).users;
  return localUsers();
}
export async function updateManagedUser(id: string, update: Partial<Pick<AuthUser, 'fullName' | 'phone' | 'role' | 'isSuspended'>>) {
  if (apiRoot) return (await request<{ user: AuthUser }>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(update) })).user;
  const current = localUsers().find((user) => user.id === id);
  if (!current) throw new Error('User not found.');
  const updated = { ...current, ...update }; updateLocalUser(updated); return updated;
}
export async function deleteManagedUser(id: string) {
  if (apiRoot) { await request(`/admin/users/${id}`, { method: 'DELETE' }); return; }
  writeAccounts(readAccounts().filter((account) => account.id !== id));
}


export async function getCurrentUser() {
  if (!apiRoot) return readSession();
  try {
    const payload = await request<{ user: AuthUser }>('/auth/me');
    saveSession(payload.user);
    return payload.user;
  } catch {
    clearSession();
    return null;
  }
}

export type SessionInfo = {
  id: string;
  device: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
};

export async function listSessions() {
  if (!apiRoot) return [];
  return (await request<{ sessions: SessionInfo[] }>('/auth/sessions')).sessions;
}

export async function revokeSession(id: string) {
  if (!apiRoot) return;
  await request(`/auth/sessions/${id}`, { method: 'DELETE' });
}

export async function requestPasswordReset(email: string) {
  if (!apiRoot) throw new Error('Password reset needs the backend API configured.');
  return request<{ message: string }>('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function resetPassword(input: { token: string; password: string; confirmPassword: string }) {
  if (!apiRoot) throw new Error('Password reset needs the backend API configured.');
  return request<{ message: string }>('/auth/password/reset', { method: 'POST', body: JSON.stringify(input) });
}
export async function verifyEmail(token: string) {
  if (!apiRoot) throw new Error('Email verification needs the backend API configured.');
  return request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}
