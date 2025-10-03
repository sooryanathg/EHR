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
      // Get the patient ID from route params
      const patientId = route.params?.patientId;
      if (!patientId) {
        throw new Error('Patient ID not found');
      }

      // Calculate window start (1 day before) and window end (1 day after)
      const windowStart = addDays(date, -1).toISOString();
      const windowEnd = addDays(date, 1).toISOString();
      
      // Insert the scheduled visit
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
          'general',    // visit_type
          'regular',   // schedule_type
          date.toISOString(), // due_date
          windowStart, // window_start
          windowEnd,   // window_end
          'pending'    // status
        ]
      );

      // Add reminder to notification queue
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
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('schedule_visit')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('visit_purpose')}</Text>
            <TextInput
              style={styles.input}
              value={purpose}
              onChangeText={setPurpose}
              placeholder={t('enter_visit_purpose')}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('visit_date')}</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {format(date, 'PPP')}
              </Text>
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
            >
              <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={handleSchedule}
            >
              <Text style={styles.scheduleButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    paddingVertical: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: '#2980b9',
    paddingVertical: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ScheduleVisitScreen;