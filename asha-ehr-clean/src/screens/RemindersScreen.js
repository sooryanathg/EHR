import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import db from '../database/schema';
import { formatRemindersDate, getRelativeDays } from '../utils/toastConfig';

const RemindersScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [visitReminders, setVisitReminders] = useState([]);
  const [vacReminders, setVacReminders] = useState([]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const yyyy = (d) => d.getFullYear();
        const mm = (d) => String(d.getMonth() + 1).padStart(2, '0');
        const dd = (d) => String(d.getDate()).padStart(2, '0');
        const todayStr = `${yyyy(today)}-${mm(today)}-${dd(today)}`;
        const nextWeekStr = `${yyyy(nextWeek)}-${mm(nextWeek)}-${dd(nextWeek)}`;

        const visits = await db.getAllAsync(
          `SELECT v.*, p.name as patient_name, p.village as patient_village FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.next_visit IS NOT NULL AND v.next_visit >= ? AND v.next_visit <= ? ORDER BY v.next_visit ASC`,
          [todayStr, nextWeekStr]
        );

        const vacs = await db.getAllAsync(
          `SELECT vv.*, p.name as patient_name, p.village as patient_village FROM vaccinations vv JOIN patients p ON vv.patient_id = p.id WHERE vv.due_date IS NOT NULL AND vv.due_date >= ? AND vv.due_date <= ? AND (vv.status IS NULL OR vv.status != 'given') ORDER BY vv.due_date ASC`,
          [todayStr, nextWeekStr]
        );

        setVisitReminders(visits || []);
        setVacReminders(vacs || []);
      } catch (err) {
        console.warn('Failed to load reminders', err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadReminders);
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('reminders')}</Text>
        <TouchableOpacity 
          style={styles.todayButton} 
          onPress={() => navigation.navigate('TodayVisits')}
          activeOpacity={0.8}
        >
          <Text style={styles.todayButtonText}>{t('today_visits') || "Today's Visits"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('upcoming_visits')}</Text>
          {visitReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>{t('no_upcoming_visits')}</Text>
            </View>
          ) : (
            <FlatList
              data={visitReminders}
              keyExtractor={(item) => `visit-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.card, styles.visitCard]} 
                  onPress={() => {
                    navigation.navigate('PatientProfile', { patientId: item.patient_id });
                    Toast.show({
                      type: 'info',
                      text1: item.patient_name,
                      text2: `Visit scheduled ${getRelativeDays(item.next_visit)}`,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.patient_name}</Text>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.village}>{item.patient_village}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.date}>{formatRemindersDate(item.next_visit)}</Text>
                    </View>
                  </View>
                  <View style={styles.chevron}>
                    <Text style={styles.chevronText}>›</Text>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('upcoming_vaccinations')}</Text>
          {vacReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💉</Text>
              <Text style={styles.emptyText}>{t('no_upcoming_vaccinations')}</Text>
            </View>
          ) : (
            <FlatList
              data={vacReminders}
              keyExtractor={(item) => `vac-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.card, styles.vaccinationCard]}
                  onPress={() => {
                    navigation.navigate('PatientProfile', { patientId: item.patient_id });
                    Toast.show({
                      type: 'warning',
                      text1: `${item.vaccine_name} Vaccination`,
                      text2: `Due ${getRelativeDays(item.due_date)} for ${item.patient_name}`,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.patient_name}</Text>
                    <Text style={styles.vaccineName}>{item.vaccine_name}</Text>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.village}>{item.patient_village}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.date}>{formatRemindersDate(item.due_date)}</Text>
                    </View>
                  </View>
                  <View style={styles.chevron}>
                    <Text style={styles.chevronText}>›</Text>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>
    </View>
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  todayButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  visitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  vaccinationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  vaccineName: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  village: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  separator: {
    fontSize: 13,
    color: '#D1D5DB',
    marginHorizontal: 8,
  },
  date: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default RemindersScreen;