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
import VoiceInput from '../components/VoiceInput';

const AddPatientScreen = ({ navigation }) => {
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
    setSelectedType(type);
    setFormData(prev => ({ ...prev, type }));
  };

  const handleSave = async () => {
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
      <View style={styles.header}>
        <Text style={styles.title}>Add New Patient</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Patient Name *</Text>
          <VoiceInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
            placeholder="Enter patient name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            onChangeText={(value) => setFormData(prev => ({ ...prev, age: value }))}
            placeholder="Enter age"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Village *</Text>
          <VoiceInput
            style={styles.input}
            value={formData.village}
            onChangeText={(value) => setFormData(prev => ({ ...prev, village: value }))}
            placeholder="Enter village name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Health ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.health_id}
            onChangeText={(value) => setFormData(prev => ({ ...prev, health_id: value }))}
            placeholder="Enter health ID"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Patient</Text>
          </TouchableOpacity>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3498db',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AddPatientScreen;
