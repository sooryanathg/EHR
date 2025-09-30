import db from './schema';

// Avoid circular dependency by requiring SyncQueueService and syncManager when needed

export const VisitService = {
  async createVisit(visit) {
    return db.runAsync(
      `INSERT INTO visits (
        patient_id, date, type, bp_systolic, bp_diastolic,
        weight, notes, next_visit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visit.patient_id,
        visit.date,
        visit.type,
        visit.bp_systolic || null,
        visit.bp_diastolic || null,
        visit.weight || null,
        visit.notes || null,
        visit.next_visit || null,
      ]
    ).then((result) => result.lastInsertRowId);
  },

  async createAndQueueVisit(visit) {
    // Wrapper to create visit and enqueue for sync
    const { SyncQueueService } = require('./syncQueueService');
    const { syncManager } = require('../services/syncManager');

    const visitId = await this.createVisit(visit);

    const fullVisit = {
      id: visitId,
      patient_id: visit.patient_id,
      date: visit.date,
      type: visit.type,
      bp_systolic: visit.bp_systolic || null,
      bp_diastolic: visit.bp_diastolic || null,
      weight: visit.weight || null,
      notes: visit.notes || null,
      next_visit: visit.next_visit || null,
      created_at: new Date().toISOString(),
    };

    await SyncQueueService.addToSyncQueue('visit', visitId, 'create', fullVisit);
    // Trigger background sync
    syncManager.syncData().catch(console.error);

    return visitId;
  },

  async getVisitsByPatientId(patientId) {
    return db.getAllAsync(
      `SELECT * FROM visits WHERE patient_id = ? ORDER BY date DESC`,
      [patientId]
    );
  },

  async updateVisit(visit) {
    return db.runAsync(
      `UPDATE visits SET
        date = ?,
        type = ?,
        bp_systolic = ?,
        bp_diastolic = ?,
        weight = ?,
        notes = ?,
        next_visit = ?
      WHERE id = ?`,
      [
        visit.date,
        visit.type,
        visit.bp_systolic || null,
        visit.bp_diastolic || null,
        visit.weight || null,
        visit.notes || null,
        visit.next_visit || null,
        visit.id,
      ]
    );
  },

  async updateAndQueueVisit(visit) {
    const { SyncQueueService } = require('./syncQueueService');
    const { syncManager } = require('../services/syncManager');

    await this.updateVisit(visit);

    const fullVisit = {
      id: visit.id,
      patient_id: visit.patient_id,
      date: visit.date,
      type: visit.type,
      bp_systolic: visit.bp_systolic || null,
      bp_diastolic: visit.bp_diastolic || null,
      weight: visit.weight || null,
      notes: visit.notes || null,
      next_visit: visit.next_visit || null,
      updated_at: new Date().toISOString(),
    };

    await SyncQueueService.addToSyncQueue('visit', visit.id, 'update', fullVisit);
    syncManager.syncData().catch(console.error);
  },

  async deleteVisit(visitId) {
    return db.runAsync('DELETE FROM visits WHERE id = ?', [visitId]);
  }
};