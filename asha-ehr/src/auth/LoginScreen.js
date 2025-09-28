import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { AuthService } from './authService';

const LoginScreen = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const isLoggedIn = await AuthService.isLoggedIn();
    if (isLoggedIn) {
      const role = await AuthService.getUserRole();
      // Both ASHA and PHC staff will use PatientList in mobile app
      navigation.replace('PatientList');
    }
  };

  const handleASHA_Login = async () => {
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter a valid PIN');
      return;
    }

    setLoading(true);
    const isValid = await AuthService.verifyASHA_PIN(pin);
    setLoading(false);

    if (isValid) {
      navigation.replace('PatientList');
    } else {
      Alert.alert('Error', 'Invalid PIN');
    }
  };



  const handleFirstTimeSetup = async () => {
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter a PIN with at least 4 digits');
      return;
    }

    setLoading(true);
    const success = await AuthService.setASHA_PIN(pin);
    setLoading(false);

    if (success) {
      Alert.alert('Success', 'PIN set successfully!');
      navigation.replace('PatientList');
    } else {
      Alert.alert('Error', 'Failed to set PIN');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>ASHA EHR</Text>
        <Text style={styles.subtitle}>Community Health Management</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Enter PIN</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="Enter your PIN"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
        />
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleASHA_Login}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.setupButton}
          onPress={handleFirstTimeSetup}
          disabled={loading}
        >
          <Text style={styles.setupButtonText}>First Time Setup</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },

  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  setupButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  setupButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;

