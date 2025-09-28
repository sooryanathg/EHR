import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { VisitService } from '../database/visitService';
import { NotificationService } from '../services/notificationService';

const AddVisitScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'anc',
    bp_systolic: '',
    bp_diastolic: '',
    weight: '',
    notes: '',
    next_visit: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.date) {
      Alert.alert(t('common.error'), 'Please select visit date');
      return false;
    }
    if (formData.bp_systolic && (isNaN(formData.bp_systolic) || formData.bp_systolic < 50 || formData.bp_systolic > 250)) {
      Alert.alert(t('common.error'), 'Please enter valid systolic BP (50-250)');
      return false;
    }
    if (formData.bp_diastolic && (isNaN(formData.bp_diastolic) || formData.bp_diastolic < 30 || formData.bp_diastolic > 150)) {
      Alert.alert(t('common.error'), 'Please enter valid diastolic BP (30-150)');
      return false;
    }
    if (formData.weight && (isNaN(formData.weight) || formData.weight < 0 || formData.weight > 200)) {
      Alert.alert(t('common.error'), 'Please enter valid weight (0-200 kg)');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const visitData = {
        patient_id: patient.id,
        date: formData.date,
        type: formData.type,
        bp_systolic: formData.bp_systolic ? parseInt(formData.bp_systolic) : null,
        bp_diastolic: formData.bp_diastolic ? parseInt(formData.bp_diastolic) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes.trim() || null,
        next_visit: formData.next_visit || null
      };

      const visitId = await VisitService.createVisit(visitData);
      
      // Schedule notification for next visit if specified
      if (formData.next_visit) {
        await NotificationService.scheduleVisitReminder(
          patient.name,
          formData.next_visit,
          formData.type
        );
      }
      
      Alert.alert(
        t('common.success'),
        'Visit recorded successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error adding visit:', error);
      Alert.alert(t('common.error'), 'Failed to record visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Visit - {patient.name}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('visits.date')} *</Text>
          <TextInput
            style={styles.input}
            value={formData.date}
            onChangeText={(value) => handleInputChange('date', value)}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>{t('visits.visitType')} *</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'anc' && styles.activeTypeButton
              ]}
              onPress={() => handleInputChange('type', 'anc')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'anc' && styles.activeTypeButtonText
              ]}>
                {t('visits.anc')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'immunization' && styles.activeTypeButton
              ]}
              onPress={() => handleInputChange('type', 'immunization')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'immunization' && styles.activeTypeButtonText
              ]}>
                {t('visits.immunization')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'general' && styles.activeTypeButton
              ]}
              onPress={() => handleInputChange('type', 'general')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'general' && styles.activeTypeButtonText
              ]}>
                {t('visits.general')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t('visits.bpSystolic')}</Text>
          <TextInput
            style={styles.input}
            value={formData.bp_systolic}
            onChangeText={(value) => handleInputChange('bp_systolic', value)}
            placeholder="Enter systolic BP"
            keyboardType="numeric"
            maxLength={3}
          />

          <Text style={styles.label}>{t('visits.bpDiastolic')}</Text>
          <TextInput
            style={styles.input}
            value={formData.bp_diastolic}
            onChangeText={(value) => handleInputChange('bp_diastolic', value)}
            placeholder="Enter diastolic BP"
            keyboardType="numeric"
            maxLength={3}
          />

          <Text style={styles.label}>{t('visits.weight')}</Text>
          <TextInput
            style={styles.input}
            value={formData.weight}
            onChangeText={(value) => handleInputChange('weight', value)}
            placeholder="Enter weight in kg"
            keyboardType="numeric"
            maxLength={6}
          />

          <Text style={styles.label}>{t('visits.notes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            placeholder="Enter visit notes"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>{t('visits.nextVisit')}</Text>
          <TextInput
            style={styles.input}
            value={formData.next_visit}
            onChangeText={(value) => handleInputChange('next_visit', value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? t('common.loading') : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  form: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeTypeButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddVisitScreen;

