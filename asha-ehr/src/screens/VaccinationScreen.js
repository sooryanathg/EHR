import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { VaccinationService } from '../database/vaccinationService';
import { NotificationService } from '../services/notificationService';

const VaccinationScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const { t } = useTranslation();
  const [vaccinations, setVaccinations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    vaccine_name: '',
    due_date: '',
    given_date: '',
    status: 'pending'
  });
  const [loading, setLoading] = useState(false);

  // Common vaccines for children
  const commonVaccines = [
    'BCG',
    'Hepatitis B',
    'DPT',
    'Polio',
    'Measles',
    'MMR',
    'Typhoid',
    'Chickenpox',
    'Hepatitis A',
    'Meningitis'
  ];

  useEffect(() => {
    loadVaccinations();
  }, []);

  const loadVaccinations = async () => {
    try {
      const data = await VaccinationService.getVaccinationsByPatientId(patient.id);
      setVaccinations(data);
    } catch (error) {
      console.error('Error loading vaccinations:', error);
      Alert.alert(t('common.error'), 'Failed to load vaccinations');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.vaccine_name.trim()) {
      Alert.alert(t('common.error'), 'Please enter vaccine name');
      return false;
    }
    if (!formData.due_date) {
      Alert.alert(t('common.error'), 'Please select due date');
      return false;
    }
    if (formData.status === 'given' && !formData.given_date) {
      Alert.alert(t('common.error'), 'Please select given date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const vaccinationData = {
        patient_id: patient.id,
        vaccine_name: formData.vaccine_name.trim(),
        due_date: formData.due_date,
        given_date: formData.given_date || null,
        status: formData.status
      };

      await VaccinationService.createVaccination(vaccinationData);
      
      // Schedule notification if vaccination is pending
      if (formData.status === 'pending') {
        await NotificationService.scheduleVaccinationReminder(
          patient.name,
          formData.vaccine_name,
          formData.due_date
        );
      }
      
      Alert.alert(
        t('common.success'),
        'Vaccination recorded successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAddForm(false);
              setFormData({
                vaccine_name: '',
                due_date: '',
                given_date: '',
                status: 'pending'
              });
              loadVaccinations();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error adding vaccination:', error);
      Alert.alert(t('common.error'), 'Failed to record vaccination');
    } finally {
      setLoading(false);
    }
  };

  const updateVaccinationStatus = async (id, status, givenDate = null) => {
    try {
      await VaccinationService.updateVaccinationStatus(id, status, givenDate);
      loadVaccinations();
    } catch (error) {
      console.error('Error updating vaccination:', error);
      Alert.alert(t('common.error'), 'Failed to update vaccination');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderVaccinationItem = ({ item }) => (
    <View style={styles.vaccinationCard}>
      <View style={styles.vaccinationHeader}>
        <Text style={styles.vaccineName}>{item.vaccine_name}</Text>
        <TouchableOpacity
          style={[
            styles.statusButton,
            { backgroundColor: item.status === 'given' ? '#27ae60' : 
                             item.status === 'overdue' ? '#e74c3c' : '#f39c12' }
          ]}
          onPress={() => {
            if (item.status === 'pending') {
              Alert.alert(
                'Mark as Given',
                'Mark this vaccination as given?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Mark Given',
                    onPress: () => updateVaccinationStatus(item.id, 'given', new Date().toISOString().split('T')[0])
                  }
                ]
              );
            }
          }}
        >
          <Text style={styles.statusButtonText}>
            {item.status.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.vaccinationDetail}>
        Due: {formatDate(item.due_date)}
      </Text>
      {item.given_date && (
        <Text style={styles.vaccinationDetail}>
          Given: {formatDate(item.given_date)}
        </Text>
      )}
    </View>
  );

  if (showAddForm) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowAddForm(false)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Vaccination - {patient.name}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('vaccinations.vaccineName')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.vaccine_name}
              onChangeText={(value) => handleInputChange('vaccine_name', value)}
              placeholder="Enter vaccine name"
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Quick Select:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSelect}>
              {commonVaccines.map((vaccine) => (
                <TouchableOpacity
                  key={vaccine}
                  style={styles.quickSelectButton}
                  onPress={() => handleInputChange('vaccine_name', vaccine)}
                >
                  <Text style={styles.quickSelectText}>{vaccine}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>{t('vaccinations.dueDate')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.due_date}
              onChangeText={(value) => handleInputChange('due_date', value)}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>{t('vaccinations.status')} *</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status === 'pending' && styles.activeStatusButton
                ]}
                onPress={() => handleInputChange('status', 'pending')}
              >
                <Text style={[
                  styles.statusButtonText,
                  formData.status === 'pending' && styles.activeStatusButtonText
                ]}>
                  {t('vaccinations.pending')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status === 'given' && styles.activeStatusButton
                ]}
                onPress={() => handleInputChange('status', 'given')}
              >
                <Text style={[
                  styles.statusButtonText,
                  formData.status === 'given' && styles.activeStatusButtonText
                ]}>
                  {t('vaccinations.given')}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.status === 'given' && (
              <>
                <Text style={styles.label}>{t('vaccinations.givenDate')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.given_date}
                  onChangeText={(value) => handleInputChange('given_date', value)}
                  placeholder="YYYY-MM-DD"
                />
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddForm(false)}
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
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vaccinations - {patient.name}</Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddForm(true)}
      >
        <Text style={styles.addButtonText}>+ Add Vaccination</Text>
      </TouchableOpacity>

      <FlatList
        data={vaccinations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVaccinationItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('vaccinations.noVaccinations')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    color: '#3498db',
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#3498db',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  quickSelect: {
    marginBottom: 16,
  },
  quickSelectButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickSelectText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  activeStatusButton: {
    backgroundColor: '#3498db',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  activeStatusButtonText: {
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
  listContainer: {
    padding: 20,
  },
  vaccinationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vaccinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaccineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  vaccinationDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default VaccinationScreen;

