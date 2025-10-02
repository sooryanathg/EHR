import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';

function getAshaUidOrThrow(payload) {
  const user = auth.currentUser;
  if (payload && payload.asha_id) return payload.asha_id;
  if (!user || !user.uid) {
    const err = new Error('NO_AUTH');
    err.code = 'NO_AUTH';
    throw err;
  }
  return user.uid;
}

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

      const ashaId = getAshaUidOrThrow(patient);
      const patientData = {
        ...patient,
        asha_id: ashaId,
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

      const ashaId = getAshaUidOrThrow(vaccination);
      const vaccinationData = {
        ...vaccination,
        asha_id: ashaId,
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

      const ashaId = getAshaUidOrThrow(visit);
      const visitData = {
        ...visit,
        asha_id: ashaId,
        updated_at: new Date().toISOString(),
        created_at: visit.created_at || new Date().toISOString(),
      };

      // Ensure medicines_given is an array (VisitService may send JSON string)
      if (visitData.medicines_given && typeof visitData.medicines_given === 'string') {
        try {
          visitData.medicines_given = JSON.parse(visitData.medicines_given);
        } catch (e) {
          // keep as string if parsing fails
        }
      }

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

  // Scheduled visit sync
  async syncScheduledVisit(schedule) {
    try {
      const schedulesRef = collection(db, 'scheduled_visits');
      const docRef = schedule.firestore_id
        ? doc(db, 'scheduled_visits', schedule.firestore_id)
        : doc(schedulesRef);

      const ashaId = getAshaUidOrThrow(schedule);
      const scheduleData = {
        ...schedule,
        asha_id: ashaId,
        updated_at: new Date().toISOString(),
        created_at: schedule.created_at || new Date().toISOString(),
      };

      if (schedule.firestore_id) {
        await updateDoc(docRef, scheduleData);
      } else {
        await setDoc(docRef, scheduleData);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error syncing scheduled visit:', error);
      throw error;
    }
  },

  // Pregnancy details sync
  async syncPregnancyDetails(details) {
    try {
      const pdRef = collection(db, 'pregnancy_details');
      const docRef = details.firestore_id
        ? doc(db, 'pregnancy_details', details.firestore_id)
        : doc(pdRef);

      const ashaId = getAshaUidOrThrow(details);
      const detailsData = {
        ...details,
        asha_id: ashaId,
        updated_at: new Date().toISOString(),
        created_at: details.created_at || new Date().toISOString(),
      };

      if (details.firestore_id) {
        await updateDoc(docRef, detailsData);
      } else {
        await setDoc(docRef, detailsData);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error syncing pregnancy details:', error);
      throw error;
    }
  },

  // Notification sync
  async syncNotification(notification) {
    try {
      console.log('syncNotification called with payload:', notification);
      const notifsRef = collection(db, 'notifications');
      const docRef = notification.firestore_id
        ? doc(db, 'notifications', notification.firestore_id)
        : doc(notifsRef);

      const ashaId = getAshaUidOrThrow(notification);
      const notifData = {
        // Keep local_id for easier tracing between local DB and Firestore
        local_id: notification.local_id || notification.id,
        patient_id: notification.patient_id,
        schedule_id: notification.schedule_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        scheduled_time: notification.scheduled_time,
        notification_identifier: notification.notification_identifier || null,
        asha_id: ashaId,
        updated_at: new Date().toISOString(),
        created_at: notification.created_at || new Date().toISOString(),
      };

      if (notification.firestore_id) {
        await updateDoc(docRef, notifData);
      } else {
        await setDoc(docRef, notifData);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error syncing notification:', error);
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