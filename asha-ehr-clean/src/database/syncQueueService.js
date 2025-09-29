import db from './schema';

export const SyncQueueService = {
  async addToSyncQueue(recordType, recordId, action, data = null) {
    // If data is provided directly, use it; otherwise attempt to read from the table
    let payload = null;
    if (data) {
      payload = data;
    } else {
      // Normalize table name: callers may pass 'patient' or 'patients'
      const table = recordType.endsWith('s') ? recordType : `${recordType}s`;
      payload = await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
    }

    const dataValue = payload ? JSON.stringify(payload) : JSON.stringify({});
    const statusValue = 'pending';

    return db.runAsync(
      `INSERT INTO sync_queue (record_type, record_id, action, data, status)
       VALUES (?, ?, ?, ?, ?)`,
      [recordType, recordId, action, dataValue, statusValue]
    );
  },

  async getPendingSyncItems() {
    return db.getAllAsync(
      `SELECT * FROM sync_queue WHERE status IN ('pending','failed') ORDER BY id ASC`
    );
  },

  async removeSyncItem(id) {
    return db.runAsync(
      `DELETE FROM sync_queue WHERE id = ?`,
      [id]
    );
  },

  async markRecordSynced(recordType, recordId) {
    // Normalize recordType: accept 'patient' or 'patients'
    const table = recordType.endsWith('s') ? recordType : `${recordType}s`;
    return db.runAsync(
      `UPDATE ${table} SET synced = 1 WHERE id = ?`,
      [recordId]
    );
  },

  async getUnsynced() {
    const patients = await db.getAllAsync(
      `SELECT * FROM patients WHERE synced = 0`
    );
    
    const visits = await db.getAllAsync(
      `SELECT * FROM visits WHERE synced = 0`
    );
    
    const vaccinations = await db.getAllAsync(
      `SELECT * FROM vaccinations WHERE synced = 0`
    );
    
    return {
      patients,
      visits,
      vaccinations
    };
  }
};