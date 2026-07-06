-- Objectifs — initial schema
-- Single-user task management app (projects, kanban columns, tasks, subtasks,
-- checklist items, labels, links, and app/sync settings).

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#a78bfa',
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labels (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#94a3b8',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kanban columns belong to a project. is_done marks the terminal column.
CREATE TABLE IF NOT EXISTS columns (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#7e858d',
  position    INTEGER     NOT NULL DEFAULT 0,
  is_done     BOOLEAN     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_columns_project ON columns(project_id);

CREATE TABLE IF NOT EXISTS tasks (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id       INTEGER     REFERENCES columns(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL DEFAULT '',
  start_date      DATE,
  due_date        DATE,
  recurrence      TEXT        NOT NULL DEFAULT 'none',  -- none|weekly|monthly|yearly
  progress        SMALLINT    NOT NULL DEFAULT 0,       -- 0..100 (may be auto-derived)
  auto_progress   BOOLEAN     NOT NULL DEFAULT true,    -- derive from subtasks/checklist
  position        INTEGER     NOT NULL DEFAULT 0,
  last_viewed_at  TIMESTAMPTZ,
  google_event_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id   INTEGER NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
  label_id  INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS subtasks (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  start_date  DATE,
  due_date    DATE,
  done        BOOLEAN     NOT NULL DEFAULT false,
  position    INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

CREATE TABLE IF NOT EXISTS checklist_items (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  done        BOOLEAN     NOT NULL DEFAULT false,
  position    INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_checklist_task ON checklist_items(task_id);

CREATE TABLE IF NOT EXISTS links (
  id           SERIAL PRIMARY KEY,
  task_id      INTEGER     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  title        TEXT,
  description  TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_links_task ON links(task_id);

-- Single-row application settings (id is always 1), including Google sync state.
CREATE TABLE IF NOT EXISTS settings (
  id                      INTEGER PRIMARY KEY DEFAULT 1,
  google_access_token     TEXT,
  google_refresh_token    TEXT,
  google_token_expiry     TIMESTAMPTZ,
  google_email            TEXT,
  google_calendar_id      TEXT NOT NULL DEFAULT 'primary',
  sync_auto               BOOLEAN NOT NULL DEFAULT true,
  sync_push_deadlines     BOOLEAN NOT NULL DEFAULT true,
  sync_reminders_24h      BOOLEAN NOT NULL DEFAULT false,
  last_sync_at            TIMESTAMPTZ,
  synced_event_count      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT settings_singleton CHECK (id = 1)
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
