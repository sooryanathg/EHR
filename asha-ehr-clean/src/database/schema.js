import { openDatabaseSync } from 'expo-sqlite';

export const databaseName = 'asha_ehr.db';
const db = openDatabaseSync(databaseName);

export const initDatabase = async () => {
  // Enable foreign keys and create tables
  const stmts = [
    `PRAGMA foreign_keys = ON;`,
    `CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('pregnant','lactating','child')),
      village TEXT NOT NULL,
      health_id TEXT UNIQUE,
      language TEXT DEFAULT 'en',
      dob TEXT,
      phone TEXT,
      aadhar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
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
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (child_patient_id) REFERENCES patients(id)
    );`,
    `CREATE TABLE IF NOT EXISTS scheduled_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      visit_type TEXT NOT NULL CHECK (visit_type IN ('anc','immunization')),
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
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (visit_id) REFERENCES visits(id)
    );`,
    `CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      schedule_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('reminder','overdue','completed')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (schedule_id) REFERENCES scheduled_visits(id)
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
      next_visit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
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
      FOREIGN KEY (patient_id) REFERENCES patients(id)
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

  // Execute statements sequentially so one failing statement won't block the rest
  for (const s of stmts) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await db.execAsync(s);
    } catch (e) {
      console.warn('DB statement failed (continuing):', e.message);
    }
  }

  // Fix up any existing rows that may have NULL for data or status (migration safety)
  try {
    await db.execAsync(`UPDATE sync_queue SET data = '{}' WHERE data IS NULL;`);
    await db.execAsync(`UPDATE sync_queue SET status = 'pending' WHERE status IS NULL;`);
  } catch (e) {
    // If sync_queue doesn't exist yet, ignore the error
    // console.warn('No sync_queue to migrate yet:', e.message);
  }
  // Ensure firestore_id column exists in tables (migration)
  // Helper to check if a column exists in a table and add it if missing
  async function ensureColumn(tableName, columnName, columnDef) {
    try {
      const cols = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
      const exists = cols && cols.some && cols.some((c) => c.name === columnName);
      if (!exists) {
        console.log(`Migrating: adding column ${columnName} to ${tableName}`);
        await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef};`);
      }
    } catch (e) {
      // If the table doesn't exist yet or another error occurred, log and continue
      console.warn(`ensureColumn failed for ${tableName}.${columnName}:`, e.message);
    }
  }

  await ensureColumn('patients', 'firestore_id', 'firestore_id TEXT');
  await ensureColumn('visits', 'firestore_id', 'firestore_id TEXT');
  await ensureColumn('visits', 'medicines_given', 'medicines_given TEXT');
  await ensureColumn('vaccinations', 'firestore_id', 'firestore_id TEXT');
  await ensureColumn('scheduled_visits', 'firestore_id', 'firestore_id TEXT');
  await ensureColumn('pregnancy_details', 'firestore_id', 'firestore_id TEXT');
  await ensureColumn('notification_queue', 'notification_identifier', 'notification_identifier TEXT');
  await ensureColumn('notification_queue', 'firestore_id', 'firestore_id TEXT');
};

export default db;


