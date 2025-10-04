import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PatientService } from '../database/patientService';
import { syncManager } from '../services/syncManager';
import { 
  createPregnancySchedule, 
  createImmunizationSchedule,
  setupNotificationCheck 
} from '../database/scheduleService';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const NewAddPatientScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const i18n = require('i18next');
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    type: '',
    village: '',
    health_id: '',
    phone: '',
    aadhar: '',
    // Pregnancy details
    lmp_date: '',
    gravida: '1',
    parity: '0',
    high_risk: false,
    // Child details
    dob: '',
    weight: '',
    parent_name: ''
  });

  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert(t('error'), t('enter_name'));
      return false;
    }
    if (!formData.age || isNaN(parseInt(formData.age, 10))) {
      Alert.alert(t('error'), t('enter_age'));
      return false;
    }
    if (!formData.type) {
      Alert.alert(t('error'), t('select_type'));
      return false;
    }
    if (!formData.village.trim()) {
      Alert.alert(t('error'), t('enter_village'));
      return false;
    }
    
    // Validate pregnancy details
    if (formData.type === 'pregnant') {
      if (!formData.lmp_date) {
        Alert.alert(t('error'), t('enter_lmp_date'));
        return false;
      }
      if (!formData.gravida || isNaN(parseInt(formData.gravida, 10))) {
        Alert.alert(t('error'), t('enter_gravida'));
        return false;
      }
      if (!formData.parity || isNaN(parseInt(formData.parity, 10))) {
        Alert.alert(t('error'), t('enter_parity'));
        return false;
      }
    }
    
    // Validate child details
    if (formData.type === 'child') {
      if (!formData.dob) {
        Alert.alert(t('error'), t('enter_dob'));
        return false;
      }
      if (!formData.weight || isNaN(parseFloat(formData.weight))) {
        Alert.alert(t('error'), t('enter_weight'));
        return false;
      }
      if (!formData.parent_name.trim()) {
        Alert.alert(t('error'), t('enter_parent_name'));
        return false;
      }
    }
    
    return true;
  };

  const handleTypeSelect = (type) => {
    console.log('Selected type:', type);
    setSelectedType(type);
    setFormData(prev => ({ ...prev, type }));
  };

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);

  useEffect(() => {
    // Set up notifications when component mounts
    setupNotificationCheck();
  }, []);

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setFormData(prev => ({
        ...prev,
        [datePickerField]: date.toISOString().split('T')[0]
      }));
    }
  };

  const showDatePickerFor = (field) => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    console.log('Saving form data:', formData);
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create basic patient record
      const patientData = {
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        type: formData.type,
        village: formData.village.trim(),
        health_id: formData.health_id.trim() || null,
        language: i18n.language || 'en',
        phone: formData.phone.trim() || null,
        aadhar: formData.aadhar.trim() || null,
      };

      // Add type-specific fields
      if (formData.type === 'child') {
        patientData.dob = formData.dob;
      }

      // Create patient
      const patientId = await PatientService.createPatient(patientData);
      console.log('Patient created, id=', patientId);

      // Create schedules based on patient type (non-blocking, log errors)
      try {
        if (formData.type === 'pregnant') {
          await createPregnancySchedule(
            patientId,
            formData.lmp_date
          );
        } else if (formData.type === 'child') {
          await createImmunizationSchedule(
            patientId,
            formData.dob
          );
        }
      } catch (schedErr) {
        // Log schedule creation error but don't block the user flow
        console.warn('Schedule creation failed for patient', patientId, schedErr.message || schedErr);
      }

      Alert.alert(t('success'), t('patient_added'), [
        { text: t('ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error saving patient:', e);
      Alert.alert(t('error'), t('failed_save') + ': ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    console.log('Manual sync triggered from UI');
    try {
      await syncManager.syncData();
      Alert.alert(t('success'), 'Sync completed (check logs for details)');
    } catch (e) {
      console.warn('Manual sync failed:', e);
      Alert.alert(t('error'), 'Sync failed: ' + (e.message || String(e)));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.syncRow}>
          <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>{t('name')} *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder={t('name')}
        />

        <Text style={styles.label}>{t('age')} *</Text>
        <TextInput
          style={styles.input}
          value={formData.age}
          onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
          placeholder={t('age')}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('type')} *</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'pregnant' && styles.selectedType]}
            onPress={() => handleTypeSelect('pregnant')}
          >
            <Text style={[styles.typeButtonText, selectedType === 'pregnant' && styles.selectedTypeText]}>
              {t('pregnant')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'lactating' && styles.selectedType]}
            onPress={() => handleTypeSelect('lactating')}
          >
            <Text style={[styles.typeButtonText, selectedType === 'lactating' && styles.selectedTypeText]}>
              {t('lactating')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'child' && styles.selectedType]}
            onPress={() => handleTypeSelect('child')}
          >
            <Text style={[styles.typeButtonText, selectedType === 'child' && styles.selectedTypeText]}>
              {t('child')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('village')} *</Text>
        <TextInput
          style={styles.input}
          value={formData.village}
          onChangeText={(text) => setFormData(prev => ({ ...prev, village: text }))}
          placeholder={t('village')}
        />

        <Text style={styles.label}>{t('health_id')}</Text>
        <TextInput
          style={styles.input}
          value={formData.health_id}
          onChangeText={(text) => setFormData(prev => ({ ...prev, health_id: text }))}
          placeholder={t('health_id') + ' (' + t('optional') + ')'}
        />

        <Text style={styles.label}>{t('phone')}</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
          placeholder={t('phone') + ' (' + t('optional') + ')'}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>{t('aadhar')}</Text>
        <TextInput
          style={styles.input}
          value={formData.aadhar}
          onChangeText={(text) => setFormData(prev => ({ ...prev, aadhar: text }))}
          placeholder={t('aadhar') + ' (' + t('optional') + ')'}
          keyboardType="numeric"
        />

        {/* Pregnancy-specific fields */}
        {selectedType === 'pregnant' && (
          <View>
            <Text style={styles.sectionTitle}>{t('pregnancy_details')}</Text>
            
            <Text style={styles.label}>{t('lmp_date')} *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor('lmp_date')}
            >
              <Text style={styles.dateButtonText}>
                {formData.lmp_date || t('select_date')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>{t('gravida')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.gravida}
              onChangeText={(text) => setFormData(prev => ({ ...prev, gravida: text }))}
              placeholder={t('gravida')}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('parity')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.parity}
              onChangeText={(text) => setFormData(prev => ({ ...prev, parity: text }))}
              placeholder={t('parity')}
              keyboardType="numeric"
            />

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.checkbox, formData.high_risk && styles.checkboxChecked]}
                onPress={() => setFormData(prev => ({ ...prev, high_risk: !prev.high_risk }))}
              />
              <Text style={styles.checkboxLabel}>{t('high_risk_pregnancy')}</Text>
            </View>
          </View>
        )}

        {/* Child-specific fields */}
        {selectedType === 'child' && (
          <View>
            <Text style={styles.sectionTitle}>{t('child_details')}</Text>

            <Text style={styles.label}>{t('date_of_birth')} *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor('dob')}
            >
              <Text style={styles.dateButtonText}>
                {formData.dob || t('select_date')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>{t('birth_weight')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
              placeholder={t('weight_in_kg')}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t('parent_name')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.parent_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, parent_name: text }))}
              placeholder={t('parent_name')}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>{loading ? t('saving') : t('save')}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#34495e',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedType: {
    backgroundColor: '#3498db',
  },
  typeButtonText: {
    color: '#3498db',
    fontWeight: '600',
  },
  selectedTypeText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    color: '#34495e',
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3498db',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#34495e',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default NewAddPatientScreen;
