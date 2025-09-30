import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PatientService } from '../database/patientService';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';

const NewAddPatientScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const i18n = require('i18next');
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    type: '',
    village: '',
    health_id: ''
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
    return true;
  };

  const handleTypeSelect = (type) => {
    console.log('Selected type:', type);
    setSelectedType(type);
    setFormData(prev => ({ ...prev, type }));
  };

  const handleSave = async () => {
    console.log('Saving form data:', formData);
    if (!validateForm()) return;

    setLoading(true);
    try {
      await PatientService.createPatient({
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        type: formData.type,
        village: formData.village.trim(),
        health_id: formData.health_id.trim() || null,
        language: i18n.language || 'en',
      });

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
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

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>{loading ? t('saving') : t('save')}</Text>
        </TouchableOpacity>
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
});

export default NewAddPatientScreen;
