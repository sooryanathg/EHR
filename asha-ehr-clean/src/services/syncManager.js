import { SyncQueueService } from '../database/syncQueueService';
import NetInfo from '@react-native-community/netinfo';

class SyncManager {
  static instance = null;
  
  static getInstance() {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  constructor() {
    this.isSyncing = false;
    this.lastSyncAttempt = null;
  }

  async checkConnectivity() {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  }

  async syncData() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.isSyncing = true;
      this.lastSyncAttempt = new Date();

      // Check internet connectivity
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        console.log('No internet connection available');
        return;
      }

      // Get all unsynced records
      const unsynced = await SyncQueueService.getUnsynced();
      
      // Process each type of record
      await this.syncRecords('patient', unsynced.patients);
      await this.syncRecords('visit', unsynced.visits);
      await this.syncRecords('vaccination', unsynced.vaccinations);

      // Update local sync status
      await SyncQueueService.markAsSynced(unsynced);

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncRecords(type, records) {
    const { FirestoreSync } = require('../services/firestoreSync');
    
    for (const record of records) {
      try {
        let firestoreId;
        
        // Sync based on record type
        switch(type) {
          case 'patient':
            firestoreId = await FirestoreSync.syncPatient(record);
            break;
          case 'visit':
            firestoreId = await FirestoreSync.syncVisit(record);
            break;
          case 'vaccination':
            firestoreId = await FirestoreSync.syncVaccination(record);
            break;
        }
        
        // Mark as synced with Firestore ID
        if (firestoreId) {
          await SyncQueueService.markRecordSynced(type, record.id, firestoreId);
          console.log(`Synced ${type} record:`, record.id);
        }
      } catch (error) {
        console.error(`Failed to sync ${type} record:`, record.id, error);
        throw error; // Propagate error to handle it in syncData
      }
    }
  }

  getLastSyncAttempt() {
    return this.lastSyncAttempt;
  }

  isCurrentlySyncing() {
    return this.isSyncing;
  }
}

export const syncManager = SyncManager.getInstance();