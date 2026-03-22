const baileys = require('@whiskeysockets/baileys');
const Boom = require('@hapi/boom');

import { sessionManager } from '../sessions/session-manager';
import { logger } from '../utils/logger';

const makeWASocket = baileys.default;
const Browsers = baileys.Browsers;
const DisconnectReason = baileys.DisconnectReason;
const fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
const jidNormalizedUser = baileys.jidNormalizedUser;

const reconnectTimers = new Map<string, NodeJS.Timeout>();
const reconnectAttempts = new Map<string, number>();

const reconnectableReasons = new Set<number>([
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionLost,
  DisconnectReason.connectionReplaced,
  DisconnectReason.restartRequired,
  DisconnectReason.timedOut,
  DisconnectReason.multideviceMismatch,
]);

const getReconnectDelay = (attempt: number): number => {
  return Math.min(30000, 2000 * Math.max(attempt, 1));
};

const shouldReconnect = (statusCode?: number): boolean => {
  if (!statusCode) {
    return true;
  }

  if (statusCode === DisconnectReason.loggedOut) {
    return false;
  }

  return reconnectableReasons.has(statusCode);
};

const clearReconnectTimer = (sessionId: string): void => {
  const timer = reconnectTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(sessionId);
  }
};

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

const scheduleReconnect = (sessionId: string, statusCode?: number): void => {
  clearReconnectTimer(sessionId);

  if (!shouldReconnect(statusCode)) {
    logger.info({ sessionId, statusCode }, 'Reconnect skipped');
    return;
  }

  const attempt = (reconnectAttempts.get(sessionId) || 0) + 1;
  reconnectAttempts.set(sessionId, attempt);
  const delay = getReconnectDelay(attempt);

  const timer = setTimeout(() => {
    reconnectTimers.delete(sessionId);
    void startSession(sessionId);
  }, delay);

  reconnectTimers.set(sessionId, timer);
  logger.info({ sessionId, attempt, delay, statusCode }, 'Reconnect scheduled');
};

export const startSession = async (sessionId: string): Promise<void> => {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  clearReconnectTimer(sessionId);

  if (session.socket) {
    try {
      session.socket.ev.removeAllListeners('connection.update');
      session.socket.ev.removeAllListeners('creds.update');
      if (typeof session.socket.end === 'function') {
        session.socket.end(new Error('Refreshing session socket'));
      }
    } catch (error) {
      logger.warn({ err: error, sessionId }, 'Failed to close previous socket');
    }
  }

  sessionManager.updateSession(sessionId, {
    status: 'connecting',
    qr: null,
    socket: null,
  });

  try {
    const versionData = await fetchLatestBaileysVersion();
    const socket = makeWASocket({
      version: versionData.version,
      auth: session.authState.state,
      browser: Browsers.ubuntu('TVN CSS Engine'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      logger,
    });

    sessionManager.updateSession(sessionId, { socket, qr: null, status: 'connecting' });

    socket.ev.on('creds.update', async () => {
      try {
        await session.authState.saveCreds();
      } catch (error) {
        logger.error({ err: error, sessionId }, 'Failed to save credentials');
      }
    });

    socket.ev.on('connection.update', async (update: any) => {
      try {
        const connection = update?.connection;
        const qr = update?.qr;
        const lastDisconnect = update?.lastDisconnect;

        if (qr) {
          sessionManager.updateSession(sessionId, { qr, status: 'connecting' });
          logger.info({ sessionId }, 'QR generated');
        }

        if (connection === 'open') {
          reconnectAttempts.delete(sessionId);
          clearReconnectTimer(sessionId);
          sessionManager.updateSession(sessionId, {
            status: 'connected',
            qr: null,
          });
          logger.info({ sessionId }, 'Session connected');

          try {
            await sendConnectionMessage(sessionId);
          } catch (error) {
            logger.error({ err: error, sessionId }, 'Failed to send confirmation message');
          }
        }

        if (connection === 'close') {
          const statusCode = new Boom.Boom(lastDisconnect?.error)?.output?.statusCode;
          sessionManager.updateSession(sessionId, {
            status: 'disconnected',
            socket: null,
          });
          logger.warn({ sessionId, statusCode }, 'Session disconnected');
          scheduleReconnect(sessionId, statusCode);
        }
      } catch (error) {
        logger.error({ err: error, sessionId }, 'Failed while handling connection update');
      }
    });
  } catch (error) {
    sessionManager.updateSession(sessionId, {
      status: 'disconnected',
      socket: null,
    });
    logger.error({ err: error, sessionId }, 'Failed to start WhatsApp session');
    scheduleReconnect(sessionId);
  }
};
