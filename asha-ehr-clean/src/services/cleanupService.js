import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export async function cleanupOrphanedRecords(patientId) {
  const collections = [
    'notifications',
    'scheduled_visits',
    'visits',
    'vaccinations',
    'pregnancy_details'
  ];

  try {
    for (const collectionName of collections) {
      // Query for documents referencing the deleted patient
      const q = query(
        collection(db, collectionName),
        where('patient_id', '==', patientId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} orphaned records in ${collectionName} for patient ${patientId}`);
      
      // Delete all found documents
      for (const doc of querySnapshot.docs) {
        await deleteDoc(doc.ref);
        console.log(`Deleted orphaned ${collectionName} record: ${doc.id}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned records:', error);
    throw error;
  }
}