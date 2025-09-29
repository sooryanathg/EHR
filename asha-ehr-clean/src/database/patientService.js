import db from './schema';
import { SyncQueueService } from './syncQueueService';
import { syncManager } from '../services/syncManager';

export const PatientService = {
  async createPatient(patient) {
    return db.runAsync(
      `INSERT INTO patients (name, age, type, village, health_id, language)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        patient.name,
        patient.age,
        patient.type,
        patient.village,
        patient.health_id || null,
        patient.language || 'en',
      ]
    ).then(async (result) => {
      const patientId = result.lastInsertRowId;
      // Add to sync queue
      await SyncQueueService.addToSyncQueue('patient', patientId, 'create');
      // Trigger sync
      syncManager.syncData().catch(console.error);
      return patientId;
    });
  },

  getAllPatients() {
    return db.getAllAsync(`SELECT * FROM patients ORDER BY created_at DESC`);
  },

  searchPatients(query) {
    const like = `%${query}%`;
    return db.getAllAsync(
      `SELECT * FROM patients
       WHERE name LIKE ? OR village LIKE ? OR IFNULL(health_id,'') LIKE ?
       ORDER BY created_at DESC`,
      [like, like, like]
    );
  },

  getPatientById(id) {
    return db.getFirstAsync(
      `SELECT * FROM patients WHERE id = ?`,
      [id]
    );
  },
};


