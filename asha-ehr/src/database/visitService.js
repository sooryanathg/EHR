import db from './schema';

export const VisitService = {
  // Create a new visit
  createVisit: (visitData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO visits (patient_id, date, type, bp_systolic, bp_diastolic, weight, notes, next_visit) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            visitData.patient_id,
            visitData.date,
            visitData.type,
            visitData.bp_systolic || null,
            visitData.bp_diastolic || null,
            visitData.weight || null,
            visitData.notes || null,
            visitData.next_visit || null
          ],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get visits for a patient
  getVisitsByPatientId: (patientId) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM visits WHERE patient_id = ? ORDER BY date DESC',
          [patientId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get all visits
  getAllVisits: () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT v.*, p.name as patient_name, p.village 
           FROM visits v 
           JOIN patients p ON v.patient_id = p.id 
           ORDER BY v.date DESC`,
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get unsynced visits
  getUnsyncedVisits: () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM visits WHERE synced = 0',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Mark visit as synced
  markVisitAsSynced: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE visits SET synced = 1 WHERE id = ?',
          [id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get upcoming visits (next 7 days)
  getUpcomingVisits: () => {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT v.*, p.name as patient_name, p.village 
           FROM visits v 
           JOIN patients p ON v.patient_id = p.id 
           WHERE v.next_visit BETWEEN ? AND ?
           ORDER BY v.next_visit ASC`,
          [today, nextWeek],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  }
};

