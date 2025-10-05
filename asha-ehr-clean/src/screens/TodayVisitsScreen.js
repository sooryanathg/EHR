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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading today's visits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('today_visits') || "Today's Visits"}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{visits.length}</Text>
        </View>
      </View>

      {visits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No visits scheduled</Text>
          <Text style={styles.emptySubtitle}>You have no visits scheduled for today</Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => `sv-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => navigation.navigate('PatientProfile', { patientId: item.patient_id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <View style={[
                  styles.statusIndicator,
                  item.status === 'completed' && styles.statusCompleted,
                  item.status === 'missed' && styles.statusMissed,
                  item.status === 'pending' && styles.statusPending,
                ]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.patient_name}</Text>
                  <Text style={styles.scheduleType}>{item.schedule_type}</Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.village}>{item.patient_village}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.date}>{item.due_date}</Text>
                  </View>
                </View>
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
  countBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 36,
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
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
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  statusPending: {
    backgroundColor: '#F59E0B',
  },
  statusCompleted: {
    backgroundColor: '#10B981',
  },
  statusMissed: {
    backgroundColor: '#EF4444',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  scheduleType: {
    fontSize: 14,
    color: '#3B82F6',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

export default TodayVisitsScreen;