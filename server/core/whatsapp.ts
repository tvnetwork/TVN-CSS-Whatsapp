const baileys = require('@whiskeysockets/baileys');

import type { SessionRecord } from '../sessions/types';
import { sessionManager } from '../sessions/session-manager';
import { normalizePhoneNumber } from '../utils/phone';
import { logger } from '../utils/logger';

const makeWASocket = baileys.default;
const sessions: Record<string, { sock: any }> = {};

const removeWsListener = (sock: any, event: string, listener: (...args: any[]) => void): void => {
  if (typeof sock.ws?.off === 'function') {
    sock.ws.off(event, listener);
    return;
  }

  if (typeof sock.ws?.removeListener === 'function') {
    sock.ws.removeListener(event, listener);
  }
};

const waitForSocketOpen = async (sock: any): Promise<void> => {
  if (sock.ws?.readyState === 1) {
    console.log('✅ WebSocket opened');
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handleOpen = () => {
      removeWsListener(sock, 'open', handleOpen);
      removeWsListener(sock, 'close', handleClose);
      removeWsListener(sock, 'error', handleError);
      console.log('✅ WebSocket opened');
      resolve();
    };

    const handleClose = () => {
      removeWsListener(sock, 'open', handleOpen);
      removeWsListener(sock, 'close', handleClose);
      removeWsListener(sock, 'error', handleError);
      reject(new Error('WebSocket closed before pairing initialization completed'));
    };

    const handleError = (error: unknown) => {
      removeWsListener(sock, 'open', handleOpen);
      removeWsListener(sock, 'close', handleClose);
      removeWsListener(sock, 'error', handleError);
      reject(error instanceof Error ? error : new Error('WebSocket error before pairing initialization'));
    };

    sock.ws.on('open', handleOpen);
    sock.ws.on('close', handleClose);
    sock.ws.on('error', handleError);
  });
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

const attachConnectionHandlers = (sessionId: string, sock: any, saveCreds: () => Promise<void>): void => {
  let isAlive = true;

  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed while saving credentials');
    }
  });

  sock.ev.on('connection.update', async (update: any) => {
    try {
      console.log('🔄 Connection update:', JSON.stringify(update, null, 2));

      const connection = update?.connection;

      if (connection === 'open') {
        console.log('🎉 Connected successfully');
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
    browser: ['TVN', 'Chrome', '1.0.0'],
    syncFullHistory: false,
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

    await waitForSocketOpen(sock);

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
