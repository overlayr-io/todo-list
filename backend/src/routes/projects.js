import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/async.js';
import { serializeTasks } from '../services/tasks.js';

export const projectsRouter = Router();

async function loadColumns(projectId) {
  const cols = await query(
    'SELECT id, name, color, position, is_done FROM columns WHERE project_id = $1 ORDER BY position, id',
    [projectId]
  );
  return cols.map((c) => ({
    id: c.id, name: c.name, color: c.color, position: c.position, isDone: c.is_done,
  }));
}

// GET /api/projects — all projects with columns and task counts.
projectsRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const projects = await query('SELECT * FROM projects ORDER BY position, id');
    const counts = await query('SELECT project_id, COUNT(*)::int AS c FROM tasks GROUP BY project_id');
    const countMap = new Map(counts.map((r) => [r.project_id, r.c]));
    const out = [];
    for (const p of projects) {
      out.push({
        id: p.id, name: p.name, color: p.color, position: p.position,
        taskCount: countMap.get(p.id) || 0,
        columns: await loadColumns(p.id),
      });
    }
    res.json(out);
  })
);

// GET /api/projects/:id — project detail with columns and all its tasks.
projectsRouter.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const [project] = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!project) throw Object.assign(new Error('project not found'), { status: 404 });
    const taskRows = await query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY position, id',
      [project.id]
    );
    const tasks = await serializeTasks(taskRows);
    res.json({
      id: project.id, name: project.name, color: project.color, position: project.position,
      columns: await loadColumns(project.id),
      tasks,
    });
  })
);

projectsRouter.post(
  '/projects',
  asyncHandler(async (req, res) => {
    const { name, color } = req.body || {};
    if (!name || !name.trim()) throw Object.assign(new Error('name is required'), { status: 400 });
    const [{ max }] = await query('SELECT COALESCE(MAX(position), -1) AS max FROM projects');
    const [project] = await query(
      'INSERT INTO projects (name, color, position) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), color || '#a78bfa', max + 1]
    );
    // Give every new project the standard board.
    const defs = [
      ['À faire', '#7e858d', 0, false],
      ['En cours', '#14b8a6', 1, false],
      ['En révision', '#fb923c', 2, false],
      ['Terminé', '#22d3ee', 3, true],
    ];
    for (const [cname, ccolor, position, isDone] of defs) {
      await query(
        'INSERT INTO columns (project_id, name, color, position, is_done) VALUES ($1,$2,$3,$4,$5)',
        [project.id, cname, ccolor, position, isDone]
      );
    }
    res.status(201).json({
      id: project.id, name: project.name, color: project.color, position: project.position,
      taskCount: 0, columns: await loadColumns(project.id),
    });
  })
);

projectsRouter.patch(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const { name, color } = req.body || {};
    const [row] = await query(
      `UPDATE projects SET
         name = COALESCE($2, name),
         color = COALESCE($3, color),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name ?? null, color ?? null]
    );
    if (!row) throw Object.assign(new Error('project not found'), { status: 404 });
    res.json(row);
  })
);

projectsRouter.delete(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.status(204).end();
  })
);

// ---- Columns ----
projectsRouter.post(
  '/projects/:id/columns',
  asyncHandler(async (req, res) => {
    const { name, color, isDone } = req.body || {};
    if (!name || !name.trim()) throw Object.assign(new Error('name is required'), { status: 400 });
    const [{ max }] = await query(
      'SELECT COALESCE(MAX(position), -1) AS max FROM columns WHERE project_id = $1',
      [req.params.id]
    );
    const [row] = await query(
      'INSERT INTO columns (project_id, name, color, position, is_done) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, color, position, is_done',
      [req.params.id, name.trim(), color || '#7e858d', max + 1, Boolean(isDone)]
    );
    res.status(201).json({ ...row, isDone: row.is_done });
  })
);

projectsRouter.patch(
  '/columns/:id',
  asyncHandler(async (req, res) => {
    const { name, color, position, isDone } = req.body || {};
    const [row] = await query(
      `UPDATE columns SET
         name = COALESCE($2, name),
         color = COALESCE($3, color),
         position = COALESCE($4, position),
         is_done = COALESCE($5, is_done)
       WHERE id = $1 RETURNING id, name, color, position, is_done`,
      [req.params.id, name ?? null, color ?? null, position ?? null, isDone ?? null]
    );
    if (!row) throw Object.assign(new Error('column not found'), { status: 404 });
    res.json({ ...row, isDone: row.is_done });
  })
);

projectsRouter.delete(
  '/columns/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM columns WHERE id = $1', [req.params.id]);
    res.status(204).end();
  })
);
