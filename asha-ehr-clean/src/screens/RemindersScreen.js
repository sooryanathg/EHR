import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import db from '../database/schema';

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

      <Text style={styles.sectionTitle}>{t('upcoming_visits')}</Text>
      {visitReminders.length === 0 ? (
        <Text style={styles.empty}>{t('no_upcoming_visits')}</Text>
      ) : (
        <FlatList
          data={visitReminders}
          keyExtractor={(item) => `visit-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PatientProfile', { patientId: item.patient_id })}>
              <Text style={styles.cardTitle}>{item.patient_name}</Text>
              <Text style={styles.cardMeta}>{item.patient_village} • {item.next_visit}</Text>
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
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PatientProfile', { patientId: item.patient_id })}>
              <Text style={styles.cardTitle}>{item.patient_name}</Text>
              <Text style={styles.cardMeta}>{item.patient_village} • {item.due_date} • {item.vaccine_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#2c3e50' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  empty: { color: '#7f8c8d', fontSize: 14, marginBottom: 12 }
});

export default RemindersScreen;
