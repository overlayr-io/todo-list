import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';
import { pool } from './db/pool.js';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  // Wait for the database to accept connections (compose healthcheck usually
  // guarantees this, but retry to be robust on first boot).
  await waitForDb();

  if (process.env.RUN_MIGRATIONS !== 'false') {
    await runMigrations();
  }
  if (process.env.RUN_SEED === 'true') {
    await seed();
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] Objectifs API listening on :${PORT}`);
  });
}

async function waitForDb(retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[server] waiting for database… (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Database not reachable');
}

bootstrap().catch((err) => {
  console.error('[server] fatal:', err);
  process.exit(1);
});
