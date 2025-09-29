import db from './schema';

export const PatientService = {
  createPatient(patient) {
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
    ).then((result) => result.lastInsertRowId);
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


