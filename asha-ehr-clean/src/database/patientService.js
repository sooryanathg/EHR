import db from './schema';
import { syncManager } from '../services/syncManager';

export const PatientService = {
  async createPatient(patient) {
    // Import SyncQueueService here to avoid circular dependency issues
    const { SyncQueueService } = require('./syncQueueService');

    try {
      const result = await db.runAsync(
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
      );

      // Different sqlite drivers return insert id with different property names.
      const patientId = result && (result.insertId || result.lastInsertRowId || result.lastID || result.id);
      console.log('PatientService.createPatient inserted id ->', patientId, 'rawResult:', result);

      // Add to sync queue - pass the full patient payload to avoid race conditions
      const fullPatient = {
        id: patientId,
        name: patient.name,
        age: patient.age,
        type: patient.type,
        village: patient.village,
        health_id: patient.health_id || null,
        language: patient.language || 'en',
        created_at: new Date().toISOString()
      };

  await SyncQueueService.addToSyncQueue('patient', patientId, 'create', fullPatient);

      // Trigger sync in the background
      syncManager.syncData().catch(console.error);

      return patientId;
    } catch (error) {
      console.error('Error in PatientService.createPatient:', error);
      throw error; // Re-throw the error to be caught by the UI
    }
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

  async deletePatient(id) {
    // Import SyncQueueService here to avoid circular dependency issues
    const { SyncQueueService } = require('./syncQueueService');
    try {
      await db.runAsync(`DELETE FROM patients WHERE id = ?`, [id]);
      // Add to sync queue for deletion
      await SyncQueueService.addToSyncQueue('patient', id, 'delete', { id });
      // Trigger sync in the background
      syncManager.syncData().catch(console.error);
      return true;
    } catch (error) {
      console.error('Error in PatientService.deletePatient:', error);
      throw error;
    }
  },
};


