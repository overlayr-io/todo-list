import { google } from 'googleapis';
import { query } from '../db/pool.js';

// Google Calendar sync. Tokens and preferences live in the single `settings` row.
// The app pushes task deadlines as all-day events into the chosen calendar.

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export function isConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/sync/google/callback'
  );
}

async function getSettings() {
  const [row] = await query('SELECT * FROM settings WHERE id = 1');
  return row;
}

async function saveSettings(patch) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return getSettings();
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const [row] = await query(
    `UPDATE settings SET ${set} WHERE id = 1 RETURNING *`,
    keys.map((k) => patch[k])
  );
  return row;
}

/** Build an OAuth client already loaded with stored credentials (or null). */
async function authorizedClient() {
  const s = await getSettings();
  if (!s.google_refresh_token && !s.google_access_token) return null;
  const client = oauthClient();
  client.setCredentials({
    access_token: s.google_access_token || undefined,
    refresh_token: s.google_refresh_token || undefined,
    expiry_date: s.google_token_expiry ? new Date(s.google_token_expiry).getTime() : undefined,
  });
  // Persist tokens Google refreshes automatically.
  client.on('tokens', (tokens) => {
    const patch = {};
    if (tokens.access_token) patch.google_access_token = tokens.access_token;
    if (tokens.refresh_token) patch.google_refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) patch.google_token_expiry = new Date(tokens.expiry_date).toISOString();
    if (Object.keys(patch).length) saveSettings(patch).catch(() => {});
  });
  return client;
}

export function getAuthUrl() {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function handleCallback(code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch the connected account's email for display.
  let email = null;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email || null;
  } catch {
    /* userinfo scope may be absent; email stays null */
  }

  await saveSettings({
    google_access_token: tokens.access_token || null,
    google_refresh_token: tokens.refresh_token || null,
    google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    google_email: email,
  });
}

export async function getStatus() {
  const s = await getSettings();
  return {
    configured: isConfigured(),
    connected: Boolean(s.google_refresh_token || s.google_access_token),
    email: s.google_email,
    calendarId: s.google_calendar_id,
    autoSync: s.sync_auto,
    pushDeadlines: s.sync_push_deadlines,
    reminders24h: s.sync_reminders_24h,
    lastSyncAt: s.last_sync_at,
    syncedEventCount: s.synced_event_count,
  };
}

export async function updateSettings(patch) {
  const allowed = {};
  if (typeof patch.autoSync === 'boolean') allowed.sync_auto = patch.autoSync;
  if (typeof patch.pushDeadlines === 'boolean') allowed.sync_push_deadlines = patch.pushDeadlines;
  if (typeof patch.reminders24h === 'boolean') allowed.sync_reminders_24h = patch.reminders24h;
  if (typeof patch.calendarId === 'string') allowed.google_calendar_id = patch.calendarId;
  await saveSettings(allowed);
  return getStatus();
}

export async function disconnect() {
  await saveSettings({
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
    google_email: null,
    last_sync_at: null,
    synced_event_count: 0,
  });
  // Clear event links so a future reconnect re-creates events cleanly.
  await query('UPDATE tasks SET google_event_id = NULL WHERE google_event_id IS NOT NULL');
  return getStatus();
}

function addDaysISO(dateStr, days) {
  const dt = new Date(dateStr + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Push every task that has a due date to the calendar (create or update). */
export async function syncNow() {
  const s = await getSettings();
  if (!isConfigured()) throw Object.assign(new Error('Google sync not configured'), { status: 400 });
  const client = await authorizedClient();
  if (!client) throw Object.assign(new Error('Google account not connected'), { status: 400 });
  if (!s.sync_push_deadlines) {
    return updateSettings({}).then(() => ({ pushed: 0, skipped: true }));
  }

  const calendar = google.calendar({ version: 'v3', auth: client });
  const calendarId = s.google_calendar_id || 'primary';
  const tasks = await query(
    'SELECT id, title, description, due_date, google_event_id FROM tasks WHERE due_date IS NOT NULL'
  );

  let count = 0;
  for (const t of tasks) {
    const event = {
      summary: t.title,
      description: t.description || 'Objectifs — échéance',
      // All-day event: end date is exclusive, so +1 day.
      start: { date: t.due_date instanceof Date ? t.due_date.toISOString().slice(0, 10) : t.due_date },
      end: {
        date: addDaysISO(
          t.due_date instanceof Date ? t.due_date.toISOString().slice(0, 10) : t.due_date,
          1
        ),
      },
      reminders: s.sync_reminders_24h
        ? { useDefault: false, overrides: [{ method: 'popup', minutes: 24 * 60 }] }
        : { useDefault: true },
    };

    try {
      if (t.google_event_id) {
        await calendar.events.update({ calendarId, eventId: t.google_event_id, requestBody: event });
      } else {
        const created = await calendar.events.insert({ calendarId, requestBody: event });
        await query('UPDATE tasks SET google_event_id = $1 WHERE id = $2', [created.data.id, t.id]);
      }
      count++;
    } catch (err) {
      // If the stored event was deleted on Google's side, recreate it.
      if (t.google_event_id && (err.code === 404 || err.code === 410)) {
        const created = await calendar.events.insert({ calendarId, requestBody: event });
        await query('UPDATE tasks SET google_event_id = $1 WHERE id = $2', [created.data.id, t.id]);
        count++;
      } else {
        throw err;
      }
    }
  }

  await saveSettings({
    last_sync_at: new Date().toISOString(),
    synced_event_count: count,
  });
  return { pushed: count };
}
