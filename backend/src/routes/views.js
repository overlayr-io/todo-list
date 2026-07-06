import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/async.js';
import { serializeTasks } from '../services/tasks.js';

export const viewsRouter = Router();

// GET /api/overview — recently consulted tasks + all active (not-done) tasks.
viewsRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const recentRows = await query(
      `SELECT * FROM tasks
        WHERE last_viewed_at IS NOT NULL
        ORDER BY last_viewed_at DESC
        LIMIT 3`
    );
    const currentRows = await query(
      `SELECT t.* FROM tasks t
         LEFT JOIN columns c ON c.id = t.column_id
        WHERE c.is_done IS NOT TRUE
        ORDER BY t.due_date NULLS LAST, t.id`
    );
    const [recent, current] = await Promise.all([
      serializeTasks(recentRows),
      serializeTasks(currentRows),
    ]);
    res.json({ recent, current });
  })
);

// GET /api/upcoming — tasks with a due date, bucketed relative to today.
viewsRouter.get(
  '/upcoming',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT t.* FROM tasks t
         LEFT JOIN columns c ON c.id = t.column_id
        WHERE t.due_date IS NOT NULL AND c.is_done IS NOT TRUE
        ORDER BY t.due_date ASC, t.id`
    );
    const tasks = await serializeTasks(rows);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()) % 7 + 1); // through Sunday+1
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const buckets = { overdue: [], week: [], month: [], later: [] };
    for (const t of tasks) {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) buckets.overdue.push(t);
      else if (due < endOfWeek) buckets.week.push(t);
      else if (due < endOfMonth) buckets.month.push(t);
      else buckets.later.push(t);
    }
    res.json(buckets);
  })
);
