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
  authState: CustomAuthState;
  socket: any;
  qr: string | null;
  status: SessionStatus;
  createdAt: string;
}
