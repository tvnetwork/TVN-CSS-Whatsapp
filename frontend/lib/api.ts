export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://tvn-css-whatsapp.onrender.com';

console.log('API:', API_BASE);

const buildUrl = (path: string): string => {
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
  status: 'connecting' | 'connected' | 'disconnected';
  createdAt: string;
}

export interface SessionStatusResponse {
  status: SessionResponse['status'];
}

export const createPairSession = async (phoneNumber: string): Promise<PairSessionResponse> => {
  console.log('Sending number:', phoneNumber);

  try {
    const response = await fetch(`${API_BASE}/session/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber.replace('+', ''),
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | (PairSessionResponse & { error?: string; message?: string })
      | null;

    console.log('Response:', data);

    if (!response.ok || !data?.pairingCode || !data?.sessionId) {
      throw new Error(data?.message || data?.error || 'Failed to connect to server');
    }

    return data;
  } catch (err) {
    console.error('Fetch error:', err);
    throw new Error('Failed to connect to server');
  }
};

export const fetchSession = async (sessionId: string): Promise<SessionResponse> => {
  const response = await fetch(buildUrl(`/session/${sessionId}`), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to connect to server');
  }

  return response.json() as Promise<SessionResponse>;
};

export const fetchSessionStatus = async (sessionId: string): Promise<SessionStatusResponse> => {
  const response = await fetch(buildUrl(`/session/${sessionId}/status`), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to connect to server');
  }

  return response.json() as Promise<SessionStatusResponse>;
};
