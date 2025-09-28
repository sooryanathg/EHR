// Mock SQLite implementation for development
// This allows the app to start while we resolve the expo-sqlite issue

let mockDb = {
  patients: [],
  visits: [],
  vaccinations: [],
  voice_notes: [],
  sync_log: []
};

let nextId = 1;

const mockTransaction = (callback) => {
  const mockTx = {
    executeSql: (sql, params = [], successCallback, errorCallback) => {
      try {
        // Parse SQL and execute mock operations
        if (sql.includes('CREATE TABLE')) {
          // Table creation - just return success
          if (successCallback) successCallback({ insertId: null });
        } else if (sql.includes('INSERT INTO')) {
          // Insert operation
          const tableName = sql.match(/INSERT INTO (\w+)/)[1];
          const record = {
            id: nextId++,
            ...Object.fromEntries(
              sql.match(/\(([^)]+)\)/)[1].split(',').map((col, index) => [
                col.trim(),
                params[index] || null
              ])
            )
          };
          mockDb[tableName].push(record);
          if (successCallback) successCallback({ insertId: record.id });
        } else if (sql.includes('SELECT')) {
          // Select operation
          const tableName = sql.match(/FROM (\w+)/)[1];
          let results = mockDb[tableName] || [];
          
          // Simple WHERE clause handling
          if (sql.includes('WHERE')) {
            const whereClause = sql.match(/WHERE (.+)/)[1];
            if (whereClause.includes('id = ?')) {
              const id = params[0];
              results = results.filter(item => item.id === id);
            }
          }
          
          if (successCallback) successCallback({ rows: { _array: results } });
        } else if (sql.includes('UPDATE')) {
          // Update operation
          const tableName = sql.match(/UPDATE (\w+)/)[1];
          if (sql.includes('WHERE id = ?')) {
            const id = params[params.length - 1];
            const index = mockDb[tableName].findIndex(item => item.id === id);
            if (index !== -1) {
              // Update the record
              const updateData = Object.fromEntries(
                sql.match(/SET (.+?) WHERE/)[1].split(',').map((col, i) => [
                  col.trim().split('=')[0].trim(),
                  params[i]
                ])
              );
              mockDb[tableName][index] = { ...mockDb[tableName][index], ...updateData };
            }
          }
          if (successCallback) successCallback({ rowsAffected: 1 });
        }
      } catch (error) {
        if (errorCallback) errorCallback({}, error);
      }
    }
  };
  
  callback(mockTx);
};

const mockDbInstance = {
  transaction: mockTransaction
};

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    mockTransaction(tx => {
      // Create tables
      tx.executeSql(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        type TEXT NOT NULL,
        village TEXT NOT NULL,
        health_id TEXT UNIQUE,
        language TEXT DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      )`);
      
      tx.executeSql(`CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        bp_systolic INTEGER,
        bp_diastolic INTEGER,
        weight REAL,
        notes TEXT,
        next_visit TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      )`);
      
      tx.executeSql(`CREATE TABLE IF NOT EXISTS vaccinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        vaccine_name TEXT NOT NULL,
        due_date TEXT NOT NULL,
        given_date TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      )`);
      
      tx.executeSql(`CREATE TABLE IF NOT EXISTS voice_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0,
        firebase_url TEXT
      )`);
      
      tx.executeSql(`CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    }, 
    (error) => reject(error),
    () => resolve()
    );
  });
};

export default mockDbInstance;
