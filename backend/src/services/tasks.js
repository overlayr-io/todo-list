import { query } from '../db/pool.js';
import { computeProgress } from './progress.js';

// Assemble tasks with their labels, subtasks, checklist, links, computed
// progress, status (column) info and counts — the shape the frontend consumes.

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row[key])) map.set(row[key], []);
    map.get(row[key]).push(row);
  }
  return map;
}

/** Serialize a set of task base-rows (must share the same columns) into API objects. */
export async function serializeTasks(taskRows) {
  if (taskRows.length === 0) return [];
  const ids = taskRows.map((t) => t.id);

  const [labelRows, subRows, checkRows, linkRows, columnRows] = await Promise.all([
    query(
      `SELECT tl.task_id, l.id, l.name, l.color
         FROM task_labels tl JOIN labels l ON l.id = tl.label_id
        WHERE tl.task_id = ANY($1) ORDER BY l.name`,
      [ids]
    ),
    query(`SELECT * FROM subtasks WHERE task_id = ANY($1) ORDER BY position, id`, [ids]),
    query(`SELECT * FROM checklist_items WHERE task_id = ANY($1) ORDER BY position, id`, [ids]),
    query(`SELECT * FROM links WHERE task_id = ANY($1) ORDER BY created_at, id`, [ids]),
    query(
      `SELECT id, name, color, position, is_done FROM columns
        WHERE id = ANY($1)`,
      [taskRows.map((t) => t.column_id).filter(Boolean)]
    ),
  ]);

  const labelsByTask = groupBy(labelRows, 'task_id');
  const subsByTask = groupBy(subRows, 'task_id');
  const checksByTask = groupBy(checkRows, 'task_id');
  const linksByTask = groupBy(linkRows, 'task_id');
  const columnsById = new Map(columnRows.map((c) => [c.id, c]));

  return taskRows.map((t) => {
    const subtasks = subsByTask.get(t.id) || [];
    const checklist = checksByTask.get(t.id) || [];
    const labels = (labelsByTask.get(t.id) || []).map((l) => ({
      id: l.id, name: l.name, color: l.color,
    }));
    const column = t.column_id ? columnsById.get(t.column_id) : null;
    return {
      id: t.id,
      projectId: t.project_id,
      columnId: t.column_id,
      status: column ? column.name : null,
      isDone: column ? column.is_done : false,
      title: t.title,
      description: t.description,
      startDate: t.start_date,
      dueDate: t.due_date,
      recurrence: t.recurrence,
      autoProgress: t.auto_progress,
      progress: computeProgress(t, subtasks, checklist),
      position: t.position,
      lastViewedAt: t.last_viewed_at,
      googleEventId: t.google_event_id,
      labels,
      subtasks: subtasks.map((s) => ({
        id: s.id, title: s.title, startDate: s.start_date, dueDate: s.due_date,
        done: s.done, position: s.position,
      })),
      checklist: checklist.map((c) => ({
        id: c.id, title: c.title, done: c.done, position: c.position,
      })),
      links: (linksByTask.get(t.id) || []).map((l) => ({
        id: l.id, url: l.url, title: l.title, description: l.description, imageUrl: l.image_url,
      })),
      counts: {
        subtasks: subtasks.length,
        subtasksDone: subtasks.filter((s) => s.done).length,
        checklist: checklist.length,
        checklistDone: checklist.filter((c) => c.done).length,
      },
    };
  });
}

export async function getTaskById(id) {
  const rows = await query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  const [task] = await serializeTasks(rows);
  return task;
}

export async function listTasksWhere(whereSql, params) {
  const rows = await query(`SELECT * FROM tasks WHERE ${whereSql}`, params);
  return serializeTasks(rows);
}
