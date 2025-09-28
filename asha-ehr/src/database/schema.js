import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('asha_ehr.db');

const initializeTables = (tx) => {
  // Patients table
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('pregnant', 'child')),
      village TEXT NOT NULL,
      health_id TEXT UNIQUE,
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );`
  );

  // Visits table
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('anc', 'immunization', 'general')),
      bp_systolic INTEGER,
      bp_diastolic INTEGER,
      weight REAL,
      notes TEXT,
      next_visit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients (id)
    );`
  );

  // Vaccinations table
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      vaccine_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      given_date TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'given', 'overdue')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients (id)
    );`
  );

  // Voice notes table
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS voice_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firebase_url TEXT,
      FOREIGN KEY (visit_id) REFERENCES visits (id)
    );`
  );

  // Sync log table
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  );
};

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Create tables
      initializeTables(tx);
      resolve();
    }, error => {
      console.error('Database initialization error:', error);
      reject(error);
    });
  });
};



export default db;

