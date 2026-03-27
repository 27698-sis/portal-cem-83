import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('database.sqlite');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha TEXT NOT NULL,
    activa INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS planificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacherName TEXT NOT NULL,
    module TEXT NOT NULL,
    cycleYear TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    data TEXT NOT NULL,
    observations TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS configuracion (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS estudiantes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    course TEXT NOT NULL,
    division TEXT,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL
  );
`);

// Seed students if empty
const studentCount = db.prepare('SELECT COUNT(*) as count FROM estudiantes').get() as { count: number };
if (studentCount.count === 0) {
  const { studentsData } = await import('./src/data/students.js');
  const insertStudent = db.prepare('INSERT INTO estudiantes (id, name, course, division, status) VALUES (?, ?, ?, ?, ?)');
  const transaction = db.transaction((students) => {
    for (const s of students) {
      insertStudent.run(s.id, s.name, s.course, s.division, s.status);
    }
  });
  transaction(studentsData);
}

// Seed default config if empty
const configCount = db.prepare('SELECT COUNT(*) as count FROM configuracion').get() as { count: number };
if (configCount.count === 0) {
  const insertConfig = db.prepare('INSERT INTO configuracion (key, value) VALUES (?, ?)');
  insertConfig.run('docentes', '76341');
  insertConfig.run('preceptoria', '35462');
  insertConfig.run('directivo', '87653');
  insertConfig.run('coordinacion', '5522');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/notificaciones', (req, res) => {
    const rows = db.prepare('SELECT * FROM notificaciones WHERE activa = 1').all();
    res.json(rows.map((r: any) => ({ ...r, activa: !!r.activa })));
  });

  app.post('/api/notificaciones', (req, res) => {
    const { titulo, mensaje, fecha, activa } = req.body;
    const result = db.prepare('INSERT INTO notificaciones (titulo, mensaje, fecha, activa) VALUES (?, ?, ?, ?)')
      .run(titulo, mensaje, fecha, activa ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  });

  app.get('/api/planificaciones', (req, res) => {
    const rows = db.prepare('SELECT * FROM planificaciones').all();
    res.json(rows.map((r: any) => ({
      ...r,
      data: JSON.parse(r.data),
      observations: JSON.parse(r.observations)
    })));
  });

  app.post('/api/planificaciones', (req, res) => {
    const { teacherName, module, cycleYear, status, timestamp, data } = req.body;
    const result = db.prepare('INSERT INTO planificaciones (teacherName, module, cycleYear, status, timestamp, data) VALUES (?, ?, ?, ?, ?, ?)')
      .run(teacherName, module, cycleYear, status, timestamp, JSON.stringify(data));
    res.json({ id: result.lastInsertRowid });
  });

  app.patch('/api/planificaciones/:id', (req, res) => {
    const { id } = req.params;
    const { status, observations, teacherName, module, cycleYear, data } = req.body;
    
    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (observations !== undefined) { updates.push('observations = ?'); params.push(JSON.stringify(observations)); }
    if (teacherName !== undefined) { updates.push('teacherName = ?'); params.push(teacherName); }
    if (module !== undefined) { updates.push('module = ?'); params.push(module); }
    if (cycleYear !== undefined) { updates.push('cycleYear = ?'); params.push(cycleYear); }
    if (data !== undefined) { updates.push('data = ?'); params.push(JSON.stringify(data)); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE planificaciones SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true });
  });

  app.get('/api/estudiantes', (req, res) => {
    const rows = db.prepare('SELECT * FROM estudiantes').all();
    res.json(rows);
  });

  app.patch('/api/estudiantes/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE estudiantes SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  });

  app.get('/api/configuracion', (req, res) => {
    const rows = db.prepare('SELECT * FROM configuracion').all();
    const config = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(config);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
