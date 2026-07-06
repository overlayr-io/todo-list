import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { asyncHandler } from '../middleware/async.js';
import { getTaskById } from '../services/tasks.js';
import { nextOccurrence, RECURRENCES } from '../services/recurrence.js';
import { fetchLinkMetadata } from '../services/og.js';

export const tasksRouter = Router();

const isoDate = (v) => (v === undefined ? undefined : v === null || v === '' ? null : v);

// POST /api/tasks — create a task (optionally with labels).
tasksRouter.post(
  '/tasks',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.title.trim()) throw Object.assign(new Error('title is required'), { status: 400 });
    if (!b.projectId) throw Object.assign(new Error('projectId is required'), { status: 400 });

    // Default to the project's first column when none is provided.
    let columnId = b.columnId ?? null;
    if (!columnId) {
      const [col] = await query(
        'SELECT id FROM columns WHERE project_id = $1 ORDER BY position, id LIMIT 1',
        [b.projectId]
      );
      columnId = col?.id ?? null;
    }
    const [{ max }] = await query(
      'SELECT COALESCE(MAX(position), -1) AS max FROM tasks WHERE column_id = $1',
      [columnId]
    );

    const taskId = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO tasks
           (project_id, column_id, title, description, start_date, due_date, recurrence, progress, auto_progress, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          b.projectId, columnId, b.title.trim(), b.description || '',
          isoDate(b.startDate) ?? null, isoDate(b.dueDate) ?? null,
          RECURRENCES.includes(b.recurrence) ? b.recurrence : 'none',
          b.progress ?? 0, b.autoProgress ?? true, max + 1,
        ]
      );
      const id = rows[0].id;
      for (const labelId of b.labelIds || []) {
        await client.query('INSERT INTO task_labels (task_id, label_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, labelId]);
      }
      return id;
    });
    res.status(201).json(await getTaskById(taskId));
  })
);

tasksRouter.get(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const task = await getTaskById(req.params.id);
    if (!task) throw Object.assign(new Error('task not found'), { status: 404 });
    res.json(task);
  })
);

// PATCH /api/tasks/:id — update fields; also handles kanban move (columnId/position).
tasksRouter.patch(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const fields = [];
    const params = [req.params.id];
    const set = (col, val) => {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    };
    if (b.title !== undefined) set('title', b.title);
    if (b.description !== undefined) set('description', b.description);
    if (b.startDate !== undefined) set('start_date', isoDate(b.startDate));
    if (b.dueDate !== undefined) set('due_date', isoDate(b.dueDate));
    if (b.recurrence !== undefined) set('recurrence', RECURRENCES.includes(b.recurrence) ? b.recurrence : 'none');
    if (b.progress !== undefined) set('progress', b.progress);
    if (b.autoProgress !== undefined) set('auto_progress', b.autoProgress);
    if (b.columnId !== undefined) set('column_id', b.columnId);
    if (b.position !== undefined) set('position', b.position);
    if (fields.length === 0) throw Object.assign(new Error('no fields to update'), { status: 400 });
    fields.push('updated_at = now()');
    const updated = await query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING id`,
      params
    );
    if (updated.length === 0) throw Object.assign(new Error('task not found'), { status: 404 });
    res.json(await getTaskById(req.params.id));
  })
);

tasksRouter.delete(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.status(204).end();
  })
);

// POST /api/tasks/:id/view — record a consultation (drives "Dernières consultations").
tasksRouter.post(
  '/tasks/:id/view',
  asyncHandler(async (req, res) => {
    await query('UPDATE tasks SET last_viewed_at = now() WHERE id = $1', [req.params.id]);
    res.json(await getTaskById(req.params.id));
  })
);

// POST /api/tasks/:id/complete — move to the terminal column; roll recurring tasks forward.
tasksRouter.post(
  '/tasks/:id/complete',
  asyncHandler(async (req, res) => {
    const [task] = await query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) throw Object.assign(new Error('task not found'), { status: 404 });
    const [doneCol] = await query(
      'SELECT id FROM columns WHERE project_id = $1 AND is_done = true ORDER BY position LIMIT 1',
      [task.project_id]
    );

    if (task.recurrence && task.recurrence !== 'none' && task.due_date) {
      // Recurring: advance dates and reset progress/subtasks instead of closing.
      const cur = task.due_date instanceof Date ? task.due_date.toISOString().slice(0, 10) : task.due_date;
      const nextDue = nextOccurrence(cur, task.recurrence);
      const curStart = task.start_date instanceof Date ? task.start_date.toISOString().slice(0, 10) : task.start_date;
      const nextStart = curStart ? nextOccurrence(curStart, task.recurrence) : null;
      await withTransaction(async (client) => {
        await client.query(
          'UPDATE tasks SET due_date = $2, start_date = COALESCE($3, start_date), progress = 0, updated_at = now() WHERE id = $1',
          [task.id, nextDue, nextStart]
        );
        await client.query('UPDATE subtasks SET done = false WHERE task_id = $1', [task.id]);
        await client.query('UPDATE checklist_items SET done = false WHERE task_id = $1', [task.id]);
      });
    } else {
      await query(
        'UPDATE tasks SET column_id = COALESCE($2, column_id), progress = 100, updated_at = now() WHERE id = $1',
        [task.id, doneCol?.id ?? null]
      );
    }
    res.json(await getTaskById(req.params.id));
  })
);

// ---- Labels on a task ----
tasksRouter.put(
  '/tasks/:id/labels',
  asyncHandler(async (req, res) => {
    const labelIds = req.body?.labelIds || [];
    await withTransaction(async (client) => {
      await client.query('DELETE FROM task_labels WHERE task_id = $1', [req.params.id]);
      for (const labelId of labelIds) {
        await client.query('INSERT INTO task_labels (task_id, label_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, labelId]);
      }
    });
    res.json(await getTaskById(req.params.id));
  })
);

// ---- Subtasks ----
tasksRouter.post(
  '/tasks/:id/subtasks',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.title.trim()) throw Object.assign(new Error('title is required'), { status: 400 });
    const [{ max }] = await query('SELECT COALESCE(MAX(position), -1) AS max FROM subtasks WHERE task_id = $1', [req.params.id]);
    await query(
      'INSERT INTO subtasks (task_id, title, start_date, due_date, done, position) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, b.title.trim(), isoDate(b.startDate) ?? null, isoDate(b.dueDate) ?? null, b.done ?? false, max + 1]
    );
    res.status(201).json(await getTaskById(req.params.id));
  })
);

tasksRouter.patch(
  '/subtasks/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const [row] = await query(
      `UPDATE subtasks SET
         title = COALESCE($2, title),
         start_date = COALESCE($3, start_date),
         due_date = COALESCE($4, due_date),
         done = COALESCE($5, done),
         position = COALESCE($6, position)
       WHERE id = $1 RETURNING task_id`,
      [req.params.id, b.title ?? null, isoDate(b.startDate) ?? null, isoDate(b.dueDate) ?? null, b.done ?? null, b.position ?? null]
    );
    if (!row) throw Object.assign(new Error('subtask not found'), { status: 404 });
    res.json(await getTaskById(row.task_id));
  })
);

tasksRouter.delete(
  '/subtasks/:id',
  asyncHandler(async (req, res) => {
    const [row] = await query('DELETE FROM subtasks WHERE id = $1 RETURNING task_id', [req.params.id]);
    res.json(row ? await getTaskById(row.task_id) : {});
  })
);

// ---- Checklist ----
tasksRouter.post(
  '/tasks/:id/checklist',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.title.trim()) throw Object.assign(new Error('title is required'), { status: 400 });
    const [{ max }] = await query('SELECT COALESCE(MAX(position), -1) AS max FROM checklist_items WHERE task_id = $1', [req.params.id]);
    await query(
      'INSERT INTO checklist_items (task_id, title, done, position) VALUES ($1,$2,$3,$4)',
      [req.params.id, b.title.trim(), b.done ?? false, max + 1]
    );
    res.status(201).json(await getTaskById(req.params.id));
  })
);

tasksRouter.patch(
  '/checklist/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const [row] = await query(
      `UPDATE checklist_items SET
         title = COALESCE($2, title),
         done = COALESCE($3, done),
         position = COALESCE($4, position)
       WHERE id = $1 RETURNING task_id`,
      [req.params.id, b.title ?? null, b.done ?? null, b.position ?? null]
    );
    if (!row) throw Object.assign(new Error('checklist item not found'), { status: 404 });
    res.json(await getTaskById(row.task_id));
  })
);

tasksRouter.delete(
  '/checklist/:id',
  asyncHandler(async (req, res) => {
    const [row] = await query('DELETE FROM checklist_items WHERE id = $1 RETURNING task_id', [req.params.id]);
    res.json(row ? await getTaskById(row.task_id) : {});
  })
);

// ---- Links (with OpenGraph preview) ----
tasksRouter.post(
  '/tasks/:id/links',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.url || !/^https?:\/\//i.test(b.url)) throw Object.assign(new Error('valid url is required'), { status: 400 });
    const meta = await fetchLinkMetadata(b.url);
    await query(
      'INSERT INTO links (task_id, url, title, description, image_url) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, b.url, b.title || meta.title || b.url, meta.description, meta.image]
    );
    res.status(201).json(await getTaskById(req.params.id));
  })
);

tasksRouter.delete(
  '/links/:id',
  asyncHandler(async (req, res) => {
    const [row] = await query('DELETE FROM links WHERE id = $1 RETURNING task_id', [req.params.id]);
    res.json(row ? await getTaskById(row.task_id) : {});
  })
);
