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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VaccinationService } from '../database/vaccinationService';
import { useTranslation } from 'react-i18next';

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
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>{t('vaccine_name')} *</Text>
        <TextInput
          style={styles.input}
          value={vaccineName}
          onChangeText={setVaccineName}
          placeholder={t('enter_vaccine_name')}
        />

        <Text style={styles.label}>{t('batch_number')}</Text>
        <TextInput
          style={styles.input}
          value={vaccineBatch}
          onChangeText={setVaccineBatch}
          placeholder={t('enter_batch_number')}
        />

        <Text style={styles.label}>{t('due_label')}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDuePicker(true)}>
          <Text style={{ color: dueDate ? '#2c3e50' : '#7f8c8d' }}>{dueDate || 'YYYY-MM-DD'}</Text>
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

        <Text style={styles.label}>{t('given_label')}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowGivenPicker(true)}>
          <Text style={{ color: givenDate ? '#2c3e50' : '#7f8c8d' }}>{givenDate || 'YYYY-MM-DD'}</Text>
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

        <Text style={styles.label}>{t('notes')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('enter_additional_notes')}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.button} onPress={handleAddVaccination}>
          <Text style={styles.buttonText}>{t('add_vaccination')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddVaccinationScreen;