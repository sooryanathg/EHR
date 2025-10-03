import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { PatientService } from '../database/patientService';
import { AuthService } from '../auth/authService';
import AppHeader from '../components/AppHeader';

const PatientListScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    load();
    return unsubscribe;
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: (props) => <AppHeader {...props} navigation={navigation} />,
      headerShown: true,
      headerStyle: {
        height: 'auto',
      },
    });
  }, [navigation]);

  const load = async () => {
    try {
      setLoading(true);
      const data = searchQuery 
        ? await PatientService.searchPatients(searchQuery)
        : await PatientService.getAllPatients();
      setPatients(data);
    } catch (e) {
      console.error('Error loading patients:', e);
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const renderPatient = ({ item }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientProfile', { patientId: item.id })}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.name || 'U').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientDetails} numberOfLines={1} ellipsizeMode="tail">
          Age: {item.age} • {item.type === 'pregnant' ? 'Pregnant Woman' : 'Child'}
        </Text>
        <Text style={styles.patientVillage} numberOfLines={1} ellipsizeMode="tail">Village: {item.village}</Text>
        {item.health_id && (
          <Text style={styles.healthId} numberOfLines={1} ellipsizeMode="tail">Health ID: {item.health_id}</Text>
        )}
      </View>

      <View style={styles.syncStatus}>
        <View style={[
          styles.syncDot,
          { backgroundColor: item.synced ? '#27ae60' : '#f39c12' }
        ]} />
        <Text style={styles.syncText}>
          {item.synced ? t('synced') : t('not_synced')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <View style={styles.searchWrap}>
        <TextInput
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={load}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>



      {patients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('no_patients')}</Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => navigation.navigate('AddPatient')}
          >
            <Text style={styles.emptyAddButtonText}>Add first patient</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={patients}
          renderItem={renderPatient}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPatient')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flexShrink: 1,
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutButtonMain: {
    position: 'absolute',
    top: 80,
    right: 15,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    zIndex: 999,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 14,
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e1f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#3498db',
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  patientDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  patientVillage: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  healthId: {
    fontSize: 12,
    color: '#95a5a6',
  },
  syncStatus: {
    alignItems: 'center',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  syncText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  emptyAddButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#3498db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 28,
  },
  langButtonHeader: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langTextHeader: {
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalItem: {
    paddingVertical: 10,
  },
  modalItemText: {
    fontSize: 14,
    color: '#333',
  },
  modalItemActive: {
    color: '#3498db',
    fontWeight: '700',
  },
});

export default PatientListScreen;
