import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import VoiceInput from '../components/VoiceInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VisitService } from '../database/visitService';
import { useTranslation } from 'react-i18next';

const AddVisitScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'general',
    date: new Date().toISOString().split('T')[0],
    bp_systolic: '',
    bp_diastolic: '',
    weight: '',
    notes: '',
    medicines: '',
    next_visit: ''
  });
  const [showVisitPicker, setShowVisitPicker] = useState(false);
  const [showNextVisitPicker, setShowNextVisitPicker] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      const visitData = {
        ...formData,
        patient_id: patient.id,
        date: formData.date || new Date().toISOString().split('T')[0],
        bp_systolic: formData.bp_systolic ? parseInt(formData.bp_systolic) : null,
        bp_diastolic: formData.bp_diastolic ? parseInt(formData.bp_diastolic) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        medicines_given: formData.medicines
          ? formData.medicines.split('\n').map(s => s.trim()).filter(Boolean)
          : null
      };

      await VisitService.createAndQueueVisit(visitData);
      navigation.goBack();
      Alert.alert(t('success'), t('visit_added_success'));
    } catch (error) {
      console.error('Error saving visit:', error);
      Alert.alert(t('error'), t('visit_add_error'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const year = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const onVisitChange = (event, selectedDate) => {
    setShowVisitPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: formatDate(selectedDate) }));
    }
  };

  const onNextVisitChange = (event, selectedDate) => {
    setShowNextVisitPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({ ...prev, next_visit: formatDate(selectedDate) }));
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
            <Text style={styles.headerTitle}>{t('add_visit')}</Text>
            <Text style={styles.headerSubtitle}>{patient.name}</Text>
          </View>

          <View style={styles.formCard}>
            {/* Visit Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('visit_type')}</Text>
              <View style={styles.radioGroup}>
                {['general', 'anc', 'immunization'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.radioButton,
                      formData.type === type && styles.radioButtonSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.radioText,
                        formData.type === type && styles.radioTextSelected
                      ]}
                    >
                      {type === 'general'
                        ? t('visit_type_general')
                        : type === 'anc'
                        ? t('visit_type_anc')
                        : t('visit_type_immunization')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Visit Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('visit_date')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowVisitPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateInputIcon}>📅</Text>
                <Text style={styles.dateText}>{formData.date || 'YYYY-MM-DD'}</Text>
              </TouchableOpacity>
              {showVisitPicker && (
                <DateTimePicker
                  value={
                    new Date(formData.date || new Date().toISOString().split('T')[0])
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={onVisitChange}
                />
              )}
            </View>

            {/* BP Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('blood_pressure')}</Text>
              <View style={styles.bpContainer}>
                <View style={styles.bpInput}>
                  <Text style={styles.bpLabel}>{t('systolic')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.bp_systolic}
                    onChangeText={(value) =>
                      setFormData(prev => ({ ...prev, bp_systolic: value }))
                    }
                    placeholder="120"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.bpInput}>
                  <Text style={styles.bpLabel}>{t('diastolic')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.bp_diastolic}
                    onChangeText={(value) =>
                      setFormData(prev => ({ ...prev, bp_diastolic: value }))
                    }
                    placeholder="80"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('weight_kg')}</Text>
              <TextInput
                style={styles.input}
                value={formData.weight}
                onChangeText={(value) => setFormData(prev => ({ ...prev, weight: value }))}
                placeholder={t('enter_weight_placeholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('notes')}</Text>
              <VoiceInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(value) => setFormData(prev => ({ ...prev, notes: value }))}
                placeholder={t('enter_visit_notes_placeholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Medicines */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medicines given (one per line)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.medicines}
                onChangeText={(value) => setFormData(prev => ({ ...prev, medicines: value }))}
                placeholder={'Paracetamol 250mg\nORS 1 sachet'}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Next Visit */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('next_visit_date')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowNextVisitPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateInputIcon}>📅</Text>
                <Text style={styles.dateText}>
                  {formData.next_visit || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
              {showNextVisitPicker && (
                <DateTimePicker
                  value={formData.next_visit ? new Date(formData.next_visit) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={onNextVisitChange}
                />
              )}
            </View>

            {/* Buttons */}
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
                <Text style={styles.saveButtonText} adjustsFontSizeToFit>
                  {loading ? t('saving') : t('save_visit')}
                </Text>
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
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  radioButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  radioText: {
    fontSize: 13,
    color: '#6B7280',
  },
  radioTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
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
  },
  bpContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  bpInput: {
    flex: 1,
  },
  bpLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
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
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default AddVisitScreen;
