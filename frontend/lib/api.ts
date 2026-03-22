export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

const buildUrl = (path: string): string => {
  if (!API_BASE) {
    throw new Error('NEXT_PUBLIC_API_BASE is not configured');
  }

  return `${API_BASE.replace(/\/$/, '')}${path}`;
};

export interface CreateSessionResponse {
  sessionId: string;
  publicCode: string;
  status: string;
  createdAt: string;
}

export interface SessionResponse {
  sessionId: string;
  publicCode: string;
  status: 'connecting' | 'connected' | 'disconnected';
  qr: string | null;
  createdAt: string;
}

export const createSession = async (): Promise<CreateSessionResponse> => {
  const response = await fetch(buildUrl('/session/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to create session');
  }

  return response.json() as Promise<CreateSessionResponse>;
};

export const fetchSessionQr = async (sessionId: string): Promise<SessionResponse> => {
  const response = await fetch(buildUrl(`/session/${sessionId}/qr`), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to fetch session QR');
  }

  return response.json() as Promise<SessionResponse>;
};

export const fetchSessionStatus = async (sessionId: string): Promise<SessionResponse> => {
  const response = await fetch(buildUrl(`/session/${sessionId}/status`), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to fetch session status');
  }

  return response.json() as Promise<SessionResponse>;
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const response = await fetch(buildUrl(`/session/${sessionId}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Unable to delete session');
  }
};
