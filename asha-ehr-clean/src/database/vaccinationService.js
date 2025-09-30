import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('asha_ehr.db');

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
    ).then((result) => result.lastInsertRowId);
  },

  async createAndQueueVaccination(vaccination) {
    const { SyncQueueService } = require('./syncQueueService');
    const { syncManager } = require('../services/syncManager');

    const id = await this.createVaccination(vaccination);

    const fullVaccination = {
      id,
      patient_id: vaccination.patient_id,
      vaccine_name: vaccination.vaccine_name,
      due_date: vaccination.due_date,
      given_date: vaccination.given_date || null,
      status: vaccination.status || 'pending',
      created_at: new Date().toISOString(),
    };

    await SyncQueueService.addToSyncQueue('vaccination', id, 'create', fullVaccination);
    syncManager.syncData().catch(console.error);

    return id;
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
    );
  },

  async updateAndQueueVaccination(vaccination) {
    const { SyncQueueService } = require('./syncQueueService');
    const { syncManager } = require('../services/syncManager');

    await this.updateVaccination(vaccination);

    const fullVaccination = {
      id: vaccination.id,
      patient_id: vaccination.patient_id,
      vaccine_name: vaccination.vaccine_name,
      due_date: vaccination.due_date,
      given_date: vaccination.given_date || null,
      status: vaccination.status || 'pending',
      updated_at: new Date().toISOString(),
    };

    await SyncQueueService.addToSyncQueue('vaccination', vaccination.id, 'update', fullVaccination);
    syncManager.syncData().catch(console.error);
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