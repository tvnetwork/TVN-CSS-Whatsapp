const baileys = require('@whiskeysockets/baileys');

import type { SessionRecord } from '../sessions/types';
import { sessionManager } from '../sessions/session-manager';
import { normalizePhoneNumber } from '../utils/phone';
import { logger } from '../utils/logger';

const makeWASocket = baileys.default;
const sessions: Record<string, { sock: any }> = {};
const PAIRING_CODE_POLL_INTERVAL_MS = 300;
const PAIRING_RETRY_DELAY_MS = 30000;
const PAIRING_WAIT_TIMEOUT_MS = 90000;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const toError = (error: unknown): Error => {
  return error instanceof Error ? error : new Error('Unknown error');
};

const startBot = (sock: any, sessionId: string): void => {
  if (sock.__tvnBotStarted) {
    return;
  }

  sock.__tvnBotStarted = true;
  sessions[sessionId] = {
    sock,
  };

  sock.ev.on('messages.upsert', async ({ messages }: { messages?: any[] }) => {
    try {
      const msg = messages?.[0];
      if (!msg?.message) {
        return;
      }

      if (msg.key?.fromMe) {
        return;
      }

      const jid = msg.key?.remoteJid;
      if (!jid) {
        return;
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      if (!text || !text.startsWith('.')) {
        return;
      }

      if (text === '.menu' || text === '.help') {
        await sock.sendMessage(jid, {
          text: `📌 TVN MENU

.start
.menu
.help
.ping`,
        });
        return;
      }

      if (text === '.start') {
        await sock.sendMessage(jid, {
          text: '👋 Welcome to TVN Bot',
        });
        return;
      }

      if (text === '.ping') {
        await sock.sendMessage(jid, {
          text: '🏓 Pong!',
        });
      }
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed while handling bot command');
    }
  });
};

const attachConnectionHandlers = ({
  sessionId,
  phoneNumber,
  sock,
  state,
  saveCreds,
}: {
  sessionId: string;
  phoneNumber: string;
  sock: any;
  state: SessionRecord['authState']['state'];
  saveCreds: () => Promise<void>;
}): void => {
  let isAlive = true;
  let pairingRequested = false;
  let pairingRetryTimer: NodeJS.Timeout | null = null;

  const clearPairingRetry = (): void => {
    if (pairingRetryTimer) {
      clearTimeout(pairingRetryTimer);
      pairingRetryTimer = null;
    }
  };

  const requestPairingCode = async (): Promise<void> => {
    const currentSession = sessionManager.getSession(sessionId);

    if (pairingRequested || currentSession?.pairingCode || state.creds.registered) {
      return;
    }

    pairingRequested = true;

    try {
      const pairingCode = await sock.requestPairingCode(phoneNumber);
      console.log('✅ Pairing Code:', pairingCode);

      sessionManager.updateSession(sessionId, {
        pairingCode,
        socket: sock,
        status: 'connecting',
      });
    } catch (error) {
      const pairingError = toError(error);
      pairingRequested = false;

      logger.error({ err: pairingError, sessionId }, 'Failed to request pairing code');

      if (!pairingRetryTimer) {
        pairingRetryTimer = setTimeout(() => {
          pairingRetryTimer = null;
          void requestPairingCode();
        }, PAIRING_RETRY_DELAY_MS);
      }
    }
  };

  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed while saving credentials');
    }
  });

  sock.ev.on('connection.update', async (update: any) => {
    try {
      console.log('🔄 connection.update:', JSON.stringify(update, null, 2));

      const { connection, qr } = update || {};

      if ((connection === 'connecting' || qr) && !state.creds.registered) {
        void requestPairingCode();
      }

      if (connection === 'open') {
        console.log('🎉 WhatsApp connected successfully');
        clearPairingRetry();
        isAlive = true;

        sessionManager.updateSession(sessionId, {
          status: 'connected',
          socket: sock,
        });

        sessions[sessionId] = {
          sock,
        };

        await sock.sendMessage(sock.user.id, {
          text: `🚀 TVN Bot Activated

Status: Connected ✅

Type .menu to begin`,
        });

        startBot(sock, sessionId);
        return;
      }

      if (connection === 'close') {
        console.log('❌ Connection closed');
        clearPairingRetry();
        isAlive = false;

        sessionManager.updateSession(sessionId, {
          status: 'disconnected',
          socket: null,
        });

        if (sessions[sessionId]?.sock === sock) {
          delete sessions[sessionId];
        }
      }
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed while handling connection update');
      sessionManager.updateSession(sessionId, {
        status: isAlive ? 'connecting' : 'disconnected',
      });
    }
  });
};

const buildSocket = (session: SessionRecord): any => {
  const state = session.authState.state;

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Windows', 'Chrome', '114.0.5735.198'],
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,
  });

  attachConnectionHandlers({
    sessionId: session.sessionId,
    phoneNumber: session.phoneNumber,
    sock,
    state,
    saveCreds: session.authState.saveCreds,
  });

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

    const startedAt = Date.now();

    while (true) {
      const currentSession = sessionManager.getSession(session.sessionId);

      if (!currentSession) {
        throw new Error('Unable to load session state');
      }

      if (currentSession.pairingCode) {
        return currentSession;
      }

      if (currentSession.status === 'disconnected') {
        throw new Error('Connection closed before pairing code was issued');
      }

      if (Date.now() - startedAt >= PAIRING_WAIT_TIMEOUT_MS) {
        throw new Error('Timed out while waiting for pairing code');
      }

      await sleep(PAIRING_CODE_POLL_INTERVAL_MS);
    }
  } catch (error) {
    logger.error({ err: error, sessionId: session.sessionId }, 'Pairing session failed');
    sessionManager.updateSession(session.sessionId, {
      status: 'disconnected',
      socket: null,
    });
    throw toError(error);
  }
};
