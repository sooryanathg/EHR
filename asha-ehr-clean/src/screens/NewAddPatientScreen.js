import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PatientService } from '../database/patientService';
import { syncManager } from '../services/syncManager';
import {
  createPregnancySchedule,
  createImmunizationSchedule,
  setupNotificationCheck,
} from '../database/scheduleService';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { showSuccess, showError } from '../utils/alerts';
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
    lmp_date: '',
    gravida: '1',
    parity: '0',
    high_risk: false,
    dob: '',
    weight: '',
    parent_name: '',
  });

  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);

  useEffect(() => {
    setupNotificationCheck();
  }, []);

  const validateForm = () => {
    if (!formData.name.trim()) return showError('enter_name');
    if (!formData.age || isNaN(parseInt(formData.age, 10))) return showError('enter_age');
    if (!formData.type) return showError('select_type');
    if (!formData.village.trim()) return showError('enter_village');

    if (formData.type === 'pregnant') {
      if (!formData.lmp_date) return showError('enter_lmp_date');
      if (!formData.gravida || isNaN(parseInt(formData.gravida, 10)))
        return showError('enter_gravida');
      if (!formData.parity || isNaN(parseInt(formData.parity, 10)))
        return showError('enter_parity');
    }

    if (formData.type === 'child') {
      if (!formData.dob) return showError('enter_dob');
      if (!formData.weight || isNaN(parseFloat(formData.weight))) return showError('enter_weight');
      if (!formData.parent_name.trim()) return showError('enter_parent_name');
    }

    return true;
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setFormData((prev) => ({ ...prev, type }));
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setFormData((prev) => ({
        ...prev,
        [datePickerField]: date.toISOString().split('T')[0],
      }));
    }
  };

  const showDatePickerFor = (field) => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
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

      if (formData.type === 'child') patientData.dob = formData.dob;

      const patientId = await PatientService.createPatient(patientData);
      console.log('Patient created, id=', patientId);

      try {
        if (formData.type === 'pregnant') {
          await createPregnancySchedule(patientId, formData.lmp_date);
        } else if (formData.type === 'child') {
          await createImmunizationSchedule(patientId, formData.dob);
        }
      } catch (schedErr) {
        console.warn('Schedule creation failed:', schedErr.message || schedErr);
      }

      showSuccess('patient_added', {
        buttons: [{ text: t('ok'), onPress: () => navigation.goBack() }],
      });
    } catch (e) {
      console.error('Error saving patient:', e);
      showError('failed_save', { message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      await syncManager.syncData();
      showSuccess('sync_completed', { message: 'Check logs for details' });
    } catch (e) {
      console.warn('Manual sync failed:', e);
      showError('sync_failed', { message: e.message || String(e) });
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
            <Text style={styles.headerTitle}>{t('add_patient') || 'Add Patient'}</Text>
            <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </TouchableOpacity>
          </View>

      <View style={styles.formCard}>
        {/* Common Fields */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('name')} *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
            placeholder={t('name')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('age')} *</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, age: text }))}
            placeholder={t('age')}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('type')} *</Text>
          <View style={styles.typeContainer}>
            {['pregnant', 'lactating', 'child', 'general'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, selectedType === type && styles.selectedType]}
                onPress={() => handleTypeSelect(type)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === type && styles.selectedTypeText,
                  ]}
                >
                  {t(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('village')} *</Text>
          <TextInput
            style={styles.input}
            value={formData.village}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, village: text }))}
            placeholder={t('village')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('health_id')}</Text>
          <TextInput
            style={styles.input}
            value={formData.health_id}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, health_id: text }))}
            placeholder={`${t('health_id')} (${t('optional')})`}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('phone')}</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
            placeholder={`${t('phone')} (${t('optional')})`}
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('aadhar')}</Text>
          <TextInput
            style={styles.input}
            value={formData.aadhar}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, aadhar: text }))}
            placeholder={`${t('aadhar')} (${t('optional')})`}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        {/* Pregnancy-specific fields */}
        {selectedType === 'pregnant' && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>{t('pregnancy_details')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('lmp_date')} *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => showDatePickerFor('lmp_date')}
                activeOpacity={0.7}
              >
                <Text style={styles.dateInputIcon}>📅</Text>
                <Text style={styles.dateText}>
                  {formData.lmp_date || t('select_date')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('gravida')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.gravida}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, gravida: text }))}
                placeholder={t('gravida')}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('parity')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.parity}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, parity: text }))}
                placeholder={t('parity')}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                setFormData((prev) => ({ ...prev, high_risk: !prev.high_risk }))
              }
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, formData.high_risk && styles.checkboxChecked]}>
                {formData.high_risk && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>{t('high_risk_pregnancy')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Child-specific fields */}
        {selectedType === 'child' && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>{t('child_details')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('date_of_birth')} *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => showDatePickerFor('dob')}
                activeOpacity={0.7}
              >
                <Text style={styles.dateInputIcon}>📅</Text>
                <Text style={styles.dateText}>
                  {formData.dob || t('select_date')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('birth_weight')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.weight}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, weight: text }))}
                placeholder={t('weight_in_kg')}
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('parent_name')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.parent_name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, parent_name: text }))}
                placeholder={t('parent_name')}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
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
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loading ? t('saving') : t('save')}
            </Text>
          </TouchableOpacity>
        </View>

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
  syncButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedType: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  typeButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 15,
    textTransform: 'capitalize',
  },
  selectedTypeText: {
    color: '#3B82F6',
    fontWeight: '700',
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
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default NewAddPatientScreen;