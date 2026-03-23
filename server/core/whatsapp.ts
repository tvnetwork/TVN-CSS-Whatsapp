const baileys = require('@whiskeysockets/baileys');
import pino = require('pino');

import type { SessionRecord } from '../sessions/types';
import { sessionManager } from '../sessions/session-manager';
import { normalizePhoneNumber } from '../utils/phone';
import { logger } from '../utils/logger';

const makeWASocket = baileys.default;
const Browsers = baileys.Browsers;
const sessions: Record<string, { sock: any }> = {};
const PAIRING_CODE_POLL_INTERVAL_MS = 300;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRegistered = (state: SessionRecord['authState']['state']): boolean => {
  return Boolean((state.creds as { registered?: boolean }).registered);
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
      if (!msg?.message || msg.key?.fromMe) {
        return;
      }

      const jid = msg.key?.remoteJid;
      if (!jid) {
        return;
      }

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
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
  let pairingRequested = false;

  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed while saving credentials');
    }
  });

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, qr, lastDisconnect } = update || {};

    console.log('🔄 connection.update:', JSON.stringify(update, null, 2));

    if ((connection === 'connecting' || Boolean(qr)) && !pairingRequested && !isRegistered(state)) {
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
        console.error('❌ Pairing error:', error);
        logger.error({ err: error, sessionId }, 'Failed to request pairing code');
      }
    }

    if (connection === 'open') {
      console.log('🎉 Connected successfully');

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
      console.log('❌ Connection closed:', JSON.stringify(lastDisconnect, null, 2));

      sessionManager.updateSession(sessionId, {
        status: 'disconnected',
        socket: null,
      });

      if (sessions[sessionId]?.sock === sock) {
        delete sessions[sessionId];
      }
    }
  });
};

const buildSocket = (session: SessionRecord): any => {
  const state = session.authState.state;
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'debug' }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Google Chrome'),
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
  const number = String(rawNumber || '').replace(/\D/g, '');
  const normalizedNumber = normalizePhoneNumber(number);
  const session = sessionManager.createSession(normalizedNumber);
  const sock = buildSocket(session);

  sessionManager.updateSession(session.sessionId, {
    socket: sock,
    status: 'connecting',
  });

  while (true) {
    const currentSession = sessionManager.getSession(session.sessionId);

    if (!currentSession) {
      throw new Error('Session not found');
    }

    if (currentSession.pairingCode) {
      return currentSession;
    }

    if (currentSession.status === 'disconnected') {
      throw new Error('Connection closed before pairing code was issued');
    }

    await sleep(PAIRING_CODE_POLL_INTERVAL_MS);
  }
};
