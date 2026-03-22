import { Router } from 'express';

import { startPairingSession } from '../core/whatsapp';
import { sessionManager } from '../sessions/session-manager';
import { logger } from '../utils/logger';

export const apiRouter = Router();

apiRouter.get('/', (_req: any, res: any) => {
  res.status(200).send('TVN WhatsApp Engine Running 🚀');
});

apiRouter.post('/session/pair', async (req: any, res: any, next: any) => {
  try {
    const session = await startPairingSession(String(req.body?.number || ''));

    res.status(201).json({
      sessionId: session.sessionId,
      publicCode: session.publicCode,
      pairingCode: session.pairingCode,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create pairing session');
    next(error);
  }
});

apiRouter.get('/session/:id/qr', (req: any, res: any) => {
  try {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      sessionId: session.sessionId,
      publicCode: session.publicCode,
      pairingCode: session.pairingCode,
      phoneNumber: session.phoneNumber,
      status: session.status,
      qr: session.qr,
      createdAt: session.createdAt,
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to get session QR');
    return res.status(500).json({ error: 'Unable to fetch session QR' });
  }
});

apiRouter.get('/session/:id/status', (req: any, res: any) => {
  try {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      status: session.status,
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to get session status');
    return res.status(500).json({ error: 'Unable to fetch session status' });
  }
});

apiRouter.get('/session/:id', (req: any, res: any) => {
  try {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      sessionId: session.sessionId,
      publicCode: session.publicCode,
      pairingCode: session.pairingCode,
      phoneNumber: session.phoneNumber,
      status: session.status,
      createdAt: session.createdAt,
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to get session details');
    return res.status(500).json({ error: 'Unable to fetch session details' });
  }
});

apiRouter.delete('/session/:id', async (req: any, res: any, next: any) => {
  try {
    const deleted = await sessionManager.deleteSession(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to delete session');
    return next(error);
  }
});
