import db from './schema';

export const SyncQueueService = {
  async addToSyncQueue(recordType, recordId, action) {
    return db.runAsync(
      `INSERT INTO sync_queue (record_type, record_id, action)
       VALUES (?, ?, ?)`,
      [recordType, recordId, action]
    );
  },

  async getPendingSyncItems() {
    return db.getAllAsync(
      `SELECT * FROM sync_queue ORDER BY id ASC`
    );
  },

  async removeSyncItem(id) {
    return db.runAsync(
      `DELETE FROM sync_queue WHERE id = ?`,
      [id]
    );
  },

  async markRecordSynced(recordType, recordId) {
    const table = recordType + 's'; // patients, visits, vaccinations
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