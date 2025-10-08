import { openDatabaseSync } from 'expo-sqlite';

export const databaseName = 'asha_ehr.db';
const db = openDatabaseSync(databaseName);

// Polyfill/augment the returned db with async helper methods when they are not present.
if (!db.runAsync) {
  const execSql = (sql, params = []) =>
    new Promise((resolve, reject) => {
      try {
        db.transaction(
          (tx) => {
            tx.executeSql(
              sql,
              params,
              (_tx, result) => resolve(result),
              (_tx, err) => {
                reject(err || new Error('SQL execution error'));
                return false;
              }
            );
          },
          (txErr) => reject(txErr)
        );
      } catch (e) {
        reject(e);
      }
    });

  db.runAsync = async (sql, params = []) => {
    const res = await execSql(sql, params);
    return res;
  };

  db.getAllAsync = async (sql, params = []) => {
    const res = await execSql(sql, params);
    if (!res) return [];
    if (res.rows && Array.isArray(res.rows._array)) return res.rows._array;
    if (res.rows && Array.isArray(res.rows)) return res.rows;
    if (Array.isArray(res)) return res;
    return [];
  };

  db.getFirstAsync = async (sql, params = []) => {
    const rows = await db.getAllAsync(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  };

  db.execAsync = async (sql) => {
    await execSql(sql, []);
    return true;
  };
}

const CURRENT_DB_VERSION = 4; // Increment this when schema changes

export const initDatabase = async () => {
  // Check and update database version
  const checkDatabaseVersion = async () => {
    try {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );

      const versionRow = await db.getFirstAsync(
        'SELECT version FROM db_version ORDER BY version DESC LIMIT 1'
      );
      const currentVersion = versionRow ? versionRow.version : 0;
      console.log('Current database version:', currentVersion);
      return currentVersion;
    } catch (error) {
      console.error('Error checking database version:', error);
      return 0;
    }
  };

  // Define migrations to run
  const runMigrations = async () => {
    try {
      console.log('Starting database migrations...');
      const dbVersion = await checkDatabaseVersion();

      if (dbVersion < CURRENT_DB_VERSION) {
        if (dbVersion < 4) {
          // ✅ FIX: Ensure migration file exists and is imported correctly
          const { addMedicinesGivenToVisits } = require('./migrations/addMedicinesGivenToVisits');
          await addMedicinesGivenToVisits(db);
        }

        if (dbVersion < 3) {
          // Drop and recreate patients table
          await db.runAsync('DROP TABLE IF EXISTS patients');

          // Create patients table with new schema
          await db.execAsync(
            `CREATE TABLE patients (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              age INTEGER NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('pregnant','lactating','child','general')),
              village TEXT NOT NULL,
              health_id TEXT UNIQUE,
              language TEXT DEFAULT 'en',
              dob TEXT,
              phone TEXT,
              aadhar TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              synced INTEGER DEFAULT 0,
              firestore_id TEXT,
              asha_id TEXT
            )`
          );

          // Update database version
          await db.runAsync('INSERT INTO db_version (version) VALUES (?)', [
            CURRENT_DB_VERSION,
          ]);

          console.log('Successfully updated database to version', CURRENT_DB_VERSION);
        }
      }
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }; // ✅ FIX: Added missing closing brace and semicolon

  // Enable foreign keys and create tables
  const stmts = [
    `PRAGMA foreign_keys = ON;`,
    `PRAGMA recursive_triggers = ON;`,

    `CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('pregnant','lactating','child','general')),
      village TEXT NOT NULL,
      health_id TEXT UNIQUE,
      language TEXT DEFAULT 'en',
      dob TEXT,
      phone TEXT,
      aadhar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firestore_id TEXT,
      asha_id TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS pregnancy_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      lmp_date TEXT NOT NULL,
      edd_date TEXT NOT NULL,
      gravida INTEGER DEFAULT 1,
      parity INTEGER DEFAULT 0,
      high_risk INTEGER DEFAULT 0,
      delivery_date TEXT,
      delivery_outcome TEXT,
      child_patient_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firestore_id TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (child_patient_id) REFERENCES patients(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('anc','immunization','general')),
      bp_systolic INTEGER,
      bp_diastolic INTEGER,
      weight REAL,
      notes TEXT,
      medicines_given TEXT,
      next_visit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firestore_id TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS scheduled_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      visit_type TEXT NOT NULL CHECK (visit_type IN ('anc','immunization','general')),
      schedule_type TEXT NOT NULL,
      due_date TEXT NOT NULL,
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','missed')),
      completed_date TEXT,
      visit_id INTEGER,
      notification_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firestore_id TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      schedule_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('reminder','overdue','completed')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      notification_identifier TEXT,
      scheduled_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firestore_id TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES scheduled_visits(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      vaccine_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      given_date TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','given','overdue')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      firestore_id TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS sync_queue (
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
    );`,
  ];

  // Execute statements sequentially
  for (const s of stmts) {
    try {
      await db.execAsync(s);
    } catch (e) {
      console.error('Failed to execute schema statement:', e);
      throw e; // Stop if any statement fails
    }
  }

  // Run migrations after schema is set up
  await runMigrations();
};

export default db;
