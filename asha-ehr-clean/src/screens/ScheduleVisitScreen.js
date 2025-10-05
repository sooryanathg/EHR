import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import db from '../database/schema';

const ScheduleVisitScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSchedule = async () => {
    if (!purpose) {
      Alert.alert(t('error'), t('please_enter_purpose'));
      return;
    }

    try {
      const patientId = route.params?.patientId;
      if (!patientId) {
        throw new Error('Patient ID not found');
      }

      const windowStart = addDays(date, -1).toISOString();
      const windowEnd = addDays(date, 1).toISOString();
      
      await db.runAsync(
        `INSERT INTO scheduled_visits (
          patient_id,
          visit_type,
          schedule_type,
          due_date,
          window_start,
          window_end,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          patientId,
          'general',
          'regular',
          date.toISOString(),
          windowStart,
          windowEnd,
          'pending'
        ]
      );

      await db.runAsync(
        `INSERT INTO notification_queue (
          patient_id,
          type,
          title,
          message,
          scheduled_time,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          'scheduled_visit',
          'Scheduled Visit Reminder',
          `Reminder: ${purpose}`,
          windowStart,
          'pending'
        ]
      );
      
      Alert.alert(t('success'), t('visit_scheduled'), [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (err) {
      Alert.alert(t('error'), t('error_scheduling_visit'));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('schedule_visit')}</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('visit_purpose')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={purpose}
            onChangeText={setPurpose}
            placeholder={t('enter_visit_purpose')}
            placeholderTextColor="#9CA3AF"
            multiline={true}
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('visit_date')}</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateInputIcon}>📅</Text>
            <Text style={styles.dateText}>{format(date, 'PPP')}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSchedule}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  dateText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default ScheduleVisitScreen;