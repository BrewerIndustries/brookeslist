import type { AppConfig, DateLog, Photo, Profile, ProfileCard, ProfileDetail, User } from './types';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    ...opts,
    headers: {
      ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch { /* ignore */ }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

// Auth-gated image URL (cookie is sent automatically; same-site).
export function photoUrl(key: string): string {
  return `${API_BASE}/photos/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export const api = {
  me: () => req<{ user: User }>('/auth/me').then((r) => r.user),
  login: (email: string, password: string) =>
    req<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then((r) => r.user),
  logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),

  sendFeedback: (data: { category?: string; subject?: string; message: string; page_url?: string }) =>
    req<{ ok: true }>('/feedback', { method: 'POST', body: JSON.stringify(data) }),

  listProfiles: () => req<{ profiles: ProfileCard[] }>('/profiles').then((r) => r.profiles),
  getProfile: (id: string) => req<ProfileDetail>(`/profiles/${id}`),
  createProfile: (data: Partial<Profile>) =>
    req<{ profile: Profile }>('/profiles', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.profile),
  updateProfile: (id: string, data: Partial<Profile>) =>
    req<{ profile: Profile }>(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) => r.profile),
  deleteProfile: (id: string) => req<{ ok: true }>(`/profiles/${id}`, { method: 'DELETE' }),
  setRating: (id: string, rating: number) =>
    req<{ rating: number }>(`/profiles/${id}/rating`, { method: 'PUT', body: JSON.stringify({ rating }) }),

  addPhoto: (profileId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ photo: Photo }>(`/profiles/${profileId}/photos`, { method: 'POST', body: fd }).then((r) => r.photo);
  },
  addPhotoUrl: (profileId: string, url: string) =>
    req<{ photo: Photo }>(`/profiles/${profileId}/photos/url`, { method: 'POST', body: JSON.stringify({ url }) }).then((r) => r.photo),
  deletePhoto: (photoId: string) => req<{ ok: true }>(`/photos/${photoId}`, { method: 'DELETE' }),

  addDate: (profileId: string, data: Partial<DateLog>) =>
    req<{ date: DateLog }>(`/profiles/${profileId}/dates`, { method: 'POST', body: JSON.stringify(data) }).then((r) => r.date),
  updateDate: (id: string, data: Partial<DateLog>) =>
    req<{ date: DateLog }>(`/dates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) => r.date),
  deleteDate: (id: string) => req<{ ok: true }>(`/dates/${id}`, { method: 'DELETE' }),

  getSettings: () => req<{ config: AppConfig }>('/settings').then((r) => r.config),
  updateSettings: (patch: Partial<AppConfig>) =>
    req<{ config: AppConfig }>('/admin/settings', { method: 'PUT', body: JSON.stringify(patch) }).then((r) => r.config),

  listUsers: () => req<{ users: User[] }>('/admin/users').then((r) => r.users),
  createUser: (data: { email: string; password: string; role: string; display_name?: string }) =>
    req<{ user: User }>('/admin/users', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.user),
  updateUser: (id: string, data: { role?: string; display_name?: string; password?: string }) =>
    req<{ user: User }>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) => r.user),
  deleteUser: (id: string) => req<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE' }),
};
