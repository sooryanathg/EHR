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

const PatientProfileScreen = ({ navigation, route }) => {
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const patientId = route.params?.patientId;
        const [patientData, visitsData, vaccinationsData] = await Promise.all([
          PatientService.getPatientById(patientId),
          VisitService.getVisitsByPatientId(patientId),
          VaccinationService.getVaccinationsByPatientId(patientId)
        ]);
        
        if (!patientData) {
          setError('Patient not found');
          return;
        }
        
        setPatient(patientData);
        setVisits(visitsData);
        setVaccinations(vaccinationsData);
      } catch (error) {
        console.error('Error loading patient:', error);
        setError('Failed to load patient data');
        Alert.alert('Error', 'Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    
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
            BP: {visit.bp_systolic}/{visit.bp_diastolic} mmHg
          </Text>
        )}
        
        {visit.weight && (
          <Text style={styles.visitDetail}>
            Weight: {visit.weight} kg
          </Text>
        )}
        
        {visit.notes && (
          <Text style={styles.visitNotes} numberOfLines={2}>
            {visit.notes}
          </Text>
        )}
        
        {nextDate && (
          <Text style={styles.nextVisit}>
            Next Visit: {nextDate}
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
        <Text style={styles.errorText}>Patient data not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAddVisit = () => {
    navigation.navigate('AddVisit', { patient });
  };

  const handleAddVaccination = () => {
    navigation.navigate('AddVaccination', { patient });
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
          Due: {dueDate}
        </Text>
        
        {givenDate && (
          <Text style={styles.vaccinationDate}>
            Given: {givenDate}
          </Text>
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
            {patient.synced ? 'Synced' : 'Pending Sync'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Patient Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{patient.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{patient.age} years</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>
              {patient.type === 'pregnant' ? 'Pregnant Woman' : 'Child'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Village:</Text>
            <Text style={styles.infoValue}>{patient.village}</Text>
          </View>
          
          {patient.health_id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Health ID:</Text>
              <Text style={styles.infoValue}>{patient.health_id}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleAddVisit}>
            <Text style={styles.actionButtonText}>+ Add Visit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Visit History</Text>
          </View>
          {visits.length === 0 ? (
            <Text style={styles.emptyText}>No visits recorded yet.</Text>
          ) : (
            visits.map(renderVisit)
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Vaccinations</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddVaccination}
            >
              <Text style={styles.addButtonText}>+ Add Vaccination</Text>
            </TouchableOpacity>
          </View>
          {vaccinations.length === 0 ? (
            <Text style={styles.emptyText}>No vaccination records found</Text>
          ) : (
            vaccinations.map(vaccination => renderVaccination(vaccination))
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
  section: {
    backgroundColor: '#fff',
    padding: 24,
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  visitCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  visitType: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  visitDetail: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  visitNotes: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  nextVisit: {
    fontSize: 14,
    color: '#27ae60',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 10,
  },
  vaccinationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
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
    color: '#7f8c8d',
    fontWeight: '500',
  },
  statusGiven: {
    color: '#27ae60',
  },
  statusOverdue: {
    color: '#e74c3c',
  },
  vaccinationDate: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    width: 120,
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
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PatientProfileScreen;
