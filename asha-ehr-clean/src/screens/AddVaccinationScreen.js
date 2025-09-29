import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { VaccinationService } from '../database/vaccinationService';

const AddVaccinationScreen = ({ route, navigation }) => {
    const { patient } = route.params;
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineBatch, setVaccineBatch] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddVaccination = async () => {
    if (!vaccineName.trim()) {
      Alert.alert('Error', 'Please enter the vaccine name');
      return;
    }

    try {
      const vaccination = {
        patient_id: patient.id,
        vaccine_name: vaccineName.trim(),
        due_date: new Date().toISOString().split('T')[0],
        given_date: new Date().toISOString().split('T')[0],
        status: 'given'
      };

      await VaccinationService.createVaccination(vaccination);
      Alert.alert('Success', 'Vaccination record added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding vaccination:', error);
      Alert.alert('Error', 'Failed to add vaccination record');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Vaccine Name *</Text>
        <TextInput
          style={styles.input}
          value={vaccineName}
          onChangeText={setVaccineName}
          placeholder="Enter vaccine name"
        />

        <Text style={styles.label}>Batch Number</Text>
        <TextInput
          style={styles.input}
          value={vaccineBatch}
          onChangeText={setVaccineBatch}
          placeholder="Enter batch number"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter any additional notes"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.button} onPress={handleAddVaccination}>
          <Text style={styles.buttonText}>Add Vaccination</Text>
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