import { pool, withTransaction } from './pool.js';
import { runMigrations } from './migrate.js';

// Reproduces the data shown in the design mockups. Idempotent: only seeds when
// the database is empty, so it is safe to run on every backend boot.

const YEAR = 2026;
const d = (m, day) => `${YEAR}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Build `n` generic subtasks, `done` of them completed. */
function genSubtasks(prefix, n, done) {
  return Array.from({ length: n }, (_, i) => ({
    title: `${prefix} ${i + 1}`,
    done: i < done,
    position: i,
  }));
}

export async function seed() {
  const existing = await pool.query('SELECT count(*)::int AS c FROM projects');
  if (existing.rows[0].c > 0) {
    console.log('[seed] projects already present — skipping');
    return;
  }

  await withTransaction(async (client) => {
    const q = (text, params) => client.query(text, params).then((r) => r.rows);

    // ---- Labels ----
    const labelDefs = [
      ['Apprentissage', '#a78bfa'],
      ['Sport', '#34d399'],
      ['Lecture', '#60a5fa'],
      ['Bien-être', '#22d3ee'],
      ['Finances', '#fbbf24'],
      ['Musique', '#fb7185'],
      ['Carrière', '#fb923c'],
    ];
    const labels = {};
    for (const [name, color] of labelDefs) {
      const [row] = await q(
        'INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING id',
        [name, color]
      );
      labels[name] = row.id;
    }

    // ---- Projects ----
    const [proj1] = await q(
      'INSERT INTO projects (name, color, position) VALUES ($1, $2, 0) RETURNING id',
      ['Objectifs 2026', '#a78bfa']
    );
    const [proj2] = await q(
      'INSERT INTO projects (name, color, position) VALUES ($1, $2, 1) RETURNING id',
      ['Apprentissages', '#60a5fa']
    );

    // ---- Columns (standard kanban board per project) ----
    async function makeColumns(projectId) {
      const defs = [
        ['À faire', '#7e858d', 0, false],
        ['En cours', '#14b8a6', 1, false],
        ['En révision', '#fb923c', 2, false],
        ['Terminé', '#22d3ee', 3, true],
      ];
      const cols = {};
      for (const [name, color, position, isDone] of defs) {
        const [row] = await q(
          'INSERT INTO columns (project_id, name, color, position, is_done) VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [projectId, name, color, position, isDone]
        );
        cols[name] = row.id;
      }
      return cols;
    }
    const cols1 = await makeColumns(proj1.id);
    const cols2 = await makeColumns(proj2.id);

    // ---- Helper to insert a full task ----
    async function insertTask(t) {
      const [row] = await q(
        `INSERT INTO tasks
           (project_id, column_id, title, description, start_date, due_date,
            recurrence, progress, auto_progress, position, last_viewed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          t.project_id, t.column_id, t.title, t.description || '',
          t.start_date || null, t.due_date || null, t.recurrence || 'none',
          t.progress ?? 0, false, t.position ?? 0, t.last_viewed_at || null,
        ]
      );
      const taskId = row.id;
      for (const labelName of t.labels || []) {
        await q('INSERT INTO task_labels (task_id, label_id) VALUES ($1,$2)', [taskId, labels[labelName]]);
      }
      for (const s of t.subtasks || []) {
        await q(
          'INSERT INTO subtasks (task_id, title, start_date, due_date, done, position) VALUES ($1,$2,$3,$4,$5,$6)',
          [taskId, s.title, s.start_date || null, s.due_date || null, s.done || false, s.position ?? 0]
        );
      }
      for (const c of t.checklist || []) {
        await q(
          'INSERT INTO checklist_items (task_id, title, done, position) VALUES ($1,$2,$3,$4)',
          [taskId, c.title, c.done || false, c.position ?? 0]
        );
      }
      for (const l of t.links || []) {
        await q(
          'INSERT INTO links (task_id, url, title, description, image_url) VALUES ($1,$2,$3,$4,$5)',
          [taskId, l.url, l.title || null, l.description || null, l.image_url || null]
        );
      }
      return taskId;
    }

    const now = new Date();
    const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

    // ---- Objectifs 2026 tasks ----
    await insertTask({
      project_id: proj1.id, column_id: cols1['En cours'], position: 0,
      title: "Apprendre l'espagnol",
      description:
        "Atteindre le niveau B1 en espagnol d'ici la fin de l'année : vocabulaire quotidien, conjugaison et conversation fluide sur des sujets familiers.",
      start_date: d(1, 10), due_date: d(12, 31), recurrence: 'weekly',
      progress: 40, last_viewed_at: hoursAgo(2),
      labels: ['Apprentissage'],
      subtasks: [
        { title: 'Bases A1 · vocabulaire', start_date: d(1, 10), due_date: d(4, 30), done: true, position: 0 },
        { title: 'Conjugaison présent', start_date: d(2, 1), due_date: d(3, 15), done: true, position: 1 },
        { title: 'Conversation A2', start_date: d(5, 1), due_date: d(9, 30), done: false, position: 2 },
        { title: 'Passé composé & imparfait', start_date: d(6, 1), due_date: d(7, 31), done: false, position: 3 },
        { title: 'Examen blanc B1', start_date: d(12, 1), due_date: d(12, 15), done: false, position: 4 },
      ],
      checklist: [
        { title: "Installer l'appli de révision", done: true, position: 0 },
        { title: '500 mots appris', done: true, position: 1 },
        { title: 'Créer des fiches Anki', done: true, position: 2 },
        { title: 'Écouter 1 podcast / jour', done: true, position: 3 },
        { title: "Trouver un partenaire d'échange", done: false, position: 4 },
        { title: 'Regarder 3 films en V.O.', done: false, position: 5 },
        { title: 'Lire un roman court', done: false, position: 6 },
        { title: 'Passer un test en ligne', done: false, position: 7 },
      ],
      links: [
        {
          url: 'https://www.spanishpod101.com/lessons/present-tense',
          title: 'SpanishPod101 — Conjugaison présent',
          description: 'spanishpod101.com/lessons/present-tense',
        },
      ],
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['En cours'], position: 1,
      title: 'Programme semi-marathon',
      description: 'Préparer et courir un semi-marathon en octobre.',
      start_date: d(3, 1), due_date: d(10, 12),
      progress: 65, last_viewed_at: hoursAgo(24),
      labels: ['Sport'],
      subtasks: [
        { title: 'Endurance de base', start_date: d(3, 1), due_date: d(6, 30), done: true, position: 0 },
        { title: 'Fractionné', start_date: d(7, 1), due_date: d(9, 30), done: false, position: 1 },
        ...genSubtasks('Séance clé', 6, 4).map((s, i) => ({ ...s, position: i + 2 })),
      ],
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['En révision'], position: 0,
      title: 'Constituer un portfolio design',
      description: 'Rassembler 6 projets aboutis et publier le portfolio en ligne.',
      start_date: d(5, 5), due_date: d(9, 30),
      progress: 80,
      labels: ['Carrière'],
      subtasks: genSubtasks('Projet', 10, 8),
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['À faire'], position: 0,
      title: 'Écrire 24 fiches de lecture',
      description: 'Une fiche de lecture par livre terminé cette année.',
      start_date: d(1, 1), due_date: d(12, 31),
      progress: 0,
      labels: ['Lecture'],
      subtasks: genSubtasks('Fiche', 6, 0),
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['À faire'], position: 1,
      title: "Ouvrir un plan d'épargne",
      description: "Comparer les offres et ouvrir un plan d'épargne automatisé.",
      start_date: d(7, 1), due_date: d(9, 15),
      progress: 0,
      labels: ['Finances'],
      subtasks: genSubtasks('Étape', 3, 0),
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['En cours'], position: 2,
      title: 'Cours de piano — niveau 2',
      description: 'Terminer le cahier de niveau 2 et jouer deux morceaux par cœur.',
      start_date: d(2, 1), due_date: d(8, 15), recurrence: 'weekly',
      progress: 40,
      labels: ['Musique'],
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['Terminé'], position: 0,
      title: 'Méditer 10 min / jour',
      description: 'Séance de méditation quotidienne pendant 6 mois.',
      start_date: d(1, 1), due_date: d(6, 30), recurrence: 'weekly',
      progress: 100, last_viewed_at: hoursAgo(72),
      labels: ['Bien-être'],
    });

    await insertTask({
      project_id: proj1.id, column_id: cols1['Terminé'], position: 1,
      title: 'Routine matinale',
      description: 'Installer une routine matinale stable (réveil, sport, lecture).',
      start_date: d(1, 1), due_date: d(3, 31),
      progress: 100,
      labels: ['Bien-être'],
    });

    // ---- Apprentissages tasks ----
    await insertTask({
      project_id: proj2.id, column_id: cols2['À faire'], position: 0,
      title: 'Lire 24 livres cette année',
      description: 'Deux livres par mois, tous genres confondus.',
      start_date: d(1, 1), due_date: d(12, 31),
      progress: 25,
      labels: ['Lecture'],
      subtasks: genSubtasks('Livre', 8, 2),
    });

    await insertTask({
      project_id: proj2.id, column_id: cols2['À faire'], position: 1,
      title: 'Économiser 5 000 €',
      description: "Mettre de côté 5 000 € d'ici la fin de l'année.",
      start_date: d(1, 1), due_date: d(12, 31),
      progress: 0,
      labels: ['Finances'],
    });

    console.log('[seed] inserted projects, labels, columns and tasks');
  });
}

// Allow running directly: `node src/db/seed.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => seed())
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
