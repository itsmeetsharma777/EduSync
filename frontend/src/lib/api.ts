import type { WorkspaceData } from './types';

const apiRoot = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(apiRoot + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? 'The request could not be completed.');
  return payload;
}

export const apiConfigured = Boolean(apiRoot);

export async function loadWorkspace() {
  const result = await request<{ workspace: WorkspaceData | null }>('/api/workspace');
  return result.workspace;
}

export async function persistWorkspace(data: WorkspaceData) {
  await request('/api/workspace', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
