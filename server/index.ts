import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { chatRouter } from './routes/chat.js';
import { HttpError } from './utils/httpError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = env.clientOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.nodeEnv !== 'production' || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  })
);
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'spur-ai-live-chat' });
});

app.use('/chat', chatRouter);

const clientDist = path.resolve(__dirname, '../client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof HttpError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    console.error('[server]', error);
    response.status(500).json({
      error: {
        code: 'server_error',
        message: 'Something went wrong. Please try again.'
      }
    });
  }
);

app.listen(env.port, () => {
  console.log(`Spur AI live chat listening on http://localhost:${env.port}`);
});
