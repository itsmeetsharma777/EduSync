import type { WorkspaceData } from '../types';

const apiRoot = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const apiBase = apiRoot ? (apiRoot.endsWith('/api') ? apiRoot : `${apiRoot}/api`) : '';
async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(apiBase + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, credentials: 'include' });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? 'The request could not be completed.');
  return payload;
}
export const apiConfigured = Boolean(apiBase);
export async function loadWorkspace() {
  const result = await request<{ workspace: WorkspaceData | null }>('/workspace');
  return result.workspace;
}
export async function persistWorkspace(data: WorkspaceData) {
  await request('/api/workspace', { method: 'PUT', body: JSON.stringify(data) });
}

export async function submitFeedback(message: string) {
  await request('/feedback', { method: 'POST', body: JSON.stringify({ message }) });
}
