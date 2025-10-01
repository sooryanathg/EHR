import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import db from '../database/schema';
import { useTranslation } from 'react-i18next';

const TodayVisitsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const rows = await db.getAllAsync(
          `SELECT sv.*, p.name as patient_name, p.village as patient_village FROM scheduled_visits sv JOIN patients p ON p.id = sv.patient_id WHERE sv.due_date = ? ORDER BY sv.due_date ASC`,
          [todayStr]
        );

        setVisits(rows || []);
      } catch (e) {
        console.warn('Failed to load today visits', e);
      } finally {
        setLoading(false);
      }
    };

    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#3498db"/></View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('today_visits') || 'Today\'s Visits'}</Text>
      {visits.length === 0 ? (
        <Text style={styles.empty}>{t('no_visits')}</Text>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => `sv-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PatientProfile', { patientId: item.patient_id })}>
              <Text style={styles.cardTitle}>{item.patient_name}</Text>
              <Text style={styles.cardMeta}>{item.patient_village} • {item.schedule_type} • {item.due_date}</Text>
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
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  empty: { color: '#7f8c8d', fontSize: 14, marginTop: 12 }
});

export default TodayVisitsScreen;
