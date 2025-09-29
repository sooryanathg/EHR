import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { VisitService } from '../database/visitService';

const AddVisitScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'general',
    date: new Date().toISOString().split('T')[0],
    bp_systolic: '',
    bp_diastolic: '',
    weight: '',
    notes: '',
    next_visit: ''
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const visitData = {
        ...formData,
        patient_id: patient.id,
        date: new Date().toISOString().split('T')[0],
        bp_systolic: formData.bp_systolic ? parseInt(formData.bp_systolic) : null,
        bp_diastolic: formData.bp_diastolic ? parseInt(formData.bp_diastolic) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };

      await VisitService.createVisit(visitData);
      navigation.goBack();
      Alert.alert('Success', 'Visit added successfully');
    } catch (error) {
      console.error('Error saving visit:', error);
      Alert.alert('Error', 'Failed to save visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Visit</Text>
        <Text style={styles.patientName}>{patient.name}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Visit Type</Text>
          <View style={styles.radioGroup}>
            {['general', 'anc', 'immunization'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioButton,
                  formData.type === type && styles.radioButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, type }))}
              >
                <Text style={[
                  styles.radioText,
                  formData.type === type && styles.radioTextSelected
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Pressure</Text>
          <View style={styles.bpContainer}>
            <View style={styles.bpInput}>
              <Text style={styles.bpLabel}>Systolic</Text>
              <TextInput
                style={styles.input}
                value={formData.bp_systolic}
                onChangeText={(value) => setFormData(prev => ({ ...prev, bp_systolic: value }))}
                placeholder="120"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.bpInput}>
              <Text style={styles.bpLabel}>Diastolic</Text>
              <TextInput
                style={styles.input}
                value={formData.bp_diastolic}
                onChangeText={(value) => setFormData(prev => ({ ...prev, bp_diastolic: value }))}
                placeholder="80"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={formData.weight}
            onChangeText={(value) => setFormData(prev => ({ ...prev, weight: value }))}
            placeholder="Enter weight"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => setFormData(prev => ({ ...prev, notes: value }))}
            placeholder="Enter visit notes..."
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Next Visit Date</Text>
          <TextInput
            style={styles.input}
            value={formData.next_visit}
            onChangeText={(value) => setFormData(prev => ({ ...prev, next_visit: value }))}
            placeholder="YYYY-MM-DD"
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
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Visit'}</Text>
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
  patientName: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  form: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  radioButtonSelected: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  radioText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  radioTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
  bpContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 5,
  },
  bpInput: {
    flex: 1,
  },
  bpLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 6,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3498db',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AddVisitScreen;
