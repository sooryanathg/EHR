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

      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        console.log('No internet connection available');
        return;
      }

      const queueItems = await SyncQueueService.getPendingSyncItems();
      if (!queueItems || queueItems.length === 0) {
        console.log('No items in sync queue');
        return;
      }

      console.log(
        'Pending sync queue items count:',
        queueItems.length,
        'types:',
        queueItems.map(i => i.record_type)
      );

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
    const recordType = item.record_type;

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

    const table =
      tableMap[recordType] ||
      (recordType.endsWith('s') ? recordType : `${recordType}s`);
    const normalizedRecordType = recordType.endsWith('s')
      ? recordType
      : `${recordType}s`;

    // Mark as in_progress
    try {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'in_progress', last_attempt = ? WHERE id = ?`,
        [new Date().toISOString(), queueId]
      );
    } catch (e) {
      console.warn('Failed to mark queue item in_progress', e.message);
    }

    let payload = {};
    try {
      payload = item.data ? JSON.parse(item.data) : {};
    } catch (e) {
      payload = {};
    }
    payload.local_id = item.record_id;

    try {
      let docId = null;
      const queueAction = item.action || 'create';

      console.log('Processing sync queue item:', {
        queueId,
        recordType,
        table,
        normalizedRecordType,
        queueAction
      });

      // Route by record type
      if (normalizedRecordType === 'patients') {
        docId = await FirestoreSync.syncPatient(payload, queueAction);
      } else if (normalizedRecordType === 'visits') {
        docId = await FirestoreSync.syncVisit(payload, queueAction);
      } else if (normalizedRecordType === 'vaccinations') {
        docId = await FirestoreSync.syncVaccination(payload, queueAction);
      } else if (normalizedRecordType === 'scheduled_visits') {
        docId = await FirestoreSync.syncScheduledVisit(payload, queueAction);
      } else if (normalizedRecordType === 'notifications') {
        docId = await FirestoreSync.syncNotification(payload, queueAction);
      } else if (normalizedRecordType === 'pregnancy_details') {
        docId = await FirestoreSync.syncPregnancyDetails(payload, queueAction);
      } else {
        throw new Error(`Unknown record type for syncing: ${recordType}`);
      }

      if (queueAction === 'delete') {
        // remote deletion succeeded, just remove queue item
        await SyncQueueService.removeSyncItem(queueId);
        console.log(
          `Deleted remote ${table} for local id=${item.record_id}`
        );
      } else {
        // update local record with Firestore ID + mark synced
        try {
          await db.runAsync(
            `UPDATE ${table} SET firestore_id = ?, synced = 1 WHERE id = ?`,
            [docId, item.record_id]
          );
        } catch (e) {
          console.warn(
            `Failed to update local table '${table}' after sync:`,
            e.message
          );
        }

        // remove from queue
        await SyncQueueService.removeSyncItem(queueId);
        console.log(
          `Synced ${table} local id=${item.record_id} to firestore id=${docId}`
        );
      }
    } catch (error) {
      console.error(
        `Failed to sync ${recordType} record:`,
        item.record_id,
        error
      );

      if (error && (error.code === 'NO_AUTH' || error.message === 'NO_AUTH')) {
        await db
          .runAsync(
            `UPDATE sync_queue SET status = 'pending', last_error = ? WHERE id = ?`,
            [error.message || String(error), queueId]
          )
          .catch(e =>
            console.warn('Failed to revert queue item to pending:', e.message)
          );
      } else {
        await db
          .runAsync(
            `UPDATE sync_queue SET retry_count = retry_count + 1, status = 'failed', last_error = ? WHERE id = ?`,
            [error.message || String(error), queueId]
          )
          .catch(e =>
            console.warn('Failed to mark queue item failed:', e.message)
          );
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
