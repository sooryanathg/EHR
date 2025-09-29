import db from './schema';

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

  async deleteVisit(visitId) {
    return db.runAsync('DELETE FROM visits WHERE id = ?', [visitId]);
  }
};