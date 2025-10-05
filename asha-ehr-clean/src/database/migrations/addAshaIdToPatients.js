import db from '../schema';
import { auth } from '../../lib/firebase';

export const migratePatients = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No authenticated user found during migration, will run later');
      return false;
    }

    // Check if the asha_id column exists
    const tableInfo = await db.getAllAsync("PRAGMA table_info(patients)");
    const hasAshaId = tableInfo.some(col => col.name === 'asha_id');

    if (!hasAshaId) {
      // Create a temporary table with the new schema
      await db.runAsync(`
        CREATE TABLE patients_new (
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
          asha_id TEXT NOT NULL DEFAULT ''
        )
      `);

      // Copy existing data to the new table
      await db.runAsync(`
        INSERT INTO patients_new 
        (id, name, age, type, village, health_id, language, dob, phone, aadhar, created_at, synced, firestore_id)
        SELECT id, name, age, type, village, health_id, language, dob, phone, aadhar, created_at, synced, firestore_id
        FROM patients
      `);

      // Update the asha_id for all records
      await db.runAsync(
        `UPDATE patients_new SET asha_id = ?`,
        [currentUser.uid]
      );

      // Drop the old table
      await db.runAsync('DROP TABLE patients');

      // Rename the new table to the original name
      await db.runAsync('ALTER TABLE patients_new RENAME TO patients');

      console.log('Successfully migrated patients table with ASHA IDs');
    } else {
      // Update any records that might not have an asha_id
      await db.runAsync(
        `UPDATE patients SET asha_id = ? WHERE asha_id = '' OR asha_id IS NULL`,
        [currentUser.uid]
      );
      console.log('Updated existing patients with ASHA IDs');
    }

    return true;
  } catch (error) {
    console.error('Error migrating patients:', error);
    throw error;
  }
};