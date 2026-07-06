import express from 'express';
import cors from 'cors';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { labelsRouter } from './routes/labels.js';
import { viewsRouter } from './routes/views.js';
import { syncRouter } from './routes/sync.js';
import { errorHandler, notFound } from './middleware/async.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api', projectsRouter);
  app.use('/api', tasksRouter);
  app.use('/api', labelsRouter);
  app.use('/api', viewsRouter);
  app.use('/api', syncRouter);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
