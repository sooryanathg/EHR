import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system';
import { PatientService } from '../database/patientService';
import { VisitService } from '../database/visitService';
import { VaccinationService } from '../database/vaccinationService';
import { VoiceNoteService } from './voiceNoteService';
import { db, storage } from '../lib/firebase';


export const SyncService = {
  // Check network connectivity
  isOnline: async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected && networkState.isInternetReachable;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  },

  // Sync all unsynced data
  syncAll: async () => {
    const isOnline = await SyncService.isOnline();
    if (!isOnline) {
      throw new Error('No internet connection');
    }

    const results = {
      patients: { synced: 0, failed: 0 },
      visits: { synced: 0, failed: 0 },
      vaccinations: { synced: 0, failed: 0 },
      voiceNotes: { synced: 0, failed: 0 }
    };

    try {
      // Sync patients
      const unsyncedPatients = await PatientService.getUnsyncedPatients();
      for (const patient of unsyncedPatients) {
        try {
          await SyncService.syncPatient(patient);
          await PatientService.markPatientAsSynced(patient.id);
          results.patients.synced++;
        } catch (error) {
          console.error('Patient sync error:', error);
          results.patients.failed++;
        }
      }

      // Sync visits
      const unsyncedVisits = await VisitService.getUnsyncedVisits();
      for (const visit of unsyncedVisits) {
        try {
          await SyncService.syncVisit(visit);
          await VisitService.markVisitAsSynced(visit.id);
          results.visits.synced++;
        } catch (error) {
          console.error('Visit sync error:', error);
          results.visits.failed++;
        }
      }

      // Sync vaccinations
      const unsyncedVaccinations = await VaccinationService.getUnsyncedVaccinations();
      for (const vaccination of unsyncedVaccinations) {
        try {
          await SyncService.syncVaccination(vaccination);
          await VaccinationService.markVaccinationAsSynced(vaccination.id);
          results.vaccinations.synced++;
        } catch (error) {
          console.error('Vaccination sync error:', error);
          results.vaccinations.failed++;
        }
      }

      // Sync voice notes
      const unsyncedVoiceNotes = await VoiceNoteService.getUnsyncedVoiceNotes();
      for (const vn of unsyncedVoiceNotes) {
        try {
          const { downloadURL } = await SyncService.syncVoiceNote(vn);
          await VoiceNoteService.markVoiceNoteAsSynced(vn.id, downloadURL);
          results.voiceNotes.synced++;
        } catch (error) {
          console.error('Voice note sync error:', error);
          results.voiceNotes.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  },

  // Sync individual patient
  syncPatient: async (patient) => {
    const patientData = {
      name: patient.name,
      age: patient.age,
      type: patient.type,
      village: patient.village,
      health_id: patient.health_id,
      language: patient.language,
      created_at: patient.created_at,
      local_id: patient.id
    };

    const docRef = await addDoc(collection(db, 'patients'), patientData);
    return docRef.id;
  },

  // Sync individual visit
  syncVisit: async (visit) => {
    const visitData = {
      patient_id: visit.patient_id,
      date: visit.date,
      type: visit.type,
      bp_systolic: visit.bp_systolic,
      bp_diastolic: visit.bp_diastolic,
      weight: visit.weight,
      notes: visit.notes,
      next_visit: visit.next_visit,
      created_at: visit.created_at,
      local_id: visit.id
    };

    const docRef = await addDoc(collection(db, 'visits'), visitData);
    return docRef.id;
  },

  // Sync individual vaccination
  syncVaccination: async (vaccination) => {
    const vaccinationData = {
      patient_id: vaccination.patient_id,
      vaccine_name: vaccination.vaccine_name,
      due_date: vaccination.due_date,
      given_date: vaccination.given_date,
      status: vaccination.status,
      created_at: vaccination.created_at,
      local_id: vaccination.id
    };

    const docRef = await addDoc(collection(db, 'vaccinations'), vaccinationData);
    return docRef.id;
  },

  // Sync voice note
  syncVoiceNote: async (voiceNote) => {
    try {
      // Upload audio file to Firebase Storage
      const audioUri = voiceNote.file_path;
      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const fileName = `voice_notes/${voiceNote.id}_${Date.now()}.m4a`;
      const storageRef = ref(storage, fileName);
      // Upload base64 data directly
      await uploadString(storageRef, audioData, 'base64');
      const downloadURL = await getDownloadURL(storageRef);

      // Save metadata to Firestore
      const voiceNoteData = {
        visit_id: voiceNote.visit_id,
        duration: voiceNote.duration,
        file_url: downloadURL,
        created_at: voiceNote.created_at,
        local_id: voiceNote.id
      };

      const docRef = await addDoc(collection(db, 'voice_notes'), voiceNoteData);
      return { id: docRef.id, downloadURL };
    } catch (error) {
      console.error('Voice note sync error:', error);
      throw error;
    }
  },

  // Get sync status
  getSyncStatus: async () => {
    const unsyncedPatients = await PatientService.getUnsyncedPatients();
    const unsyncedVisits = await VisitService.getUnsyncedVisits();
    const unsyncedVaccinations = await VaccinationService.getUnsyncedVaccinations();

    return {
      patients: unsyncedPatients.length,
      visits: unsyncedVisits.length,
      vaccinations: unsyncedVaccinations.length,
      total: unsyncedPatients.length + unsyncedVisits.length + unsyncedVaccinations.length
    };
  }
};

