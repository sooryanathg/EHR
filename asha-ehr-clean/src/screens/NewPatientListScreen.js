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
  ScrollView,
} from 'react-native';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PatientService } from '../database/patientService';
import { AuthService } from '../auth/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';

const NewPatientListScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPatients();
    });
    loadPatients();
    return unsubscribe;
  }, [navigation]);

  // Set up the custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      header: (props) => <AppHeader {...props} navigation={navigation} />,
      headerShown: true,
      headerStyle: {
        height: 'auto',
      },
    });
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
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]} />
        <View style={styles.patientInfo}>
          <Text style={styles.patientName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '15' }]}>
              <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>
                {getTypeLabel(item.type)}
              </Text>
            </View>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>{t('age')}:</Text>
            <Text style={styles.detailValue}>{item.age} {t('years')}</Text>
            <Text style={styles.detailSeparator}>•</Text>
            <Text style={styles.detailLabel}>{t('village')}:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.village}</Text>
          </View>
          {item.health_id && (
            <Text style={styles.healthId} numberOfLines={1}>
              {t('health_id')}: {item.health_id}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.syncBadge, { backgroundColor: item.synced ? '#ECFDF5' : '#FEF2F2' }]}>
          <View style={[styles.syncDot, { backgroundColor: item.synced ? '#10B981' : '#EF4444' }]} />
          <Text style={[styles.syncText, { color: item.synced ? '#047857' : '#DC2626' }]}>
            {item.synced ? t('synced') : t('not_synced')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Search and Filter Section */}
        <View style={styles.controlsSection}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search_placeholder')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => handleFilterChange('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
                {t('filter_all')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'pregnant' && styles.filterChipActive]}
              onPress={() => handleFilterChange('pregnant')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeFilter === 'pregnant' && styles.filterChipTextActive]}>
                {t('filter_pregnant')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'lactating' && styles.filterChipActive]}
              onPress={() => handleFilterChange('lactating')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeFilter === 'lactating' && styles.filterChipTextActive]}>
                {t('filter_lactating')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'child' && styles.filterChipActive]}
              onPress={() => handleFilterChange('child')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeFilter === 'child' && styles.filterChipTextActive]}>
                {t('filter_child')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Patient List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPatientCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>
                  {searchQuery || activeFilter !== 'all'
                    ? t('no_match_search')
                    : t('no_patients')}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || activeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Add your first patient to get started'}
                </Text>
              </View>
            )}
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddPatient')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Add new patient"
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  controlsSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginRight: 8,
  },
  detailSeparator: {
    fontSize: 13,
    color: '#D1D5DB',
    marginRight: 8,
  },
  healthId: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  cardRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    letterSpacing: 0.2,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default NewPatientListScreen;