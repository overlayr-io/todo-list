import { Router } from 'express';
import { asyncHandler } from '../middleware/async.js';
import * as googleSvc from '../services/google.js';

export const syncRouter = Router();

// GET /api/sync/google/status
syncRouter.get(
  '/sync/google/status',
  asyncHandler(async (req, res) => {
    res.json(await googleSvc.getStatus());
  })
);

// GET /api/sync/google/connect — begin the OAuth flow.
syncRouter.get(
  '/sync/google/connect',
  asyncHandler(async (req, res) => {
    if (!googleSvc.isConfigured()) {
      throw Object.assign(new Error('Google sync is not configured on the server'), { status: 400 });
    }
    res.json({ url: googleSvc.getAuthUrl() });
  })
);

// GET /api/sync/google/callback — OAuth redirect target; bounces back to the SPA.
syncRouter.get(
  '/sync/google/callback',
  asyncHandler(async (req, res) => {
    const base = process.env.APP_BASE_URL || 'http://localhost:8080';
    if (req.query.error) return res.redirect(`${base}/sync?google=denied`);
    if (!req.query.code) return res.redirect(`${base}/sync?google=error`);
    await googleSvc.handleCallback(String(req.query.code));
    res.redirect(`${base}/sync?google=connected`);
  })
);

// PATCH /api/sync/google/settings
syncRouter.patch(
  '/sync/google/settings',
  asyncHandler(async (req, res) => {
    res.json(await googleSvc.updateSettings(req.body || {}));
  })
);

// POST /api/sync/google/run — push deadlines now.
syncRouter.post(
  '/sync/google/run',
  asyncHandler(async (req, res) => {
    const result = await googleSvc.syncNow();
    const status = await googleSvc.getStatus();
    res.json({ ...result, status });
  })
);

// POST /api/sync/google/disconnect
syncRouter.post(
  '/sync/google/disconnect',
  asyncHandler(async (req, res) => {
    res.json(await googleSvc.disconnect());
  })
);
