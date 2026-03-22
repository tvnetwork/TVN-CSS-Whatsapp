import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} from 'baileys';
import Boom from '@hapi/boom';

import { sessionManager } from '../sessions/session-manager';
import { logger } from '../utils/logger';

const reconnectableReasons = new Set<number>([
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionLost,
  DisconnectReason.connectionReplaced,
  DisconnectReason.restartRequired,
  DisconnectReason.timedOut,
  DisconnectReason.multideviceMismatch,
]);

const reconnectAttempts = new Map<string, number>();

const getReconnectDelay = (attempt: number): number => Math.min(30_000, 2_000 * attempt);

const shouldReconnect = (statusCode?: number): boolean => {
  if (statusCode === DisconnectReason.loggedOut) {
    return false;
  }

  if (!statusCode) {
    return true;
  }

  return reconnectableReasons.has(statusCode);
};

const sendConnectionMessage = async (sessionId: string): Promise<void> => {
  const session = sessionManager.getSession(sessionId);
  if (!session?.socket?.user?.id) {
    return;
  }

  const jid = jidNormalizedUser(session.socket.user.id);
  const timestamp = new Date().toISOString();

  await session.socket.sendMessage(jid, {
    text: [
      '✅ TVN Connected Successfully',
      `Public Session Code: ${session.publicCode}`,
      `Connected At: ${timestamp}`,
    ].join('\n'),
  });
};

const scheduleReconnect = (sessionId: string, statusCode?: number): void => {
  if (!shouldReconnect(statusCode)) {
    logger.info({ sessionId, statusCode }, 'Reconnect skipped for session');
    return;
  }

  const attempt = (reconnectAttempts.get(sessionId) || 0) + 1;
  reconnectAttempts.set(sessionId, attempt);

  const delay = getReconnectDelay(attempt);
  logger.info({ sessionId, attempt, delay, statusCode }, 'Scheduling session reconnect');

  setTimeout(() => {
    void startSession(sessionId);
  }, delay);
};

export const startSession = async (sessionId: string): Promise<void> => {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.socket) {
    try {
      session.socket.ev.removeAllListeners('connection.update');
      session.socket.ev.removeAllListeners('creds.update');
      session.socket.end(new Error('Refreshing session socket'));
    } catch (error) {
      logger.warn({ err: error, sessionId }, 'Failed to close existing socket before restart');
    }
  }

  sessionManager.updateSession(sessionId, { status: 'connecting', qr: null, socket: null });

  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    version,
    auth: session.authState.state,
    browser: Browsers.ubuntu('TVN CSS Engine'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    defaultQueryTimeoutMs: 60_000,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    logger,
  });

  sessionManager.updateSession(sessionId, { socket });

  socket.ev.on('creds.update', async () => {
    try {
      await session.authState.saveCreds();
      logger.debug({ sessionId }, 'Credentials updated');
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed to persist credentials');
    }
  });

  socket.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessionManager.updateSession(sessionId, { qr, status: 'connecting' });
      logger.info({ sessionId }, 'QR updated for session');
    }

    if (connection === 'open') {
      reconnectAttempts.delete(sessionId);
      sessionManager.updateSession(sessionId, { status: 'connected', qr: null });
      logger.info({ sessionId, publicCode: session.publicCode }, 'Session connected');

      try {
        await sendConnectionMessage(sessionId);
      } catch (error) {
        logger.error({ err: error, sessionId }, 'Failed to send connection confirmation message');
      }
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      sessionManager.updateSession(sessionId, { status: 'disconnected', socket: null });
      logger.warn({ sessionId, statusCode, lastDisconnect }, 'Session disconnected');
      scheduleReconnect(sessionId, statusCode);
    }
  });
};
