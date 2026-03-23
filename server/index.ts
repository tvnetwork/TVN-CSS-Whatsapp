import cors = require('cors');
import express = require('express');

import { apiRouter } from './api/routes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }),
);
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

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
  logger.info({ port: Number(PORT) }, 'TVN WhatsApp Engine started');
});
