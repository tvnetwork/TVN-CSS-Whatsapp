import express from 'express';

import { apiRouter } from './api/routes';
import { logger } from './utils/logger';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));
app.use(apiRouter);

app.use((error: unknown, _req: any, res: any, _next: any) => {
  logger.error({ err: error }, 'Unhandled request error');

  const message = error instanceof Error ? error.message : 'Internal server error';

  res.status(500).json({
    error: message,
  });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'TVN WhatsApp Engine server started');
});
