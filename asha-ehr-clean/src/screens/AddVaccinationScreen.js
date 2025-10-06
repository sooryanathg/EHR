import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VaccinationService } from '../database/vaccinationService';
import { useTranslation } from 'react-i18next';
import VoiceInput from '../components/VoiceInput';

const AddVaccinationScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  const { t } = useTranslation();
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineBatch, setVaccineBatch] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [givenDate, setGivenDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showGivenPicker, setShowGivenPicker] = useState(false);

  const handleAddVaccination = async () => {
    if (!vaccineName.trim()) {
      Alert.alert(t('error'), t('enter_vaccine_name'));
      return;
    }

    try {
      const vaccination = {
        patient_id: patient.id,
        vaccine_name: vaccineName.trim(),
        due_date: dueDate,
        given_date: givenDate,
        status: 'given'
      };

      await VaccinationService.createAndQueueVaccination(vaccination);
      Alert.alert(t('success'), t('vaccination_added_success'));
      navigation.goBack();
    } catch (error) {
      console.error('Error adding vaccination:', error);
      Alert.alert(t('error'), t('vaccination_add_error'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('add_vaccination')}</Text>
            <Text style={styles.headerSubtitle}>{patient.name}</Text>
          </View>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('vaccine_name')} *</Text>
          <TextInput
            style={styles.input}
            value={vaccineName}
            onChangeText={setVaccineName}
            placeholder={t('enter_vaccine_name')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('batch_number')}</Text>
          <TextInput
            style={styles.input}
            value={vaccineBatch}
            onChangeText={setVaccineBatch}
            placeholder={t('enter_batch_number')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('due_label')}</Text>
          <TouchableOpacity 
            style={styles.dateInput} 
            onPress={() => setShowDuePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateInputIcon}>📅</Text>
            <Text style={styles.dateText}>{dueDate || 'YYYY-MM-DD'}</Text>
          </TouchableOpacity>
          {showDuePicker && (
            <DateTimePicker
              value={new Date(dueDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(e, selected) => {
                setShowDuePicker(Platform.OS === 'ios');
                if (selected) {
                  const y = selected.getFullYear();
                  const m = String(selected.getMonth() + 1).padStart(2, '0');
                  const d = String(selected.getDate()).padStart(2, '0');
                  setDueDate(`${y}-${m}-${d}`);
                }
              }}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('given_label')}</Text>
          <TouchableOpacity 
            style={styles.dateInput} 
            onPress={() => setShowGivenPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateInputIcon}>📅</Text>
            <Text style={styles.dateText}>{givenDate || 'YYYY-MM-DD'}</Text>
          </TouchableOpacity>
          {showGivenPicker && (
            <DateTimePicker
              value={new Date(givenDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(e, selected) => {
                setShowGivenPicker(Platform.OS === 'ios');
                if (selected) {
                  const y = selected.getFullYear();
                  const m = String(selected.getMonth() + 1).padStart(2, '0');
                  const d = String(selected.getDate()).padStart(2, '0');
                  setGivenDate(`${y}-${m}-${d}`);
                }
              }}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('notes')}</Text>
          <VoiceInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('enter_additional_notes')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>

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
            onPress={handleAddVaccination}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>{t('add_vaccination')}</Text>
          </TouchableOpacity>
        </View>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Extra padding at bottom to ensure last input is visible
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
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
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
    height: 120,
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
    textAlign: 'center',
  },
});

export default AddVaccinationScreen;