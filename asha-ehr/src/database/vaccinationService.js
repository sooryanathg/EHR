import db from './schema';

export const VaccinationService = {
  // Create a new vaccination record
  createVaccination: (vaccinationData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO vaccinations (patient_id, vaccine_name, due_date, given_date, status) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            vaccinationData.patient_id,
            vaccinationData.vaccine_name,
            vaccinationData.due_date,
            vaccinationData.given_date || null,
            vaccinationData.status || 'pending'
          ],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get vaccinations for a patient
  getVaccinationsByPatientId: (patientId) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM vaccinations WHERE patient_id = ? ORDER BY due_date ASC',
          [patientId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get all vaccinations
  getAllVaccinations: () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT v.*, p.name as patient_name, p.village 
           FROM vaccinations v 
           JOIN patients p ON v.patient_id = p.id 
           ORDER BY v.due_date ASC`,
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get overdue vaccinations
  getOverdueVaccinations: () => {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT v.*, p.name as patient_name, p.village 
           FROM vaccinations v 
           JOIN patients p ON v.patient_id = p.id 
           WHERE v.due_date < ? AND v.status = 'pending'
           ORDER BY v.due_date ASC`,
          [today],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get upcoming vaccinations (next 7 days)
  getUpcomingVaccinations: () => {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT v.*, p.name as patient_name, p.village 
           FROM vaccinations v 
           JOIN patients p ON v.patient_id = p.id 
           WHERE v.due_date BETWEEN ? AND ? AND v.status = 'pending'
           ORDER BY v.due_date ASC`,
          [today, nextWeek],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Update vaccination status
  updateVaccinationStatus: (id, status, givenDate = null) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE vaccinations SET status = ?, given_date = ?, synced = 0 WHERE id = ?',
          [status, givenDate, id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get unsynced vaccinations
  getUnsyncedVaccinations: () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM vaccinations WHERE synced = 0',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Mark vaccination as synced
  markVaccinationAsSynced: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE vaccinations SET synced = 1 WHERE id = ?',
          [id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  }
};

