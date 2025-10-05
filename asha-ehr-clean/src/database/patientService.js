import db from './schema';
import { syncManager } from '../services/syncManager';
import { auth } from '../lib/firebase';

export const PatientService = {
  async ensurePatientTable() {
    try {
      // Check if the table exists and has the asha_id column
      const tableInfo = await db.getAllAsync("PRAGMA table_info(patients)");
      const hasAshaId = tableInfo.some(col => col.name === 'asha_id');
      
      if (!hasAshaId) {
        // Recreate the table with the correct schema
        await db.runAsync('BEGIN TRANSACTION');
        
        // Create temporary table
        await db.execAsync(
          `CREATE TABLE patients_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('pregnant','lactating','child')),
            village TEXT NOT NULL,
            health_id TEXT UNIQUE,
            language TEXT DEFAULT 'en',
            dob TEXT,
            phone TEXT,
            aadhar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0,
            firestore_id TEXT,
            asha_id TEXT
          )`
        );

        // Copy data if old table exists
        try {
          await db.execAsync(
            `INSERT INTO patients_new 
             SELECT *, NULL as asha_id 
             FROM patients`
          );
        } catch (e) {
          console.log('No existing data to migrate');
        }

        // Replace old table
        await db.execAsync('DROP TABLE IF EXISTS patients');
        await db.execAsync('ALTER TABLE patients_new RENAME TO patients');
        
        await db.runAsync('COMMIT');
        console.log('Successfully ensured patients table schema');
      }
    } catch (error) {
      console.error('Error ensuring patient table:', error);
      await db.runAsync('ROLLBACK');
      throw error;
    }
  },

  async assignUnassignedPatientsToCurrentAsha() {
    try {
      await this.ensurePatientTable();
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No authenticated user found, skipping patient assignment');
        return;
      }

      // Assign all unassigned patients to the current ASHA
      await db.runAsync(
        `UPDATE patients SET asha_id = ? WHERE asha_id IS NULL`,
        [currentUser.uid]
      );

      console.log('Successfully assigned unassigned patients to current ASHA');
    } catch (error) {
      console.error('Error assigning patients to ASHA:', error);
    }
  },

  async createPatient(patient) {
    // Import SyncQueueService here to avoid circular dependency issues
    const { SyncQueueService } = require('./syncQueueService');
    
    // Ensure table exists with correct schema
    await this.ensurePatientTable();

    try {
      // Get current ASHA ID from auth
      const currentUser = auth.currentUser;
      const ashaId = currentUser ? currentUser.uid : null;

      const result = await db.runAsync(
        `INSERT INTO patients (name, age, type, village, health_id, language, asha_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.name,
          patient.age,
          patient.type,
          patient.village,
          patient.health_id || null,
          patient.language || 'en',
          ashaId,
        ]
      );

      const patientId = result && (result.insertId || result.lastInsertRowId || result.lastID || result.id);
      console.log('PatientService.createPatient inserted id ->', patientId, 'rawResult:', result);

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
      syncManager.syncData().catch(console.error);

      return patientId;
    } catch (error) {
      console.error('Error in PatientService.createPatient:', error);
      throw error;
    }
  },

  async getAllPatients() {
    await this.ensurePatientTable();
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      return db.getAllAsync(
        `SELECT * FROM patients WHERE asha_id = ? OR asha_id IS NULL ORDER BY created_at DESC`,
        [currentUser.uid]
      );
    } else {
      return db.getAllAsync(
        `SELECT * FROM patients ORDER BY created_at DESC`
      );
    }
  },

  async searchPatients(query) {
    await this.ensurePatientTable();
    
    const currentUser = auth.currentUser;
    const like = `%${query}%`;
    
    if (currentUser) {
      return db.getAllAsync(
        `SELECT * FROM patients
         WHERE (asha_id = ? OR asha_id IS NULL) 
         AND (name LIKE ? OR village LIKE ? OR IFNULL(health_id,'') LIKE ?)
         ORDER BY created_at DESC`,
        [currentUser.uid, like, like, like]
      );
    } else {
      return db.getAllAsync(
        `SELECT * FROM patients
         WHERE name LIKE ? OR village LIKE ? OR IFNULL(health_id,'') LIKE ?
         ORDER BY created_at DESC`,
        [like, like, like]
      );
    }
  },

  getPatientById(id) {
    return db.getFirstAsync(
      `SELECT * FROM patients WHERE id = ?`,
      [id]
    );
  },

  async verifyPatientReferences(id) {
    const report = {
      notifications: await db.getAllAsync(
        'SELECT id FROM notification_queue WHERE patient_id = ?',
        [id]
      ),
      scheduledVisits: await db.getAllAsync(
        'SELECT id FROM scheduled_visits WHERE patient_id = ?',
        [id]
      ),
      visits: await db.getAllAsync(
        'SELECT id FROM visits WHERE patient_id = ?',
        [id]
      ),
      vaccinations: await db.getAllAsync(
        'SELECT id FROM vaccinations WHERE patient_id = ?',
        [id]
      ),
      pregnancyDetails: await db.getAllAsync(
        'SELECT id FROM pregnancy_details WHERE patient_id = ? OR child_patient_id = ?',
        [id, id]
      )
    };

    return {
      hasReferences: Object.values(report).some(records => records.length > 0),
      counts: {
        notifications: report.notifications.length,
        scheduledVisits: report.scheduledVisits.length,
        visits: report.visits.length,
        vaccinations: report.vaccinations.length,
        pregnancyDetails: report.pregnancyDetails.length
      }
    };
  },

  async deletePatient(id) {
    // Import SyncQueueService here to avoid circular dependency issues
    const { SyncQueueService } = require('./syncQueueService');
    
    try {
      // Begin transaction for atomic operation and enable foreign keys
      await db.runAsync('BEGIN TRANSACTION');
      await db.runAsync('PRAGMA foreign_keys = ON');

      try {
        // Get patient data before deletion
        const patient = await this.getPatientById(id);
        if (!patient) {
          throw new Error(`Patient with id ${id} not found`);
        }

        // Double check foreign key status
        const fkEnabled = await db.getFirstAsync('PRAGMA foreign_keys');
        console.log('Foreign keys enabled:', fkEnabled);

        // Verify data integrity before deletion
        const integrityReport = await this.verifyPatientReferences(id);
        console.log('Data integrity report:', integrityReport);

        // Delete in correct order to respect foreign key constraints:

        // 1. Delete notification_queue entries that reference this patient directly
        // or indirectly through scheduled_visits
        const notificationsQuery = `
          SELECT nq.* FROM notification_queue nq
          LEFT JOIN scheduled_visits sv ON nq.schedule_id = sv.id
          WHERE nq.patient_id = ? OR sv.patient_id = ?`;
        const notifications = await db.getAllAsync(notificationsQuery, [id, id]);
        console.log(`PatientService.deletePatient: found ${notifications.length} notifications to delete`);
        for (const notif of notifications) {
          await SyncQueueService.addToSyncQueue('notifications', notif.id, 'delete', notif);
          await db.runAsync('DELETE FROM notification_queue WHERE id = ?', [notif.id]);
        }

        // 2. Delete scheduled_visits
        const scheduledVisits = await db.getAllAsync(
          'SELECT * FROM scheduled_visits WHERE patient_id = ?',
          [id]
        );
        console.log(`PatientService.deletePatient: found ${scheduledVisits.length} scheduled visits to delete`);
        for (const visit of scheduledVisits) {
          await SyncQueueService.addToSyncQueue('scheduled_visits', visit.id, 'delete', visit);
          await db.runAsync('DELETE FROM scheduled_visits WHERE id = ?', [visit.id]);
        }

        // 3. Delete visits
        const visits = await db.getAllAsync(
          'SELECT * FROM visits WHERE patient_id = ?',
          [id]
        );
        console.log(`PatientService.deletePatient: found ${visits.length} visits to delete`);
        for (const visit of visits) {
          await SyncQueueService.addToSyncQueue('visits', visit.id, 'delete', visit);
          await db.runAsync('DELETE FROM visits WHERE id = ?', [visit.id]);
        }

        // 4. Delete vaccinations
        const vaccinations = await db.getAllAsync(
          'SELECT * FROM vaccinations WHERE patient_id = ?',
          [id]
        );
        console.log(`PatientService.deletePatient: found ${vaccinations.length} vaccinations to delete`);
        for (const vacc of vaccinations) {
          await SyncQueueService.addToSyncQueue('vaccinations', vacc.id, 'delete', vacc);
          await db.runAsync('DELETE FROM vaccinations WHERE id = ?', [vacc.id]);
        }

        // 5. Delete pregnancy_details that reference this patient as mother or child
        const pregnancyDetails = await db.getAllAsync(
          'SELECT * FROM pregnancy_details WHERE patient_id = ? OR child_patient_id = ?',
          [id, id]
        );
        console.log(`PatientService.deletePatient: found ${pregnancyDetails.length} pregnancy details to delete`);
        for (const pd of pregnancyDetails) {
          await SyncQueueService.addToSyncQueue('pregnancy_details', pd.id, 'delete', pd);
          await db.runAsync('DELETE FROM pregnancy_details WHERE id = ?', [pd.id]);
        }

        // 6. Finally, queue patient deletion and delete the patient record
        console.log(`PatientService.deletePatient: deleting patient ${id}`);
        
        // Import cleanup service
        const { cleanupOrphanedRecords } = require('../services/cleanupService');
        
        // Queue up all the deletes in Firestore first
        await SyncQueueService.addToSyncQueue('patient', id, 'delete', patient);
        await db.runAsync('DELETE FROM patients WHERE id = ?', [id]);

        // Run the cleanup to ensure all Firestore records are removed
        await cleanupOrphanedRecords(id);

        // Commit the transaction
        await db.runAsync('COMMIT');
        console.log(`PatientService.deletePatient: successfully deleted patient ${id} and all related records`);
        
        // Trigger sync in background
        syncManager.syncData().catch(console.error);
        
        return true;
      } catch (error) {
        console.error('PatientService.deletePatient transaction failed, rolling back:', error);
        await db.runAsync('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in PatientService.deletePatient:', error);
      throw error;
    }
  }
};