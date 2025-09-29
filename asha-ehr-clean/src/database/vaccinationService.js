import db from './schema';
import { SyncQueueService } from './syncQueueService';
import { syncManager } from '../services/syncManager';

export const VaccinationService = {
  async createVaccination(vaccination) {
    return db.runAsync(
      `INSERT INTO vaccinations (
        patient_id, vaccine_name, due_date, given_date, status
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        vaccination.patient_id,
        vaccination.vaccine_name,
        vaccination.due_date,
        vaccination.given_date || null,
        vaccination.status || 'pending'
      ]
    ).then(async (result) => {
      const vaccinationId = result.lastInsertRowId;
      // Add to sync queue
      await SyncQueueService.addToQueue('vaccinations', vaccinationId, 'create');
      // Trigger sync
      syncManager.syncData().catch(console.error);
      return vaccinationId;
    });
  },

  async getVaccinationsByPatientId(patientId) {
    return db.getAllAsync(
      `SELECT * FROM vaccinations 
       WHERE patient_id = ? 
       ORDER BY due_date ASC`,
      [patientId]
    );
  },

  async updateVaccination(vaccination) {
    return db.runAsync(
      `UPDATE vaccinations 
       SET given_date = ?, status = ?
       WHERE id = ?`,
      [
        vaccination.given_date,
        vaccination.status,
        vaccination.id
      ]
    ).then(async () => {
      // Add to sync queue
      await SyncQueueService.addToQueue('vaccinations', vaccination.id, 'update');
      // Trigger sync
      syncManager.syncData().catch(console.error);
    });
  },

  async getOverdueVaccinations() {
    const today = new Date().toISOString().split('T')[0];
    return db.getAllAsync(
      `SELECT v.*, p.name as patient_name, p.village
       FROM vaccinations v
       JOIN patients p ON p.id = v.patient_id
       WHERE v.status = 'pending' 
       AND v.due_date < ?
       ORDER BY v.due_date ASC`,
      [today]
    );
  },

  async deleteVaccination(id) {
    return db.runAsync(
      'DELETE FROM vaccinations WHERE id = ?',
      [id]
    );
  }
};