#!/usr/bin/env node
/**
 * Trigger a deploy of the backend and/or frontend on Render.
 *
 * Usage:
 *   node scripts/deploy-render.mjs [backend|frontend|both]
 *   npm run deploy            # both
 *   npm run deploy:backend
 *   npm run deploy:frontend
 *
 * Render builds from the latest commit on the connected branch, so push your
 * changes first. Two ways to authorize the trigger (checked in this order):
 *
 *  1. Deploy Hooks (simplest) — copy each service's "Deploy Hook" URL
 *     (Render dashboard → service → Settings → Deploy Hook) into .env:
 *         RENDER_DEPLOY_HOOK_BACKEND=https://api.render.com/deploy/srv-xxx?key=...
 *         RENDER_DEPLOY_HOOK_FRONTEND=https://api.render.com/deploy/srv-yyy?key=...
 *
 *  2. Render API — set an API key and the service IDs in .env:
 *         RENDER_API_KEY=rnd_xxx
 *         RENDER_SERVICE_ID_BACKEND=srv-xxx
 *         RENDER_SERVICE_ID_FRONTEND=srv-yyy
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Minimal .env loader (no dependency) ----
function loadDotEnv() {
  try {
    const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trimStart().startsWith('#')) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* no .env — rely on the real environment */
  }
}

const TARGETS = {
  backend: {
    label: 'backend',
    hookVar: 'RENDER_DEPLOY_HOOK_BACKEND',
    serviceVar: 'RENDER_SERVICE_ID_BACKEND',
  },
  frontend: {
    label: 'frontend',
    hookVar: 'RENDER_DEPLOY_HOOK_FRONTEND',
    serviceVar: 'RENDER_SERVICE_ID_FRONTEND',
  },
};

async function deployViaHook(url, label) {
  const res = await fetch(url, { method: 'POST' });
  const body = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`${label}: deploy hook returned ${res.status} ${res.statusText} ${body}`);
  }
  return body || 'triggered';
}

async function deployViaApi(serviceId, apiKey, label) {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${label}: Render API returned ${res.status} ${res.statusText} ${JSON.stringify(body)}`);
  }
  return `deploy ${body.id || ''} (${body.status || 'queued'})`;
}

async function deployTarget(target) {
  const hook = process.env[target.hookVar];
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env[target.serviceVar];

  if (hook) {
    process.stdout.write(`→ ${target.label}: triggering via deploy hook… `);
    const out = await deployViaHook(hook, target.label);
    console.log(`ok (${out.slice(0, 80)})`);
    return;
  }
  if (apiKey && serviceId) {
    process.stdout.write(`→ ${target.label}: triggering via Render API… `);
    const out = await deployViaApi(serviceId, apiKey, target.label);
    console.log(`ok — ${out}`);
    return;
  }
  throw new Error(
    `${target.label}: no credentials. Set ${target.hookVar} (deploy hook) ` +
      `or RENDER_API_KEY + ${target.serviceVar} in .env. See scripts/deploy-render.mjs header.`
  );
}

async function main() {
  loadDotEnv();

  const arg = (process.argv[2] || 'both').toLowerCase();
  const which =
    arg === 'both' ? ['backend', 'frontend'] : arg in TARGETS ? [arg] : null;
  if (!which) {
    console.error(`Unknown target "${arg}". Use: backend | frontend | both`);
    process.exit(2);
  }

  console.log(`Deploying to Render: ${which.join(' + ')}`);
  let failed = false;
  for (const key of which) {
    try {
      await deployTarget(TARGETS[key]);
    } catch (err) {
      failed = true;
      console.error(`✗ ${err.message}`);
    }
  }

  if (failed) {
    console.error('\nOne or more deploys could not be triggered.');
    process.exit(1);
  }
  console.log('\nDone. Watch progress in the Render dashboard (Events tab).');
}

main();
