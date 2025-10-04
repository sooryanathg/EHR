import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import db from '../database/schema';
import { formatRemindersDate, getRelativeDays } from '../utils/toastConfig';

// This screen reads local SQLite to find upcoming next_visit and due_date within the next N days
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

        // visits with next_visit between today and nextWeek
        const visits = await db.getAllAsync(
          `SELECT v.*, p.name as patient_name, p.village as patient_village FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.next_visit IS NOT NULL AND v.next_visit >= ? AND v.next_visit <= ? ORDER BY v.next_visit ASC`,
          [todayStr, nextWeekStr]
        );

        // vaccinations with due_date between today and nextWeek and not given
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('reminders')}</Text>
      <TouchableOpacity style={styles.todayButton} onPress={() => navigation.navigate('TodayVisits')}>
        <Text style={styles.todayButtonText}>{t('today_visits') || "Today's Visits"}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('upcoming_visits')}</Text>
      {visitReminders.length === 0 ? (
        <Text style={styles.empty}>{t('no_upcoming_visits')}</Text>
      ) : (
        <FlatList
          data={visitReminders}
          keyExtractor={(item) => `visit-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#3498db' }]} 
              onPress={() => {
                navigation.navigate('PatientProfile', { patientId: item.patient_id });
                Toast.show({
                  type: 'info',
                  text1: item.patient_name,
                  text2: `Visit scheduled ${getRelativeDays(item.next_visit)}`,
                });
              }}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.patient_name}</Text>
                <Text style={styles.cardMeta}>
                  <Text style={styles.village}>{item.patient_village}</Text>
                  {' • '}
                  <Text style={styles.date}>{formatRemindersDate(item.next_visit)}</Text>
                </Text>
              </View>
              <View style={styles.chevron}>
                <Text style={styles.chevronText}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.sectionTitle}>{t('upcoming_vaccinations')}</Text>
      {vacReminders.length === 0 ? (
        <Text style={styles.empty}>{t('no_upcoming_vaccinations')}</Text>
      ) : (
        <FlatList
          data={vacReminders}
          keyExtractor={(item) => `vac-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#e74c3c' }]}
              onPress={() => {
                navigation.navigate('PatientProfile', { patientId: item.patient_id });
                Toast.show({
                  type: 'warning',
                  text1: `${item.vaccine_name} Vaccination`,
                  text2: `Due ${getRelativeDays(item.due_date)} for ${item.patient_name}`,
                });
              }}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.patient_name}</Text>
                <Text style={styles.vaccineName}>{item.vaccine_name}</Text>
                <Text style={styles.cardMeta}>
                  <Text style={styles.village}>{item.patient_village}</Text>
                  {' • '}
                  <Text style={styles.date}>{formatRemindersDate(item.due_date)}</Text>
                </Text>
              </View>
              <View style={styles.chevron}>
                <Text style={styles.chevronText}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#34495e',
  },
  todayButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  vaccineName: {
    fontSize: 15,
    color: '#e74c3c',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  village: {
    color: '#34495e',
    fontWeight: '500',
  },
  date: {
    color: '#7f8c8d',
  },
  empty: {
    color: '#95a5a6',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chevron: {
    marginLeft: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 24,
    color: '#bdc3c7',
    fontWeight: '300',
  }
});

export default RemindersScreen;
