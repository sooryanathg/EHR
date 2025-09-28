import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuthService } from '../auth/authService';

const DashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalVisits: 0,
    pendingVaccinations: 0,
    overdueVisits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get total patients
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const totalPatients = patientsSnapshot.size;

      // Get total visits
      const visitsSnapshot = await getDocs(collection(db, 'visits'));
      const totalVisits = visitsSnapshot.size;

      // Get pending vaccinations
      const vaccinationsQuery = query(
        collection(db, 'vaccinations'),
        where('status', '==', 'pending')
      );
      const vaccinationsSnapshot = await getDocs(vaccinationsQuery);
      const pendingVaccinations = vaccinationsSnapshot.size;

      // Calculate overdue visits
      const today = new Date();
      let overdueCount = 0;
      visitsSnapshot.forEach(doc => {
        const nextVisit = doc.data().next_visit;
        if (nextVisit && new Date(nextVisit) < today) {
          overdueCount++;
        }
      });

      setStats({
        totalPatients,
        totalVisits,
        pendingVaccinations,
        overdueVisits: overdueCount,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PHC Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.totalPatients}</Text>
            <Text style={styles.statsLabel}>Total Patients</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.totalVisits}</Text>
            <Text style={styles.statsLabel}>Total Visits</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.pendingVaccinations}</Text>
            <Text style={styles.statsLabel}>Pending Vaccinations</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{stats.overdueVisits}</Text>
            <Text style={styles.statsLabel}>Overdue Visits</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PatientList')}
          >
            <Text style={styles.actionButtonText}>View Patients</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Sync')}
          >
            <Text style={styles.actionButtonText}>Sync Data</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ff3b30',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    elevation: 2,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0066cc',
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});