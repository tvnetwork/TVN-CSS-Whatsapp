import { createInMemoryAuthState } from './auth-state';
import type { SessionRecord, SessionStatus } from './types';
import { createPublicCode, createSessionId } from '../utils/id';
import { logger } from '../utils/logger';

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

    const session: SessionRecord = {
      sessionId,
      publicCode,
      authState: createInMemoryAuthState(),
      socket: null,
      qr: null,
      status: 'connecting',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.publicCodes.add(publicCode);

    logger.info({ sessionId, publicCode }, 'Session created');

    return session;
  }

  getSession(sessionId: string): SessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionRecord>): SessionRecord | undefined {
    const current = this.sessions.get(sessionId);
    if (!current) {
      return undefined;
    }

    const next = { ...current, ...updates };
    this.sessions.set(sessionId, next);
    return next;
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
        if (typeof session.socket.end === 'function') {
          session.socket.end(new Error('Session deleted'));
        }
      } catch (error) {
        logger.warn({ err: error, sessionId }, 'Failed to shut down socket while deleting session');
      }
    }

    this.sessions.delete(sessionId);
    this.publicCodes.delete(session.publicCode);
    logger.info({ sessionId }, 'Session deleted');

    return true;
  }
}

export const sessionManager = new SessionManager();
