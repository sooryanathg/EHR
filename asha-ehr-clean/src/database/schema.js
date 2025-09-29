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
      data TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','syncing','completed','failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
      data TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed','failed')),
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_attempt DATETIME
    );
  `);
};

export default db;


