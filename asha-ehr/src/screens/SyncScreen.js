import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SyncService } from '../services/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SyncScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [syncStatus, setSyncStatus] = useState({
    patients: 0,
    visits: 0,
    vaccinations: 0,
    total: 0
  });
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
    loadLastSync();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadLastSync = async () => {
    try {
      const lastSyncTime = await AsyncStorage.getItem('last_sync_time');
      setLastSync(lastSyncTime);
    } catch (error) {
      console.error('Error loading last sync:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const results = await SyncService.syncAll();
      
      // Save sync time
      const syncTime = new Date().toISOString();
      await AsyncStorage.setItem('last_sync_time', syncTime);
      setLastSync(syncTime);
      
      // Update sync status
      await loadSyncStatus();
      
      Alert.alert(
        t('sync.syncComplete'),
        `Sync completed successfully!\n\n` +
        `Patients: ${results.patients.synced} synced, ${results.patients.failed} failed\n` +
        `Visits: ${results.visits.synced} synced, ${results.visits.failed} failed\n` +
        `Vaccinations: ${results.vaccinations.synced} synced, ${results.vaccinations.failed} failed`
      );
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert(t('sync.syncFailed'), error.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (syncTime) => {
    if (!syncTime) return t('sync.never');
    
    const date = new Date(syncTime);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('sync.title')}</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Sync Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('sync.patientsSynced')}</Text>
          <Text style={styles.statusValue}>{syncStatus.patients}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('sync.visitsSynced')}</Text>
          <Text style={styles.statusValue}>{syncStatus.visits}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('sync.vaccinationsSynced')}</Text>
          <Text style={styles.statusValue}>{syncStatus.vaccinations}</Text>
        </View>
        <View style={[styles.statusRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Pending</Text>
          <Text style={styles.totalValue}>{syncStatus.total}</Text>
        </View>
      </View>

      <View style={styles.lastSyncCard}>
        <Text style={styles.lastSyncTitle}>{t('sync.lastSync')}</Text>
        <Text style={styles.lastSyncTime}>{formatLastSync(lastSync)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.syncButtonText}>{t('sync.syncNow')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Sync Information</Text>
        <Text style={styles.infoText}>
          • Data is automatically synced when you have internet connection
        </Text>
        <Text style={styles.infoText}>
          • All data is stored locally and synced to Firebase
        </Text>
        <Text style={styles.infoText}>
          • Sync ensures data backup and accessibility from dashboard
        </Text>
        <Text style={styles.infoText}>
          • Voice notes are uploaded to cloud storage
        </Text>
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips</Text>
        <Text style={styles.tipsText}>
          • Sync regularly to keep data up to date
        </Text>
        <Text style={styles.tipsText}>
          • Check internet connection before syncing
        </Text>
        <Text style={styles.tipsText}>
          • Large files may take longer to sync
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  statusLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  lastSyncCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  lastSyncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  lastSyncTime: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  syncButton: {
    backgroundColor: '#3498db',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default SyncScreen;

