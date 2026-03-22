import { createPublicCode, createSessionId } from '../utils/id';
import { logger } from '../utils/logger';
import { createInMemoryAuthState } from './auth-state';
import type { SessionRecord, SessionStatus } from './types';

class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly publicCodes = new Set<string>();

  createSession(): SessionRecord {
    let sessionId = createSessionId();
    while (this.sessions.has(sessionId)) {
      sessionId = createSessionId();
    }

    let publicCode = createPublicCode();
    while (this.publicCodes.has(publicCode)) {
      publicCode = createPublicCode();
    }

    const record: SessionRecord = {
      sessionId,
      publicCode,
      authState: createInMemoryAuthState(),
      socket: null,
      qr: null,
      status: 'connecting',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, record);
    this.publicCodes.add(publicCode);

    logger.info({ sessionId, publicCode }, 'Session created');

    return record;
  }

  getSession(sessionId: string): SessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, patch: Partial<SessionRecord>): SessionRecord | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    const nextSession = { ...session, ...patch };
    this.sessions.set(sessionId, nextSession);
    return nextSession;
  }

  setStatus(sessionId: string, status: SessionStatus): SessionRecord | undefined {
    return this.updateSession(sessionId, { status });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.socket) {
      try {
        session.socket.ev.removeAllListeners('connection.update');
        session.socket.ev.removeAllListeners('creds.update');
        session.socket.end(new Error('Session deleted'));
      } catch (error) {
        logger.warn({ err: error, sessionId }, 'Failed while closing socket during delete');
      }
    }

    this.sessions.delete(sessionId);
    this.publicCodes.delete(session.publicCode);
    logger.info({ sessionId }, 'Session deleted');

    return true;
  }

  listSessions(): SessionRecord[] {
    return [...this.sessions.values()];
  }
}

export const sessionManager = new SessionManager();
