import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { PatientService } from '../database/patientService';
import { AuthService } from '../auth/authService';
import { initDatabase } from '../database/schema';

const PatientListScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchQuery]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      await initDatabase(); // Ensure database is initialized
      const data = await PatientService.getAllPatients();
      setPatients(data || []); // Ensure we always have an array
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Error', 'Failed to load patients. Please try again.');
      setPatients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.health_id && patient.health_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredPatients(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientProfile', { patient: item })}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientDetails}>
          {item.age} years • {item.village}
        </Text>
        <Text style={styles.patientType}>
          {item.type === 'pregnant' ? 'Pregnant Woman' : 'Child'}
        </Text>
        {item.health_id && (
          <Text style={styles.healthId}>Health ID: {item.health_id}</Text>
        )}
      </View>
      <View style={styles.syncIndicator}>
        <View style={[
          styles.syncDot,
          { backgroundColor: item.synced ? '#27ae60' : '#f39c12' }
        ]} />
        <Text style={styles.syncText}>
          {item.synced ? 'Synced' : 'Pending'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPatient')}
        >
          <Text style={styles.addButtonText}>+ Add Patient</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={() => navigation.navigate('Sync')}
        >
          <Text style={styles.syncButtonText}>Sync</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.emptyContainer, { marginTop: 100 }]}> 
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[styles.emptyText, { marginTop: 20 }]}>Loading patients...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPatientItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No patients found</Text>
              <Text style={styles.emptySubtext}>Add a new patient to get started</Text>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  patientType: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  healthId: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  syncIndicator: {
    alignItems: 'center',
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  syncText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
  },
});

export default PatientListScreen;

