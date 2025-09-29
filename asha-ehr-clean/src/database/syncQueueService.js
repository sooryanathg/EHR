import db from './schema';
import { FirestoreSync } from '../services/firestoreSync';

const getTableName = (recordType) => {
  // Convert plural to singular if needed
  const singular = recordType.replace(/s$/, '');
  return singular + 's';
};

export const SyncQueueService = {
  async addToSyncQueue(recordType, recordId, action) {
    // Get the record data based on type
    const table = getTableName(recordType);
    const record = await db.getFirstAsync(
      `SELECT * FROM ${table} WHERE id = ?`,
      [recordId]
    );

    return db.runAsync(
      `INSERT INTO sync_queue (record_type, record_id, action, data, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [recordType, recordId, action, JSON.stringify(record)]
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

  async markRecordSynced(recordType, recordId, firestoreId) {
    const table = getTableName(recordType);
    
    // Update the record in the main table
    await db.runAsync(
      `UPDATE ${table} SET synced = 1, firestore_id = ? WHERE id = ?`,
      [firestoreId, recordId]
    );
    
    // Update the sync queue status
    await db.runAsync(
      `UPDATE sync_queue SET status = 'completed', synced = 1 
       WHERE record_type = ? AND record_id = ? AND status != 'completed'`,
      [recordType, recordId]
    );
  },

  async getUnsynced() {
    const unsyncedQueue = await db.getAllAsync(
      `SELECT * FROM sync_queue 
       WHERE status IN ('pending', 'failed') 
       ORDER BY created_at ASC`
    );
    
    const patients = [];
    const visits = [];
    const vaccinations = [];
    
    for (const item of unsyncedQueue) {
      const data = JSON.parse(item.data);
      switch (item.record_type) {
        case 'patient':
          patients.push(data);
          break;
        case 'visit':
          visits.push(data);
          break;
        case 'vaccination':
          vaccinations.push(data);
          break;
      }
    }
    
    return {
      patients,
      visits,
      vaccinations
    };
  }
};