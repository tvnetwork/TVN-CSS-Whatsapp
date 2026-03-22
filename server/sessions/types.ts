export type SessionStatus = 'connecting' | 'connected' | 'disconnected';

export interface InMemoryAuthStorage {
  creds: Record<string, unknown>;
  keys: Record<string, Record<string, unknown>>;
}

export interface CustomAuthState {
  state: {
    creds: Record<string, unknown>;
    keys: {
      get: (type: string, ids: string[]) => Promise<Record<string, unknown>>;
      set: (data: Record<string, Record<string, unknown>>) => Promise<void>;
    };
  };
  saveCreds: () => Promise<void>;
  storage: InMemoryAuthStorage;
}

export interface SessionRecord {
  sessionId: string;
  publicCode: string;
  phoneNumber: string;
  authState: CustomAuthState;
  socket: any | null;
  qr: string | null;
  pairingCode: string | null;
  status: SessionStatus;
  createdAt: string;
}
