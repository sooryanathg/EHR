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
      await this.syncRecords('patients', unsynced.patients);
      await this.syncRecords('visits', unsynced.visits);
      await this.syncRecords('vaccinations', unsynced.vaccinations);

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncRecords(type, records) {
    for (const record of records) {
      try {
        // Here you would implement the actual API calls to sync with your backend
        // For now, we'll just mark them as synced
        await SyncQueueService.markRecordSynced(type, record.id);
      } catch (error) {
        console.error(`Failed to sync ${type} record:`, record.id, error);
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