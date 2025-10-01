import db from './schema';

export const SyncQueueService = {
  async addToSyncQueue(recordType, recordId, action, data = null) {
    // If data is provided directly, use it; otherwise attempt to read from the table
    let payload = null;
    if (data) {
      payload = data;
    } else {
      // Normalize table name: callers may pass 'patient' or 'patients'
      // Map known pluralization mismatches (notifications -> notification_queue)
      const tableMap = {
        patient: 'patients',
        patients: 'patients',
        visit: 'visits',
        visits: 'visits',
        vaccination: 'vaccinations',
        vaccinations: 'vaccinations',
        scheduled_visits: 'scheduled_visits',
        pregnancy_details: 'pregnancy_details',
        notification: 'notification_queue',
        notifications: 'notification_queue'
      };

      const table = tableMap[recordType] || (recordType.endsWith('s') ? recordType : `${recordType}s`);
      try {
        payload = await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
      } catch (e) {
        console.warn(`Failed to read payload from ${table} for addToSyncQueue:`, e.message);
        payload = null;
      }
    }

    const dataValue = payload ? JSON.stringify(payload) : JSON.stringify({});
    const statusValue = 'pending';

    console.log('Adding to sync queue:', { recordType, recordId, action });
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