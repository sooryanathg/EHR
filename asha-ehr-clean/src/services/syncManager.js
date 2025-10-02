import { SyncQueueService } from '../database/syncQueueService';
import NetInfo from '@react-native-community/netinfo';
import { FirestoreSync } from './firestoreSync';
import db from '../database/schema';

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

      // Get all pending sync queue items
      const queueItems = await SyncQueueService.getPendingSyncItems();
      if (!queueItems || queueItems.length === 0) {
        console.log('No items in sync queue');
        return;
      }

      // Process queue items in order
      for (const item of queueItems) {
        await this.processQueueItem(item);
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncRecords(type, records) {
    // Deprecated: syncRecords was a placeholder. Use queue-based sync instead.
    for (const record of records) {
      try {
        await SyncQueueService.markRecordSynced(type, record.id);
      } catch (error) {
        console.error(`Failed to sync ${type} record:`, record.id, error);
      }
    }
  }

  async processQueueItem(item) {
    const queueId = item.id;
    const recordType = item.record_type; // e.g., 'patient' or 'patients'
    // Normalize table name
    const table = recordType.endsWith('s') ? recordType : `${recordType}s`;

    // Mark as in_progress
    try {
      await db.runAsync(`UPDATE sync_queue SET status = 'in_progress', last_attempt = ? WHERE id = ?`, [new Date().toISOString(), queueId]);
    } catch (e) {
      console.warn('Failed to mark queue item in_progress', e.message);
    }

    let payload = {};
    try {
      payload = item.data ? JSON.parse(item.data) : {};
    } catch (e) {
      payload = {};
    }

    // Ensure payload includes local id
    payload.local_id = item.record_id;

    try {
      let docId = null;
      const action = item.action || item.action_type || item.actionType || item.action;
      // Normalize action: read from item.action if present (DB column is action)
      const queueAction = item.action || item.action || 'create';

      if (table.startsWith('patients')) {
        docId = await FirestoreSync.syncPatient(payload, queueAction);
      } else if (table.startsWith('visits')) {
        docId = await FirestoreSync.syncVisit(payload, queueAction);
      } else if (table.startsWith('vaccinations')) {
        docId = await FirestoreSync.syncVaccination(payload, queueAction);
      } else {
        throw new Error(`Unknown record type for syncing: ${recordType}`);
      }

      // On success: if action is delete, just remove queue item (local row already deleted)
      if (queueAction === 'delete') {
        await SyncQueueService.removeSyncItem(queueId);
        console.log(`Deleted remote ${table} for local id=${item.record_id}`);
      } else {
        // For create/update: update local row with firestore_id and mark synced
        try {
          await db.runAsync(`UPDATE ${table} SET firestore_id = ?, synced = 1 WHERE id = ?`, [docId, item.record_id]);
        } catch (e) {
          console.warn('Failed to update local table after sync:', e.message);
        }

        // Remove the queue item
        await SyncQueueService.removeSyncItem(queueId);
        console.log(`Synced ${table} local id=${item.record_id} to firestore id=${docId}`);
      }
    } catch (error) {
      console.error(`Failed to sync ${recordType} record:`, item.record_id, error);

      // Update retry_count and mark failed
      try {
        await db.runAsync(`UPDATE sync_queue SET retry_count = retry_count + 1, status = 'failed', last_error = ? WHERE id = ?`, [error.message || String(error), queueId]);
      } catch (e) {
        console.warn('Failed to mark queue item failed:', e.message);
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