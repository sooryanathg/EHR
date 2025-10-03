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
  const [error, setError] = useState(null);

  const handleScheduleVisit = () => {
    navigation.navigate('ScheduleVisit', { patientId: route.params?.patientId });
  };

  const handleVisitMissed = async (visitId) => {
    try {
      const currentDate = new Date().toISOString();
      await db.executeAsync(
        'UPDATE scheduled_visits SET status = ?, missed_date = ? WHERE id = ?',
        ['missed', currentDate, visitId]
      );

      // Get the updated scheduled visit for sync
      const updatedVisit = await db.getFirstAsync(
        'SELECT * FROM scheduled_visits WHERE id = ?',
        [visitId]
      );
      
      if (updatedVisit) {
        // Add to sync queue
        await SyncQueueService.addToSyncQueue('scheduled_visits', visitId, 'update', {
          ...updatedVisit,
          status: 'missed',
          missed_date: currentDate
        });
      }
      
      // Refresh scheduled visits
      loadData();
      
      Alert.alert(t('success'), t('visit_marked_missed'));
    } catch (err) {
      console.error('Error marking visit as missed:', err);
      Alert.alert(t('error'), t('error_updating_visit_status'));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
        setError(t('patient_data_not_found'));
        return;
      }
      
      setPatient(patientData);
      setVisits(visitsData);
      setVaccinations(vaccinationsData);
      
      // Categorize scheduled visits
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
      setError(t('error_loading_patient'));
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

  const renderVisit = (visit) => {
    const date = new Date(visit.date).toLocaleDateString();
    const nextDate = visit.next_visit ? new Date(visit.next_visit).toLocaleDateString() : null;
    
    return (
      <View style={styles.visitCard} key={visit.id}>
        <View style={styles.visitHeader}>
          <Text style={styles.visitDate}>{date}</Text>
          <Text style={styles.visitType}>
            {visit.type.charAt(0).toUpperCase() + visit.type.slice(1)}
          </Text>
        </View>
        
        {(visit.bp_systolic || visit.bp_diastolic) && (
          <Text style={styles.visitDetail}>
            {t('bp_label')} {visit.bp_systolic}/{visit.bp_diastolic} mmHg
          </Text>
        )}
        
        {visit.weight && (
          <Text style={styles.visitDetail}>
            {t('weight_label')} {visit.weight} kg
          </Text>
        )}
        
        {visit.notes && (
          <Text style={styles.visitNotes} numberOfLines={2}>
            {visit.notes}
          </Text>
        )}
        
        {nextDate && (
          <Text style={styles.nextVisit}>
            {t('next_visit_label')} {nextDate}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('patient_data_not_found')}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const handleAddVisit = () => {
    navigation.navigate('AddVisit', { patient });
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

  const handleAddVaccination = () => {
    navigation.navigate('AddVaccination', { patient });
  };

  const handleMarkVisitComplete = async (scheduleId) => {
    try {
      // Create a visit record
      const visitResult = await db.runAsync(
        `INSERT INTO visits (
          patient_id, date, type, created_at
        ) VALUES (?, date('now'), 'general', datetime('now'))`,
        [patient.id]
      );

      // Extract the ID from the result, trying different properties based on platform
      const visitId = visitResult && (
        visitResult.insertId || 
        visitResult.lastInsertRowId || 
        visitResult.lastID || 
        null
      );

      // Update scheduled visit status
      await db.runAsync(
        `UPDATE scheduled_visits SET 
         status = ?,
         completed_date = datetime('now'),
         visit_id = ?
         WHERE id = ?`,
        ['completed', visitId, scheduleId]
      );

      if (!visitId) {
        throw new Error(t('error_creating_visit_no_id'));
      }

      // Add visit to sync queue
      const SyncQueueService = require('../database/syncQueueService').SyncQueueService;
      await SyncQueueService.addToSyncQueue('visits', visitId, 'create', {
        id: visitId,
        patient_id: patient.id,
        date: new Date().toISOString(),
        type: 'general',
        created_at: new Date().toISOString()
      });

      // Add scheduled visit update to sync queue
      if (!scheduleId) {
        throw new Error('Invalid schedule ID');
      }

      // Get the full scheduled visit data
      const scheduledVisit = await db.getFirstAsync(
        `SELECT * FROM scheduled_visits WHERE id = ?`,
        [scheduleId]
      );

      if (!scheduledVisit) {
        throw new Error('Failed to fetch scheduled visit data');
      }
      
      await SyncQueueService.addToSyncQueue('scheduled_visits', scheduleId, 'update', {
        ...scheduledVisit,
        status: 'completed',
        completed_date: new Date().toISOString(),
        visit_id: visitId,
        updated_at: new Date().toISOString()
      });

      // Create completion notification
      const notifResult = await db.runAsync(
        `INSERT INTO notification_queue (
          patient_id, schedule_id, type, title, message, scheduled_time, status, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))`,
        [
          patient.id,
          scheduleId,
          'completed',
          'Visit Completed',
          `Scheduled visit completed for ${patient.name}`,
          'sent'
        ]
      );

      // Extract notification ID using the same pattern as visit ID
      const notifId = notifResult && (
        notifResult.insertId || 
        notifResult.lastInsertRowId || 
        notifResult.lastID || 
        null
      );

      if (!notifId) {
        throw new Error('Failed to create notification - no ID returned');
      }

      // Add notification to sync queue
      await SyncQueueService.addToSyncQueue('notifications', notifId, 'create', {
        id: notifId,
        patient_id: patient.id,
        schedule_id: scheduleId,
        type: 'completed',
        title: 'Visit Completed',
        message: `Scheduled visit completed for ${patient.name}`,
        scheduled_time: new Date().toISOString(),
        status: 'sent',
        created_at: new Date().toISOString()
      });

      // Trigger immediate sync
      const { syncManager } = require('../services/syncManager');
      await syncManager.syncData().catch(e => console.warn('Sync after marking visit complete failed:', e));

      // Refresh data
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
        `UPDATE scheduled_visits SET 
         status = 'missed',
         completed_date = datetime('now')
         WHERE id = ?`,
        [scheduleId]
      );

      // Get the full scheduled visit data
      const SyncQueueService = require('../database/syncQueueService').SyncQueueService;
      
      const scheduledVisit = await db.getFirstAsync(
        `SELECT * FROM scheduled_visits WHERE id = ?`,
        [scheduleId]
      );

      if (!scheduledVisit) {
        throw new Error('Failed to fetch scheduled visit data');
      }

      // Add scheduled visit update to sync queue
      await SyncQueueService.addToSyncQueue('scheduled_visits', scheduleId, 'update', {
        ...scheduledVisit,
        status: 'missed',
        completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Trigger immediate sync
      const { syncManager } = require('../services/syncManager');
      await syncManager.syncData().catch(e => console.warn('Sync after marking visit missed failed:', e));

      // Refresh data
      loadData();
      
      Alert.alert(t('success'), t('visit_marked_missed'));
    } catch (error) {
      console.error('Error marking visit as missed:', error);
      Alert.alert('Error', 'Failed to mark visit as missed');
    }
  };
  
  const renderVaccination = (vaccination) => {
    const dueDate = new Date(vaccination.due_date).toLocaleDateString();
    const givenDate = vaccination.given_date ? new Date(vaccination.given_date).toLocaleDateString() : null;
    const isOverdue = !vaccination.given_date && new Date(vaccination.due_date) < new Date();
    
    return (
      <View style={styles.vaccinationCard} key={vaccination.id}>
        <View style={styles.vaccinationHeader}>
          <Text style={styles.vaccineName}>{vaccination.vaccine_name}</Text>
          <Text style={[
            styles.vaccinationStatus,
            vaccination.status === 'given' && styles.statusGiven,
            isOverdue && styles.statusOverdue
          ]}>
            {vaccination.status.charAt(0).toUpperCase() + vaccination.status.slice(1)}
          </Text>
        </View>
        
        <Text style={styles.vaccinationDate}>
          {t('due_label')} {dueDate}
        </Text>
        
        {givenDate && (
          <Text style={styles.vaccinationDate}>
            {t('given_label')} {givenDate}
          </Text>
        )}
      </View>
    );
  };

  const renderScheduledVisit = (visit) => {
    const dueDate = format(parseISO(visit.due_date), 'PPP');
    const isOverdue = new Date(visit.due_date) < new Date() && visit.status === 'pending';
    
    return (
      <View style={styles.scheduledVisitCard} key={visit.id}>
        <View style={styles.scheduledVisitHeader}>
          <Text style={styles.scheduledVisitType}>{visit.schedule_type}</Text>
          <Text style={[
            styles.scheduledVisitStatus,
            visit.status === 'completed' && styles.statusCompleted,
            visit.status === 'missed' && styles.statusMissed,
            isOverdue && styles.statusOverdue
          ]}>
            {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
          </Text>
        </View>
        
        <Text style={styles.scheduledVisitDate}>Due: {dueDate}</Text>
        
        {visit.status === 'pending' && (
          <View style={styles.scheduledVisitActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleMarkVisitComplete(visit.id)}
            >
              <Text style={styles.actionButtonText}>Mark Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.missedButton]}
              onPress={() => handleMarkVisitMissed(visit.id)}
            >
              <Text style={styles.actionButtonText}>Mark Missed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{patient.name}</Text>
        <View style={styles.syncStatus}>
          <View style={[
            styles.syncDot,
            { backgroundColor: patient.synced ? '#27ae60' : '#f39c12' }
          ]} />
          <Text style={styles.syncText}>
            {patient.synced ? t('synced') : t('pending_sync')}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('patient_information')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('name')}:</Text>
            <Text style={styles.infoValue}>{patient.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('age')}:</Text>
            <Text style={styles.infoValue}>{patient.age} {t('years')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('type')}:</Text>
            <Text style={styles.infoValue}>
              {patient.type === 'pregnant' ? t('patient_type_pregnant') : (patient.type === 'lactating' ? t('patient_type_lactating') : t('patient_type_child'))}
            </Text>
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


        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('quick_actions')}</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddVisit}>
            <Text style={styles.actionButtonText}>{t('add_visit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#e74c3c', marginTop: 10 }]} onPress={handleDeletePatient}>
            <Text style={styles.actionButtonText}>{t('delete_patient_title')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{t('scheduled_visits')}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleScheduleVisit}
            >
              <Text style={styles.addButtonText}>{t('schedule_visit')}</Text>
            </TouchableOpacity>
          </View>
          {scheduledVisits.regular.length === 0 ? (
            <Text style={styles.emptyText}>{t('no_scheduled_visits')}</Text>
          ) : (
            scheduledVisits.regular.map(visit => (
              <View key={visit.id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>
                    {format(new Date(visit.due_date), 'PPP')}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: visit.status === 'completed' ? '#27ae60' : visit.status === 'missed' ? '#e74c3c' : '#f39c12' }]}>
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
                      style={[styles.visitButton, { backgroundColor: '#27ae60' }]}
                      onPress={() => handleMarkVisitComplete(visit.id)}
                    >
                      <Text style={styles.visitButtonText}>{t('mark_complete')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.visitButton, { backgroundColor: '#e74c3c' }]}
                      onPress={() => handleMarkVisitMissed(visit.id)}
                    >
                      <Text style={styles.visitButtonText}>{t('mark_missed')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{t('visit_history')}</Text>
          </View>
          {visits.length === 0 ? (
            <Text style={styles.emptyText}>{t('no_visits')}</Text>
          ) : (
            visits.map(renderVisit)
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{t('vaccinations')}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddVaccination}
            >
              <Text style={styles.addButtonText} numberOfLines={1} ellipsizeMode="tail">{t('add_vaccination_button')}</Text>
            </TouchableOpacity>
          </View>
          {vaccinations.length === 0 && scheduledVisits.vaccinations.length === 0 ? (
            <Text style={styles.emptyText}>{t('no_vaccinations')}</Text>
          ) : (
            <>
              {scheduledVisits.vaccinations.map(visit => (
                <View key={visit.id} style={[styles.visitCard, { borderColor: '#3498db' }]}>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitDate}>
                      {format(new Date(visit.due_date), 'PPP')}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: visit.status === 'completed' ? '#27ae60' : visit.status === 'missed' ? '#e74c3c' : '#f39c12' }]}>
                      <Text style={styles.statusText}>
                        {visit.status === 'completed' ? t('completed') : 
                         visit.status === 'missed' ? t('missed') : t('scheduled')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.visitPurpose, { color: '#3498db' }]}>{t('scheduled_vaccination')}: {visit.schedule_type}</Text>
                  {visit.status === 'pending' && (
                    <View style={styles.visitActions}>
                      <TouchableOpacity 
                        style={[styles.visitButton, { backgroundColor: '#27ae60' }]}
                        onPress={() => handleMarkVisitComplete(visit.id)}
                      >
                        <Text style={styles.visitButtonText}>{t('mark_complete')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.visitButton, { backgroundColor: '#e74c3c' }]}
                        onPress={() => handleMarkVisitMissed(visit.id)}
                      >
                        <Text style={styles.visitButtonText}>{t('mark_missed')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
              {vaccinations.map(vaccination => renderVaccination(vaccination))}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f6fa',
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  syncText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    flex: 1,
    minWidth: 0, // allow flex children to shrink on Android
    flexWrap: 'wrap',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    width: 100,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  visitCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  visitPurpose: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  visitActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  visitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  visitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    alignSelf: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 160,
  },
});

export default PatientProfileScreen;
