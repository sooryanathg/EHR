import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { PatientService } from '../database/patientService';
import { AuthService } from '../auth/authService';

const NewPatientListScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showLangModal, setShowLangModal] = useState(false);
  const [language, setLanguage] = useState(i18n.language || 'en');
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPatients();
    });
    loadPatients();
    return unsubscribe;
  }, [navigation]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getAllPatients();
      setPatients(data);
      applyFilters(data, activeFilter, searchQuery);
    } catch (e) {
      console.error('Error loading patients:', e);
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, filter, search) => {
    let result = [...data];

    if (filter !== 'all') {
      result = result.filter(patient => patient.type === filter);
    }

    if (search) {
      result = result.filter(patient =>
        patient.name.toLowerCase().includes(search.toLowerCase()) ||
        patient.village.toLowerCase().includes(search.toLowerCase()) ||
        (patient.health_id && patient.health_id.toLowerCase().includes(search.toLowerCase()))
      );
    }

    setFilteredPatients(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(patients, activeFilter, text);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(patients, filter, searchQuery);
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'pregnant': return 'Pregnant Woman';
      case 'lactating': return 'Lactating Woman';
      case 'child': return 'Child';
      default: return type;
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.clearPIN(); // clears 'asha_pin' and 'user_role'
      navigation.replace('Login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const renderPatientCard = ({ item }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientProfile', { patientId: item.id })}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientType}>{getTypeLabel(item.type)}</Text>
        <Text style={styles.patientDetails}>Age: {item.age}</Text>
        <Text style={styles.patientVillage}>Village: {item.village}</Text>
        {item.health_id && (
          <Text style={styles.healthId}>Health ID: {item.health_id}</Text>
        )}
      </View>
      <View style={styles.syncStatus}>
        <View
          style={[
            styles.syncDot,
            { backgroundColor: item.synced ? '#2ecc71' : '#e74c3c' }
          ]}
        />
        <Text style={styles.syncText}>
          {item.synced ? 'Synced' : 'Not Synced'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={styles.headerTitle}>{t('patients_title')}</Text>
            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.langButtonHeader}
                onPress={() => setShowLangModal(true)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={styles.langTextHeader}>{language === 'hi' ? 'हिं' : language === 'ta' ? 'த' : 'EN'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Logout"
              >
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
              onPress={() => handleFilterChange('all')}
            >
              <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
                {t('filter_all')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'pregnant' && styles.activeFilter]}
              onPress={() => handleFilterChange('pregnant')}
            >
              <Text style={[styles.filterText, activeFilter === 'pregnant' && styles.activeFilterText]}>
                {t('filter_pregnant')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'lactating' && styles.activeFilter]}
              onPress={() => handleFilterChange('lactating')}
            >
              <Text style={[styles.filterText, activeFilter === 'lactating' && styles.activeFilterText]}>
                {t('filter_lactating')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === 'child' && styles.activeFilter]}
              onPress={() => handleFilterChange('child')}
            >
              <Text style={[styles.filterText, activeFilter === 'child' && styles.activeFilterText]}>
                {t('filter_child')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPatientCard}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
          {searchQuery || activeFilter !== 'all'
            ? t('no_match_search')
            : t('no_patients')}
                </Text>
              </View>
            )}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddPatient')}
          accessibilityRole="button"
          accessibilityLabel="Add new patient"
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
        {/* Language selection modal */}
        <Modal
          visible={showLangModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLangModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowLangModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => { i18n.changeLanguage('en'); setLanguage('en'); setShowLangModal(false); }}
              >
                <Text style={[styles.modalItemText, language === 'en' && styles.modalItemActive]}>English (EN)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => { i18n.changeLanguage('hi'); setLanguage('hi'); setShowLangModal(false); }}
              >
                <Text style={[styles.modalItemText, language === 'hi' && styles.modalItemActive]}>हिंदी (HI)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => { i18n.changeLanguage('ta'); setLanguage('ta'); setShowLangModal(false); }}
              >
                <Text style={[styles.modalItemText, language === 'ta' && styles.modalItemActive]}>தமிழ் (TA)</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
    backgroundColor: 'transparent',
  },
  logoutText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    marginHorizontal: 5,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 2,
  },
  filterText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  activeFilter: {
    backgroundColor: '#3498db',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  patientInfo: {
    flex: 1,
    marginRight: 10,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  patientType: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  patientVillage: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  healthId: {
    fontSize: 12,
    color: '#95a5a6',
  },
  syncStatus: {
    alignItems: 'center',
    marginLeft: 10,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  syncText: {
    fontSize: 10,
    color: '#95a5a6',
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  langButtonHeader: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  langTextHeader: {
    color: '#333',
    fontWeight: '700',
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default NewPatientListScreen;