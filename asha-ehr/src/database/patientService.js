import db from './schema';

export const PatientService = {
  // Create a new patient
  createPatient: (patientData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO patients (name, age, type, village, health_id, language) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            patientData.name,
            patientData.age,
            patientData.type,
            patientData.village,
            patientData.health_id || null,
            patientData.language || 'en'
          ],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get all patients
  getAllPatients: () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM patients ORDER BY created_at DESC',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get patient by ID
  getPatientById: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM patients WHERE id = ?',
          [id],
          (_, { rows }) => resolve(rows._array[0]),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Update patient
  updatePatient: (id, patientData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE patients SET 
           name = ?, age = ?, type = ?, village = ?, health_id = ?, language = ?, synced = 0
           WHERE id = ?`,
          [
            patientData.name,
            patientData.age,
            patientData.type,
            patientData.village,
            patientData.health_id,
            patientData.language,
            id
          ],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get unsynced patients
  getUnsyncedPatients: () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM patients WHERE synced = 0',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Mark patient as synced
  markPatientAsSynced: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE patients SET synced = 1 WHERE id = ?',
          [id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  }
};

