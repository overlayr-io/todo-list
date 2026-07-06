import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/async.js';

export const labelsRouter = Router();

// GET /api/labels — labels with the number of tasks using each.
labelsRouter.get(
  '/labels',
  asyncHandler(async (req, res) => {
    const rows = await query(`
      SELECT l.id, l.name, l.color,
             COUNT(tl.task_id)::int AS task_count
        FROM labels l
        LEFT JOIN task_labels tl ON tl.label_id = l.id
       GROUP BY l.id
       ORDER BY task_count DESC, l.name
    `);
    res.json(rows.map((r) => ({ id: r.id, name: r.name, color: r.color, taskCount: r.task_count })));
  })
);

labelsRouter.post(
  '/labels',
  asyncHandler(async (req, res) => {
    const { name, color } = req.body || {};
    if (!name || !name.trim()) throw Object.assign(new Error('name is required'), { status: 400 });
    const [row] = await query(
      'INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING id, name, color',
      [name.trim(), color || '#94a3b8']
    );
    res.status(201).json({ ...row, taskCount: 0 });
  })
);

labelsRouter.patch(
  '/labels/:id',
  asyncHandler(async (req, res) => {
    const { name, color } = req.body || {};
    const [row] = await query(
      `UPDATE labels SET
         name = COALESCE($2, name),
         color = COALESCE($3, color)
       WHERE id = $1 RETURNING id, name, color`,
      [req.params.id, name ?? null, color ?? null]
    );
    if (!row) throw Object.assign(new Error('label not found'), { status: 404 });
    res.json(row);
  })
);

labelsRouter.delete(
  '/labels/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM labels WHERE id = $1', [req.params.id]);
    res.status(204).end();
  })
);
