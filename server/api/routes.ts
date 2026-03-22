import { Router } from 'express';

import { startPairingSession } from '../core/whatsapp';
import { sessionManager } from '../sessions/session-manager';
import { logger } from '../utils/logger';

export const apiRouter = Router();

apiRouter.get('/', (_req: any, res: any) => {
  res.status(200).send('TVN Backend Running ✅');
});

apiRouter.post('/session/pair', async (req: any, res: any) => {
  console.log('🔥 /session/pair called');
  console.log('📦 Body:', req.body);

  try {
    const session = await startPairingSession(String(req.body?.number || ''));

    return res.json({
      sessionId: session.sessionId,
      publicCode: session.publicCode,
      pairingCode: session.pairingCode,
    });
  } catch (err) {
    console.error('❌ Error:', err);
    logger.error({ err }, 'Failed to create pairing session');

    return res.status(500).json({
      error: 'Pairing failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
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
      status: session.status,
      createdAt: session.createdAt,
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, 'Failed to get session details');
    return res.status(500).json({ error: 'Unable to fetch session details' });
  }
});
