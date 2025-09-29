import { openDatabaseSync } from 'expo-sqlite';

export const databaseName = 'asha_ehr.db';
const db = openDatabaseSync(databaseName);

export const initDatabase = async () => {
  // Enable foreign keys and create tables
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('pregnant','lactating','child')),
      village TEXT NOT NULL,
      health_id TEXT UNIQUE,
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('anc','immunization','general')),
      bp_systolic INTEGER,
      bp_diastolic INTEGER,
      weight REAL,
      notes TEXT,
      next_visit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      vaccine_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      given_date TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','given','overdue')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
      data TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed')),
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_attempt DATETIME
    );
  `);

  // Fix up any existing rows that may have NULL for data or status (migration safety)
  try {
    await db.execAsync(`
      UPDATE sync_queue SET data = '{}' WHERE data IS NULL;
      UPDATE sync_queue SET status = 'pending' WHERE status IS NULL;
    `);
  } catch (e) {
    // If sync_queue doesn't exist yet, ignore the error
    // console.warn('No sync_queue to migrate yet:', e.message);
  }
  // Ensure firestore_id column exists in tables (migration)
  try {
    await db.execAsync(`ALTER TABLE patients ADD COLUMN firestore_id TEXT;`);
  } catch (e) { /* ignore if column exists */ }
  try {
    await db.execAsync(`ALTER TABLE visits ADD COLUMN firestore_id TEXT;`);
  } catch (e) { /* ignore if column exists */ }
  try {
    await db.execAsync(`ALTER TABLE vaccinations ADD COLUMN firestore_id TEXT;`);
  } catch (e) { /* ignore if column exists */ }
};

export default db;


