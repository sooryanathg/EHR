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

      // Different sqlite drivers return insert id with different property names.
      const patientId = result && (result.insertId || result.lastInsertRowId || result.lastID || result.id);
      console.log('PatientService.createPatient inserted id ->', patientId, 'rawResult:', result);

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
      // We'll dynamically find all tables that have a foreign key to patients
      // and enqueue delete actions for their rows referencing this patient.
      // This avoids missing any auxiliary tables that reference patients.
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
      // Now perform deletions inside a transaction to avoid FK race conditions.
      // We'll dynamically delete rows from all tables that have FKs pointing to patients.
      try {
        await db.runAsync('BEGIN TRANSACTION');

        // Find all tables (excluding sqlite internal tables) and detect FK columns referencing patients
        const tables = await db.getAllAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
        const tableNames = tables.map(t => t.name).filter(n => n !== 'sync_queue');

        // mapping to recordType names used by SyncQueueService (best-effort)
        const recordTypeMap = {
          patients: 'patient',
          visits: 'visit',
          vaccinations: 'vaccination',
          scheduled_visits: 'scheduled_visits',
          pregnancy_details: 'pregnancy_details',
          notification_queue: 'notifications'
        };

        for (const tableName of tableNames) {
          try {
            const fk = await db.getAllAsync(`PRAGMA foreign_key_list('${tableName}')`);
            const fkCols = (fk || []).filter(f => f && f.table === 'patients').map(f => f.from);
            if (!fkCols || fkCols.length === 0) continue;

            // Select rows referencing this patient so we can enqueue delete actions per-row
            const whereClause = fkCols.map(() => `${fkCols[0] ? fkCols[0] : 'patient_id'} = ?`).join(' OR ');
            // Build params array of length fkCols.length all set to id
            const params = Array(fkCols.length).fill(id);
            const rows = await db.getAllAsync(`SELECT * FROM ${tableName} WHERE ${fkCols.map(c => `${c} = ?`).join(' OR ')}`, params);
            console.log(`PatientService.deletePatient: found ${rows.length} rows in ${tableName} referencing patient ${id}`);

            for (const r of rows) {
              try {
                const recordType = recordTypeMap[tableName] || tableName;
                const recordId = r && (r.id || r.local_id || r.record_id);
                // Only add to sync queue if we can determine a record id; otherwise add generic payload
                if (recordId) {
                  await SyncQueueService.addToSyncQueue(recordType, recordId, 'delete', r);
                } else {
                  await SyncQueueService.addToSyncQueue(recordType, id, 'delete', r);
                }
              } catch (e) {
                console.warn(`Failed enqueuing delete for ${tableName} row:`, e && e.message ? e.message : e);
              }
            }

            // Now delete the rows from the child table
            await db.runAsync(`DELETE FROM ${tableName} WHERE ${fkCols.map(c => `${c} = ?`).join(' OR ')}`, params);
            console.log(`PatientService.deletePatient: deleted rows from ${tableName} referencing patient ${id}`);
          } catch (e) {
            console.warn(`Failed processing table ${tableName} for patient ${id}:`, e && e.message ? e.message : e);
          }
        }

        // Finally delete the patient row
        console.log(`PatientService.deletePatient: deleting patient ${id}`);
        await db.runAsync(`DELETE FROM patients WHERE id = ?`, [id]);
        await db.runAsync('COMMIT');

        // Add to sync queue for patient deletion and trigger background sync
        await SyncQueueService.addToSyncQueue('patient', id, 'delete', { id });
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


