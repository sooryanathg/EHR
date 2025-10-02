import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';

export const FirestoreSync = {
  // Patient sync functions
  async syncPatient(patient, action) {
    try {
      // Handle delete action explicitly
      if (action === 'delete') {
        // If we have a firestore_id, delete by id
        if (patient.firestore_id) {
          await deleteDoc(doc(db, 'patients', patient.firestore_id));
          return null;
        }

        // Otherwise attempt to find documents with matching local_id and delete them
        try {
          const q = query(collection(db, 'patients'), where('local_id', '==', patient.local_id));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await deleteDoc(doc(db, 'patients', d.id));
          }
          return null;
        } catch (err) {
          console.warn('Failed to delete patient by local_id:', err.message);
          throw err;
        }
      }

      const patientsRef = collection(db, 'patients');
      const docRef = patient.firestore_id 
        ? doc(db, 'patients', patient.firestore_id)
        : doc(patientsRef);

      const patientData = {
        ...patient,
        asha_id: auth.currentUser.uid,
        updated_at: new Date().toISOString(),
        created_at: patient.created_at || new Date().toISOString(),
      };

      if (patient.firestore_id) {
        await updateDoc(docRef, patientData);
      } else {
        await setDoc(docRef, patientData);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error syncing patient:', error);
      throw error;
    }
  },

  // Vaccination sync functions
  async syncVaccination(vaccination, action) {
    try {
      // handle delete action
      if (action === 'delete') {
        if (vaccination.firestore_id) {
          await deleteDoc(doc(db, 'vaccinations', vaccination.firestore_id));
          return null;
        }
        const q = query(collection(db, 'vaccinations'), where('local_id', '==', vaccination.local_id));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'vaccinations', d.id));
        }
        return null;
      }

      const vaccinationsRef = collection(db, 'vaccinations');
      const docRef = vaccination.firestore_id 
        ? doc(db, 'vaccinations', vaccination.firestore_id)
        : doc(vaccinationsRef);

      const vaccinationData = {
        ...vaccination,
        asha_id: auth.currentUser.uid,
        updated_at: new Date().toISOString(),
        created_at: vaccination.created_at || new Date().toISOString(),
      };

      if (vaccination.firestore_id) {
        await updateDoc(docRef, vaccinationData);
      } else {
        await setDoc(docRef, vaccinationData);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error syncing vaccination:', error);
      throw error;
    }
  },

  // Visit sync functions
  async syncVisit(visit, action) {
    try {
      // handle delete action
      if (action === 'delete') {
        if (visit.firestore_id) {
          await deleteDoc(doc(db, 'visits', visit.firestore_id));
          return null;
        }
        const q = query(collection(db, 'visits'), where('local_id', '==', visit.local_id));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'visits', d.id));
        }
        return null;
      }

      const visitsRef = collection(db, 'visits');
      const docRef = visit.firestore_id 
        ? doc(db, 'visits', visit.firestore_id)
        : doc(visitsRef);

      const visitData = {
        ...visit,
        asha_id: auth.currentUser.uid,
        updated_at: new Date().toISOString(),
        created_at: visit.created_at || new Date().toISOString(),
      };

      if (visit.firestore_id) {
        await updateDoc(docRef, visitData);
      } else {
        await setDoc(docRef, visitData);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error syncing visit:', error);
      throw error;
    }
  },

  // Sync status check
  async checkSyncStatus(collection, localId) {
    try {
      const q = query(
        collection(db, collection),
        where('local_id', '==', localId)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return false;
    }
  }
};