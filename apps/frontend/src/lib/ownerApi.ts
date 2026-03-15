/**
 * Owner API client - all calls to /api/owner/*
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('owner_token');
}

export function saveToken(token: string): void {
  localStorage.setItem('owner_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('owner_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function ownerFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

// --- Auth ---

export async function requestOTP(phone: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/owner/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error al enviar código');
}

export async function verifyOTP(phone: string, code: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/owner/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Código incorrecto');
  saveToken(data.data.token);
  return data.data.token;
}

// --- Listings ---

export async function getOwnerListings(): Promise<any[]> {
  const res = await ownerFetch('/api/owner/listings');
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getOwnerListing(id: string): Promise<any> {
  const res = await ownerFetch(`/api/owner/listings/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function updateListing(id: string, payload: { rawText?: string; name?: string }): Promise<void> {
  const res = await ownerFetch(`/api/owner/listings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

export async function approveListing(id: string): Promise<void> {
  const res = await ownerFetch(`/api/owner/listings/${id}/approve`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

// --- Media ---

export async function uploadMedia(listingId: string, file: File): Promise<any> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/api/owner/listings/${listingId}/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function deleteMedia(listingId: string, mediaId: string): Promise<void> {
  const res = await ownerFetch(`/api/owner/listings/${listingId}/media/${mediaId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

// --- Availability ---

export async function saveAvailability(
  listingId: string,
  blocks: { dateFrom: string; dateTo: string }[]
): Promise<void> {
  const res = await ownerFetch(`/api/owner/listings/${listingId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ blocks }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}
