import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://objectifs:objectifs@localhost:5432/objectifs';

// Managed Postgres (e.g. Render) requires SSL. Enable with DATABASE_SSL=true.
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export const pool = new Pool({ connectionString, ssl });

/** Run a parameterized query and return the rows. */
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

/** Run a callback inside a transaction. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
