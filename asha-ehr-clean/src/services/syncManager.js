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

      console.log('Pending sync queue items count:', queueItems.length, 'types:', queueItems.map(i => i.record_type));

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
    // Map record types to local DB table names (some local tables differ from remote collection names)
    const tableMap = {
      patient: 'patients',
      patients: 'patients',
      visit: 'visits',
      visits: 'visits',
      vaccination: 'vaccinations',
      vaccinations: 'vaccinations',
      scheduled_visits: 'scheduled_visits',
      notification: 'notification_queue',
      notifications: 'notification_queue',
      pregnancy_details: 'pregnancy_details'
    };
  const table = tableMap[recordType] || (recordType.endsWith('s') ? recordType : `${recordType}s`);
  // Use normalized record type (plural) for routing to FirestoreSync functions
  const normalizedRecordType = recordType.endsWith('s') ? recordType : `${recordType}s`;

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
      // Route based on the normalized record type (this avoids mismatches where local table names differ)
      console.log('Processing sync queue item:', { queueId, recordType, table, normalizedRecordType });
      if (normalizedRecordType === 'patients') {
        docId = await FirestoreSync.syncPatient(payload);
      } else if (normalizedRecordType === 'visits') {
        docId = await FirestoreSync.syncVisit(payload);
      } else if (normalizedRecordType === 'vaccinations') {
        docId = await FirestoreSync.syncVaccination(payload);
      } else if (normalizedRecordType === 'scheduled_visits') {
        docId = await FirestoreSync.syncScheduledVisit(payload);
      } else if (normalizedRecordType === 'notifications' || normalizedRecordType === 'notification') {
        try {
          docId = await FirestoreSync.syncNotification(payload);
        } catch (e) {
          console.error('FirestoreSync.syncNotification failed:', e.message || e);
          throw e;
        }
      } else if (normalizedRecordType === 'pregnancy_details') {
        docId = await FirestoreSync.syncPregnancyDetails(payload);
      } else {
        throw new Error(`Unknown record type for syncing: ${recordType}`);
      }

      // On success: update local row with firestore_id and mark synced
      try {
        // For notification_queue the column names may differ in older DBs; attempt best-effort update
        await db.runAsync(`UPDATE ${table} SET firestore_id = ?, synced = 1 WHERE id = ?`, [docId, item.record_id]);
      } catch (e) {
        console.warn(`Failed to update local table '${table}' after sync:`, e.message);
        // If the table/column doesn't exist, it's likely a migration mismatch; continue without failing the sync
      }

      // Remove the queue item
      await SyncQueueService.removeSyncItem(queueId);
      console.log(`Synced ${table} local id=${item.record_id} to firestore id=${docId}`);
    } catch (error) {
      console.error(`Failed to sync ${recordType} record:`, item.record_id, error);

      // If the error indicates no auth, revert to pending so it will be retried after sign-in
      if (error && (error.code === 'NO_AUTH' || error.message === 'NO_AUTH')) {
        try {
          await db.runAsync(`UPDATE sync_queue SET status = 'pending', last_error = ? WHERE id = ?`, [error.message || String(error), queueId]);
        } catch (e) {
          console.warn('Failed to revert queue item to pending:', e.message);
        }
      } else {
        // Update retry_count and mark failed for other errors
        try {
          await db.runAsync(`UPDATE sync_queue SET retry_count = retry_count + 1, status = 'failed', last_error = ? WHERE id = ?`, [error.message || String(error), queueId]);
        } catch (e) {
          console.warn('Failed to mark queue item failed:', e.message);
        }
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