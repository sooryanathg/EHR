import React, { useState } from 'react';
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
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    type: '',
    village: '',
    health_id: ''
  });

  const [selectedType, setSelectedType] = useState(null);

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter patient name');
      return false;
    }
    if (!formData.age || isNaN(parseInt(formData.age, 10))) {
      Alert.alert('Error', 'Please enter valid age');
      return false;
    }
    if (!formData.type) {
      Alert.alert('Error', 'Please select patient type');
      return false;
    }
    if (!formData.village.trim()) {
      Alert.alert('Error', 'Please enter village name');
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

    try {
      await PatientService.createPatient({
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        type: formData.type,
        village: formData.village.trim(),
        health_id: formData.health_id.trim() || null,
        language: 'en',
      });

      Alert.alert('Success', 'Patient added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error saving patient:', e);
      Alert.alert('Error', 'Failed to save patient');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Patient Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter patient name"
        />

        <Text style={styles.label}>Age *</Text>
        <TextInput
          style={styles.input}
          value={formData.age}
          onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
          placeholder="Enter age"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Patient Type *</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'pregnant' && styles.selectedType
            ]}
            onPress={() => handleTypeSelect('pregnant')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'pregnant' && styles.selectedTypeText
            ]}>Pregnant Woman</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'lactating' && styles.selectedType
            ]}
            onPress={() => handleTypeSelect('lactating')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'lactating' && styles.selectedTypeText
            ]}>Lactating Woman</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'child' && styles.selectedType
            ]}
            onPress={() => handleTypeSelect('child')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'child' && styles.selectedTypeText
            ]}>Child</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Village *</Text>
        <TextInput
          style={styles.input}
          value={formData.village}
          onChangeText={(text) => setFormData(prev => ({ ...prev, village: text }))}
          placeholder="Enter village name"
        />

        <Text style={styles.label}>Health ID</Text>
        <TextInput
          style={styles.input}
          value={formData.health_id}
          onChangeText={(text) => setFormData(prev => ({ ...prev, health_id: text }))}
          placeholder="Enter health ID (optional)"
        />

        <TouchableOpacity 
          style={[styles.saveButton, !selectedType && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!selectedType}
        >
          <Text style={styles.saveButtonText}>Save Patient</Text>
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
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#2c3e50',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeContainer: {
    flexDirection: 'column',
    marginBottom: 15,
  },
  typeButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedType: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  selectedTypeText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewAddPatientScreen;