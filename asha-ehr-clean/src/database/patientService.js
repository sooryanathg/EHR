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

      const patientId = result.lastInsertRowId;

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
      // First, delete dependent records (visits, vaccinations) to satisfy foreign keys.
      // Use services to fetch the child rows so we can enqueue delete actions for them.
      const { VisitService } = require('./visitService');
      const { VaccinationService } = require('./vaccinationService');

      // Fetch visits (use same DB connection) and enqueue deletes, then remove them in bulk
      try {
        const visits = await db.getAllAsync(`SELECT * FROM visits WHERE patient_id = ?`, [id]);
        console.log(`PatientService.deletePatient: found ${visits.length} visits for patient ${id}`);
        for (const v of visits) {
          await SyncQueueService.addToSyncQueue('visit', v.id, 'delete', v);
        }
        // We'll delete in the transaction below
      } catch (e) {
        console.warn('Failed cleaning visits before patient delete:', e.message || e);
      }

      // Fetch vaccinations (use same DB connection) and enqueue deletes; actual deletes happen in transaction
      try {
        const vaccinations = await db.getAllAsync(`SELECT * FROM vaccinations WHERE patient_id = ?`, [id]);
        console.log(`PatientService.deletePatient: found ${vaccinations.length} vaccinations for patient ${id}`);
        for (const vac of vaccinations) {
          await SyncQueueService.addToSyncQueue('vaccination', vac.id, 'delete', vac);
        }
      } catch (e) {
        console.warn('Failed cleaning vaccinations before patient delete:', e.message || e);
      }

      // Diagnostic: print FK list, integrity and counts to help debug constraints
      try {
        const fkList = await db.getAllAsync("PRAGMA foreign_key_list('visits')");
        console.log('PRAGMA foreign_key_list(visits):', fkList);
      } catch (e) {
        console.warn('Failed reading PRAGMA foreign_key_list(visits):', e.message || e);
      }
      // List all tables and their foreign key lists to detect any unexpected FKs
      try {
        const masters = await db.getAllAsync(`SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','trigger')`);
        console.log('sqlite_master entries:', masters.map(m => ({ name: m.name, type: m.type })));
        for (const m of masters) {
          if (m.type === 'table') {
            try {
              const fk = await db.getAllAsync(`PRAGMA foreign_key_list('${m.name}')`);
              console.log(`PRAGMA foreign_key_list(${m.name}):`, fk);
            } catch (e) {
              console.warn(`Failed PRAGMA foreign_key_list for ${m.name}:`, e.message || e);
            }
          }
          if (m.type === 'trigger') {
            console.log(`Trigger SQL for ${m.name}:`, m.sql && m.sql.substring(0, 200));
          }
        }
      } catch (e) {
        console.warn('Failed listing sqlite_master entries:', e.message || e);
      }
      try {
        const integrity = await db.getFirstAsync("PRAGMA integrity_check");
        console.log('PRAGMA integrity_check:', integrity);
      } catch (e) {
        console.warn('Failed running integrity_check:', e.message || e);
      }
      try {
        const counts = await db.getAllAsync(`SELECT 'patients' as tbl, COUNT(*) as cnt FROM patients UNION ALL SELECT 'visits', COUNT(*) FROM visits UNION ALL SELECT 'vaccinations', COUNT(*) FROM vaccinations`);
        console.log('Table counts:', counts);
      } catch (e) {
        console.warn('Failed getting table counts:', e.message || e);
      }
      try {
        const refs = await db.getAllAsync(`SELECT * FROM visits WHERE patient_id = ? UNION ALL SELECT * FROM vaccinations WHERE patient_id = ?`, [id, id]);
        console.log(`Rows referencing patient ${id}:`, refs);
      } catch (e) {
        console.warn('Failed listing referencing rows:', e.message || e);
      }

      // Now perform deletions inside a transaction to avoid FK race conditions
      try {
        await db.runAsync('BEGIN TRANSACTION');
        console.log(`PatientService.deletePatient: deleting notification_queue for patient ${id}`);
        // notification_queue may reference scheduled_visits and patients
        await db.runAsync(`DELETE FROM notification_queue WHERE patient_id = ?`, [id]);

        console.log(`PatientService.deletePatient: deleting scheduled_visits for patient ${id}`);
        // scheduled_visits may reference visits and patients
        await db.runAsync(`DELETE FROM scheduled_visits WHERE patient_id = ?`, [id]);

        console.log(`PatientService.deletePatient: deleting pregnancy_details for patient ${id}`);
        // pregnancy_details may reference patient_id and child_patient_id
        await db.runAsync(`DELETE FROM pregnancy_details WHERE patient_id = ? OR child_patient_id = ?`, [id, id]);

        console.log(`PatientService.deletePatient: deleting visits for patient ${id}`);
        await db.runAsync(`DELETE FROM visits WHERE patient_id = ?`, [id]);
        console.log(`PatientService.deletePatient: deleting vaccinations for patient ${id}`);
        await db.runAsync(`DELETE FROM vaccinations WHERE patient_id = ?`, [id]);
        console.log(`PatientService.deletePatient: deleting patient ${id}`);
        await db.runAsync(`DELETE FROM patients WHERE id = ?`, [id]);
        await db.runAsync('COMMIT');

        // Add to sync queue for patient deletion
        await SyncQueueService.addToSyncQueue('patient', id, 'delete', { id });
        // Trigger sync in the background
        syncManager.syncData().catch(console.error);
        return true;
      } catch (txErr) {
        console.error('PatientService.deletePatient transaction failed, rolling back:', txErr);
        try {
          await db.runAsync('ROLLBACK');
        } catch (rbErr) {
          console.error('Rollback failed:', rbErr);
        }
        throw txErr;
      }
    } catch (error) {
      console.error('Error in PatientService.deletePatient:', error);
      throw error;
    }
  },
};


