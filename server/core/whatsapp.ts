const baileys = require('@whiskeysockets/baileys');

import type { SessionRecord } from '../sessions/types';
import { sessionManager } from '../sessions/session-manager';
import { normalizePhoneNumber } from '../utils/phone';
import { logger } from '../utils/logger';

const makeWASocket = baileys.default;
const jidNormalizedUser = baileys.jidNormalizedUser;

const sendConnectionMessage = async (sessionId: string): Promise<void> => {
  const session = sessionManager.getSession(sessionId);
  if (!session?.socket?.user?.id) {
    return;
  }

  const jid = jidNormalizedUser(session.socket.user.id);
  await session.socket.sendMessage(jid, {
    text: '✅ TVN Connected Successfully',
  });
};

const attachConnectionHandlers = (sessionId: string, sock: any, saveCreds: () => Promise<void>): void => {
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update: any) => {
    try {
      const connection = update?.connection;

      if (connection === 'open') {
        sessionManager.updateSession(sessionId, {
          status: 'connected',
          socket: sock,
        });
        await sendConnectionMessage(sessionId);
        return;
      }

      if (connection === 'close') {
        sessionManager.updateSession(sessionId, {
          status: 'disconnected',
          socket: null,
        });
      }
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed while handling connection update');
      sessionManager.updateSession(sessionId, {
        status: 'disconnected',
      });
    }
  });
};

const buildSocket = (session: SessionRecord): any => {
  const state = session.authState.state;
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    logger,
  });

  attachConnectionHandlers(session.sessionId, sock, session.authState.saveCreds);
  return sock;
};

export const startPairingSession = async (rawNumber: string): Promise<SessionRecord> => {
  const number = normalizePhoneNumber(rawNumber);
  const session = sessionManager.createSession(number);

  try {
    const sock = buildSocket(session);
    sessionManager.updateSession(session.sessionId, {
      socket: sock,
      status: 'connecting',
    });

    const pairingCode = await sock.requestPairingCode(number);
    console.log('✅ Pairing Code:', pairingCode);

    const nextSession = sessionManager.updateSession(session.sessionId, {
      pairingCode,
      socket: sock,
      status: 'connecting',
    });

    if (!nextSession) {
      throw new Error('Unable to store session');
    }

    return nextSession;
  } catch (error) {
    logger.error({ err: error, sessionId: session.sessionId }, 'Pairing session failed');
    sessionManager.updateSession(session.sessionId, {
      status: 'disconnected',
      socket: null,
    });
    throw error;
  }
};
