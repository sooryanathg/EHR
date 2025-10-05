import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { PatientService } from '../database/patientService';
import { VisitService } from '../database/visitService';
import { VaccinationService } from '../database/vaccinationService';
import { useTranslation } from 'react-i18next';
import db from '../database/schema';
import { format, parseISO } from 'date-fns';
import { SyncQueueService } from '../database/syncQueueService';

const PatientProfileScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [scheduledVisits, setScheduledVisits] = useState({
    regular: [],
    vaccinations: []
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const patientId = route.params?.patientId;
      const [patientData, visitsData, vaccinationsData, scheduledVisitsData] = await Promise.all([
        PatientService.getPatientById(patientId),
        VisitService.getVisitsByPatientId(patientId),
        VaccinationService.getVaccinationsByPatientId(patientId),
        db.getAllAsync(
          `SELECT 
            sv.id,
            sv.visit_type,
            sv.schedule_type,
            sv.due_date,
            sv.window_start,
            sv.window_end,
            sv.status,
            sv.completed_date,
            sv.notification_sent,
            v.date as visit_date,
            v.type as visit_type_actual
           FROM scheduled_visits sv
           LEFT JOIN visits v ON sv.visit_id = v.id
           WHERE sv.patient_id = ?
           ORDER BY sv.due_date ASC`,
          [patientId]
        )
      ]);
      
      if (!patientData) {
        Alert.alert(t('error'), t('patient_data_not_found'));
        return;
      }
      
      setPatient(patientData);
      setVisits(visitsData);
      setVaccinations(vaccinationsData);
      
      const categorizedVisits = scheduledVisitsData.reduce((acc, visit) => {
        if (visit.visit_type === 'immunization') {
          acc.vaccinations.push(visit);
        } else {
          acc.regular.push(visit);
        }
        return acc;
      }, { regular: [], vaccinations: [] });
      
      setScheduledVisits(categorizedVisits);
    } catch (error) {
      console.error('Error loading patient:', error);
      Alert.alert(t('error'), t('error_loading_patient'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, route.params?.patientId]);

  const handleMarkVisitComplete = async (scheduleId) => {
    try {
      const visitResult = await db.runAsync(
        `INSERT INTO visits (patient_id, date, type, created_at) VALUES (?, date('now'), 'general', datetime('now'))`,
        [patient.id]
      );

      const visitId = visitResult && (visitResult.insertId || visitResult.lastInsertRowId || visitResult.lastID || null);

      await db.runAsync(
        `UPDATE scheduled_visits SET status = ?, completed_date = datetime('now'), visit_id = ? WHERE id = ?`,
        ['completed', visitId, scheduleId]
      );

      if (visitId) {
        await SyncQueueService.addToSyncQueue('visits', visitId, 'create', {
          id: visitId,
          patient_id: patient.id,
          date: new Date().toISOString(),
          type: 'general',
          created_at: new Date().toISOString()
        });
      }

      const scheduledVisit = await db.getFirstAsync(`SELECT * FROM scheduled_visits WHERE id = ?`, [scheduleId]);
      if (scheduledVisit) {
        await SyncQueueService.addToSyncQueue('scheduled_visits', scheduleId, 'update', {
          ...scheduledVisit,
          status: 'completed',
          completed_date: new Date().toISOString(),
          visit_id: visitId,
          updated_at: new Date().toISOString()
        });
      }

      const { syncManager } = require('../services/syncManager');
      await syncManager.syncData().catch(e => console.warn('Sync failed:', e));

      loadData();
      Alert.alert(t('success'), t('visit_marked_complete'));
    } catch (error) {
      console.error('Error marking visit as complete:', error);
      Alert.alert('Error', 'Failed to mark visit as complete');
    }
  };
  
  const handleMarkVisitMissed = async (scheduleId) => {
    try {
      await db.runAsync(
        `UPDATE scheduled_visits SET status = 'missed', completed_date = datetime('now') WHERE id = ?`,
        [scheduleId]
      );

      const scheduledVisit = await db.getFirstAsync(`SELECT * FROM scheduled_visits WHERE id = ?`, [scheduleId]);
      if (scheduledVisit) {
        await SyncQueueService.addToSyncQueue('scheduled_visits', scheduleId, 'update', {
          ...scheduledVisit,
          status: 'missed',
          completed_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      const { syncManager } = require('../services/syncManager');
      await syncManager.syncData().catch(e => console.warn('Sync failed:', e));

      loadData();
      Alert.alert(t('success'), t('visit_marked_missed'));
    } catch (error) {
      console.error('Error marking visit as missed:', error);
      Alert.alert('Error', 'Failed to mark visit as missed');
    }
  };

  const handleDeletePatient = async () => {
    Alert.alert(
      t('delete_patient_title'),
      t('delete_patient_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await PatientService.deletePatient(patient.id);
              Alert.alert(t('deleted'), t('patient_deleted'));
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('error'), t('delete_patient_error'));
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading patient data...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{t('patient_data_not_found')}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>{t('go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'pregnant': return t('patient_type_pregnant');
      case 'lactating': return t('patient_type_lactating');
      case 'child': return t('patient_type_child');
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pregnant': return '#EC4899';
      case 'lactating': return '#8B5CF6';
      case 'child': return '#06B6D4';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(patient.type) + '15' }]}>
            <Text style={[styles.typeBadgeText, { color: getTypeColor(patient.type) }]}>
              {getTypeLabel(patient.type)}
            </Text>
          </View>
        </View>
        <View style={[styles.syncBadge, { backgroundColor: patient.synced ? '#ECFDF5' : '#FEF2F2' }]}>
          <View style={[styles.syncDot, { backgroundColor: patient.synced ? '#10B981' : '#EF4444' }]} />
          <Text style={[styles.syncText, { color: patient.synced ? '#047857' : '#DC2626' }]}>
            {patient.synced ? t('synced') : t('pending_sync')}
          </Text>
        </View>
      </View>

      {/* Patient Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('patient_information')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('age')}:</Text>
          <Text style={styles.infoValue}>{patient.age} {t('years')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('village')}:</Text>
          <Text style={styles.infoValue}>{patient.village}</Text>
        </View>
        {patient.health_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('health_id')}:</Text>
            <Text style={styles.infoValue}>{patient.health_id}</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('quick_actions')}</Text>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => navigation.navigate('AddVisit', { patient })}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>{t('add_visit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerAction]}
            onPress={handleDeletePatient}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>{t('delete_patient_title')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheduled Visits */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('scheduled_visits')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('ScheduleVisit', { patientId: patient.id })}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>{t('schedule_visit')}</Text>
          </TouchableOpacity>
        </View>
        {scheduledVisits.regular.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('no_scheduled_visits')}</Text>
          </View>
        ) : (
          scheduledVisits.regular.map(visit => (
            <View key={visit.id} style={styles.visitItem}>
              <View style={styles.visitItemHeader}>
                <Text style={styles.visitDate}>{format(new Date(visit.due_date), 'PPP')}</Text>
                <View style={[
                  styles.statusBadge,
                  visit.status === 'completed' && styles.statusCompleted,
                  visit.status === 'missed' && styles.statusMissed,
                  visit.status === 'pending' && styles.statusPending,
                ]}>
                  <Text style={styles.statusText}>
                    {visit.status === 'completed' ? t('completed') : 
                     visit.status === 'missed' ? t('missed') : t('pending')}
                  </Text>
                </View>
              </View>
              <Text style={styles.visitPurpose}>{visit.schedule_type}</Text>
              {visit.status === 'pending' && (
                <View style={styles.visitActions}>
                  <TouchableOpacity 
                    style={[styles.visitActionButton, styles.completeButton]}
                    onPress={() => handleMarkVisitComplete(visit.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.visitActionText}>{t('mark_complete')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.visitActionButton, styles.missedButton]}
                    onPress={() => handleMarkVisitMissed(visit.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.visitActionText}>{t('mark_missed')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Visit History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('visit_history')}</Text>
        {visits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('no_visits')}</Text>
          </View>
        ) : (
          visits.map(visit => (
            <View key={visit.id} style={styles.visitItem}>
              <View style={styles.visitItemHeader}>
                <Text style={styles.visitDate}>{new Date(visit.date).toLocaleDateString()}</Text>
                <Text style={styles.visitType}>{visit.type}</Text>
              </View>
              {(visit.bp_systolic || visit.bp_diastolic) && (
                <Text style={styles.visitDetail}>
                  {t('bp_label')} {visit.bp_systolic}/{visit.bp_diastolic} mmHg
                </Text>
              )}
              {visit.weight && (
                <Text style={styles.visitDetail}>{t('weight_label')} {visit.weight} kg</Text>
              )}
              {visit.notes && (
                <Text style={styles.visitNotes} numberOfLines={2}>{visit.notes}</Text>
              )}
              {visit.next_visit && (
                <Text style={styles.nextVisit}>
                  {t('next_visit_label')} {new Date(visit.next_visit).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Vaccinations */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('vaccinations')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddVaccination', { patient })}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>{t('add_vaccination_button')}</Text>
          </TouchableOpacity>
        </View>
        {vaccinations.length === 0 && scheduledVisits.vaccinations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('no_vaccinations')}</Text>
          </View>
        ) : (
          <>
            {scheduledVisits.vaccinations.map(visit => (
              <View key={visit.id} style={[styles.visitItem, styles.vaccinationItem]}>
                <View style={styles.visitItemHeader}>
                  <Text style={styles.visitDate}>{format(new Date(visit.due_date), 'PPP')}</Text>
                  <View style={[
                    styles.statusBadge,
                    visit.status === 'completed' && styles.statusCompleted,
                    visit.status === 'missed' && styles.statusMissed,
                    visit.status === 'pending' && styles.statusPending,
                  ]}>
                    <Text style={styles.statusText}>
                      {visit.status === 'completed' ? t('completed') : 
                       visit.status === 'missed' ? t('missed') : t('scheduled')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.vaccineName}>{visit.schedule_type}</Text>
                {visit.status === 'pending' && (
                  <View style={styles.visitActions}>
                    <TouchableOpacity 
                      style={[styles.visitActionButton, styles.completeButton]}
                      onPress={() => handleMarkVisitComplete(visit.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.visitActionText}>{t('mark_complete')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.visitActionButton, styles.missedButton]}
                      onPress={() => handleMarkVisitMissed(visit.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.visitActionText}>{t('mark_missed')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
            {vaccinations.map(vaccination => {
              const isOverdue = !vaccination.given_date && new Date(vaccination.due_date) < new Date();
              return (
                <View key={vaccination.id} style={styles.visitItem}>
                  <View style={styles.visitItemHeader}>
                    <Text style={styles.vaccineName}>{vaccination.vaccine_name}</Text>
                    <View style={[
                      styles.statusBadge,
                      vaccination.status === 'given' && styles.statusCompleted,
                      isOverdue && styles.statusMissed,
                    ]}>
                      <Text style={styles.statusText}>
                        {vaccination.status === 'given' ? 'Given' : isOverdue ? 'Overdue' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.visitDetail}>
                    {t('due_label')} {new Date(vaccination.due_date).toLocaleDateString()}
                  </Text>
                  {vaccination.given_date && (
                    <Text style={styles.visitDetail}>
                      {t('given_label')} {new Date(vaccination.given_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  patientName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start'
    marginBottom: 16,
    flexWrap: 'wrap', // Add flexWrap to handle overflow
    gap: 8, // Add gap between wrapped items
  },
  cardTitleContainer: {
    flex: 1, // Add flex to allow title to take available space
    marginRight: 8, // Add margin to maintain spacing from button
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.3,
    flexShrink: 1, // Allow text to shrink if needed
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 'auto', // Allow button to size based on content
  },
  addButtonText: {
  color: '#FFFFFF',   // text color
  fontSize: 14,       // adjust size
  fontWeight: '600',  // match other buttons
  textAlign: 'center',
},
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryAction: {
    backgroundColor: '#3B82F6',
  },
  dangerAction: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  visitItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vaccinationItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  visitItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  visitType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusMissed: {
    backgroundColor: '#FEF2F2',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  visitPurpose: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  visitDetail: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  visitNotes: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  nextVisit: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
    marginTop: 6,
  },
  vaccineName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  visitActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  visitActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  missedButton: {
    backgroundColor: '#EF4444',
  },
  visitActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default PatientProfileScreen;