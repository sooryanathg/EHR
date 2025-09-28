import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { PatientService } from '../database/patientService';
import { VisitService } from '../database/visitService';
import { VaccinationService } from '../database/vaccinationService';

const PatientProfileScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const { t } = useTranslation();
  const [patientData, setPatientData] = useState(patient);
  const [visits, setVisits] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      const [patientInfo, patientVisits, patientVaccinations] = await Promise.all([
        PatientService.getPatientById(patient.id),
        VisitService.getVisitsByPatientId(patient.id),
        VaccinationService.getVaccinationsByPatientId(patient.id)
      ]);

      setPatientData(patientInfo);
      setVisits(patientVisits);
      setVaccinations(patientVaccinations);
    } catch (error) {
      console.error('Error loading patient data:', error);
      Alert.alert(t('common.error'), 'Failed to load patient data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientData();
    setRefreshing(false);
  };

  const handleAddVisit = () => {
    navigation.navigate('AddVisit', { patient: patientData });
  };

  const handleVaccination = () => {
    navigation.navigate('Vaccination', { patient: patientData });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.patientName}>{patientData.name}</Text>
        <Text style={styles.patientDetails}>
          {patientData.age} years • {patientData.village}
        </Text>
        <Text style={styles.patientType}>
          {patientData.type === 'pregnant' ? t('patients.pregnantWoman') : t('patients.child')}
        </Text>
        {patientData.health_id && (
          <Text style={styles.healthId}>{t('patients.healthId')}: {patientData.health_id}</Text>
        )}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddVisit}>
          <Text style={styles.actionButtonText}>+ {t('visits.addVisit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleVaccination}>
          <Text style={styles.actionButtonText}>+ {t('vaccinations.title')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('visits.title')}</Text>
        {visits.length > 0 ? (
          visits.map((visit) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitType}>{visit.type.toUpperCase()}</Text>
                <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
              </View>
              {visit.bp_systolic && visit.bp_diastolic && (
                <Text style={styles.visitDetail}>
                  BP: {visit.bp_systolic}/{visit.bp_diastolic}
                </Text>
              )}
              {visit.weight && (
                <Text style={styles.visitDetail}>
                  Weight: {visit.weight} kg
                </Text>
              )}
              {visit.notes && (
                <Text style={styles.visitNotes}>{visit.notes}</Text>
              )}
              {visit.next_visit && (
                <Text style={styles.nextVisit}>
                  Next visit: {formatDate(visit.next_visit)}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('visits.noVisits')}</Text>
        )}
      </View>

      {patientData.type === 'child' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('vaccinations.title')}</Text>
          {vaccinations.length > 0 ? (
            vaccinations.map((vaccination) => (
              <View key={vaccination.id} style={styles.vaccinationCard}>
                <View style={styles.vaccinationHeader}>
                  <Text style={styles.vaccineName}>{vaccination.vaccine_name}</Text>
                  <Text style={[
                    styles.vaccinationStatus,
                    { color: vaccination.status === 'given' ? '#27ae60' : 
                             vaccination.status === 'overdue' ? '#e74c3c' : '#f39c12' }
                  ]}>
                    {vaccination.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.vaccinationDetail}>
                  Due: {formatDate(vaccination.due_date)}
                </Text>
                {vaccination.given_date && (
                  <Text style={styles.vaccinationDetail}>
                    Given: {formatDate(vaccination.given_date)}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('vaccinations.noVaccinations')}</Text>
          )}
        </View>
      )}
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
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  patientDetails: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  patientType: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  healthId: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  visitCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  visitDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  visitDetail: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  visitNotes: {
    fontSize: 14,
    color: '#2c3e50',
    fontStyle: 'italic',
    marginTop: 8,
  },
  nextVisit: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
    marginTop: 8,
  },
  vaccinationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  vaccinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  vaccinationStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  vaccinationDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PatientProfileScreen;

