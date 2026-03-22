export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

const buildUrl = (path: string): string => {
  if (!API_BASE) {
    throw new Error('NEXT_PUBLIC_API_BASE is not configured');
  }

  return `${API_BASE.replace(/\/$/, '')}${path}`;
};

export interface PairSessionResponse {
  sessionId: string;
  publicCode: string;
  pairingCode: string;
}

export interface SessionResponse {
  sessionId: string;
  publicCode: string;
  pairingCode: string | null;
  phoneNumber: string;
  status: 'connecting' | 'connected' | 'disconnected';
  createdAt: string;
}

export interface SessionStatusResponse {
  status: SessionResponse['status'];
}

export const createPairSession = async (number: string): Promise<PairSessionResponse> => {
  const response = await fetch(buildUrl('/session/pair'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ number }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Unable to generate pairing code');
  }

  return response.json() as Promise<PairSessionResponse>;
};

export const fetchSession = async (sessionId: string): Promise<SessionResponse> => {
  const response = await fetch(buildUrl(`/session/${sessionId}`), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to fetch session');
  }

  return response.json() as Promise<SessionResponse>;
};

export const fetchSessionStatus = async (sessionId: string): Promise<SessionStatusResponse> => {
  const response = await fetch(buildUrl(`/session/${sessionId}/status`), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to fetch session status');
  }

  return response.json() as Promise<SessionStatusResponse>;
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const response = await fetch(buildUrl(`/session/${sessionId}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Unable to delete session');
  }
};
