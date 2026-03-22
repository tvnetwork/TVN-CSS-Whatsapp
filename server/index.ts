import express = require('express');

import { apiRouter } from './api/routes';
import { logger } from './utils/logger';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));
app.use(apiRouter);

app.use((_req: any, res: any) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error: unknown, _req: any, res: any, _next: any) => {
  logger.error({ err: error }, 'Unhandled request error');

  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: message });
});

const bootstrap = async (): Promise<void> => {
  try {
    app.listen(port, () => {
      logger.info({ port }, 'TVN WhatsApp Engine started');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to bootstrap server');
    process.exit(1);
  }
};

void bootstrap();
