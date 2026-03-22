import { createInMemoryAuthState } from './auth-state';
import type { SessionRecord, SessionStatus } from './types';
import { createPublicCode, createSessionId } from '../utils/id';
import { logger } from '../utils/logger';

class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly publicCodes = new Set<string>();

  createSession(phoneNumber: string): SessionRecord {
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
      phoneNumber,
      authState: createInMemoryAuthState(),
      sessionString: null,
      sessionDeliveredAt: null,
      socket: null,
      pairingCode: null,
      status: 'connecting',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.publicCodes.add(publicCode);

    logger.info({ sessionId, publicCode, phoneNumber }, 'Session created');

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
}

export const sessionManager = new SessionManager();
