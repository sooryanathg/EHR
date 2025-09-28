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
import { PatientService } from '../database/patientService';

const AddPatientScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    village: '',
    health_id: '',
    type: 'pregnant',
    language: 'en'
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter patient name');
      return false;
    }
    if (!formData.age || isNaN(formData.age) || formData.age < 0 || formData.age > 120) {
      Alert.alert('Error', 'Please enter a valid age');
      return false;
    }
    if (!formData.village.trim()) {
      Alert.alert('Error', 'Please enter village name');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const patientData = {
        ...formData,
        age: parseInt(formData.age),
        health_id: formData.health_id.trim() || null
      };

      const patientId = await PatientService.createPatient(patientData);
      
      Alert.alert(
        'Success',
        'Patient added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error adding patient:', error);
      Alert.alert('Error', 'Failed to add patient');
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
          <Text style={styles.title}>Add New Patient</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter patient name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            onChangeText={(value) => handleInputChange('age', value)}
            placeholder="Enter age"
            keyboardType="numeric"
            maxLength={3}
          />

          <Text style={styles.label}>Village *</Text>
          <TextInput
            style={styles.input}
            value={formData.village}
            onChangeText={(value) => handleInputChange('village', value)}
            placeholder="Enter village name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Health ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.health_id}
            onChangeText={(value) => handleInputChange('health_id', value)}
            placeholder="Enter health ID if available"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Patient Type *</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'pregnant' && styles.activeTypeButton
              ]}
              onPress={() => handleInputChange('type', 'pregnant')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'pregnant' && styles.activeTypeButtonText
              ]}>
                Pregnant Woman
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'child' && styles.activeTypeButton
              ]}
              onPress={() => handleInputChange('type', 'child')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.type === 'child' && styles.activeTypeButtonText
              ]}>
                Child
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Language</Text>
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                formData.language === 'en' && styles.activeLanguageButton
              ]}
              onPress={() => handleInputChange('language', 'en')}
            >
              <Text style={[
                styles.languageButtonText,
                formData.language === 'en' && styles.activeLanguageButtonText
              ]}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                formData.language === 'hi' && styles.activeLanguageButton
              ]}
              onPress={() => handleInputChange('language', 'hi')}
            >
              <Text style={[
                styles.languageButtonText,
                formData.language === 'hi' && styles.activeLanguageButtonText
              ]}>
                हिंदी
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding...' : 'Add Patient'}
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
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeTypeButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeLanguageButton: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  languageButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeLanguageButtonText: {
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

export default AddPatientScreen;

