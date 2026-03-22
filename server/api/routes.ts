import { Router } from 'express';

import { startSession } from '../core/whatsapp';
import { sessionManager } from '../sessions/session-manager';

export const apiRouter = Router();

apiRouter.get('/', (_req: any, res: any) => {
  res.send('TVN WhatsApp Engine Running');
});

apiRouter.post('/session/create', async (_req: any, res: any, next: any) => {
  try {
    const session = sessionManager.createSession();
    await startSession(session.sessionId);

    res.status(201).json({
      sessionId: session.sessionId,
      publicCode: session.publicCode,
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/session/:id/qr', (req: any, res: any) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.qr) {
    return res.json({ status: 'qr', qr: session.qr });
  }

  return res.json({
    status: session.status === 'connected' ? 'connected' : 'waiting',
  });
});

apiRouter.get('/session/:id/status', (req: any, res: any) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    status: session.status,
    publicCode: session.publicCode,
  });
});

apiRouter.delete('/session/:id', async (req: any, res: any, next: any) => {
  try {
    const deleted = await sessionManager.deleteSession(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
