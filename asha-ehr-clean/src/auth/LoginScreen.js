import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { AuthService } from './authService';

const LoginScreen = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [isPinSet, setIsPinSet] = useState(false);

  useEffect(() => {
    checkExistingPin();
  }, []);

  const checkExistingPin = async () => {
    try {
      const hasPin = await AuthService.isPINSet();
      console.log('PIN status:', hasPin);
      setIsPinSet(hasPin);
    } catch (error) {
      console.error('Error checking PIN:', error);
    }
  };

  const handleLogin = async () => {
    console.log('Login attempt with PIN:', pin);
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter a valid PIN');
      return;
    }
    
    try {
      const isValid = await AuthService.verifyASHA_PIN(pin);
      console.log('PIN verification result:', isValid);
      if (isValid) {
        navigation.replace('PatientList');
      } else {
        Alert.alert('Error', 'Invalid PIN');
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to verify PIN');
    }
  };

  const handleFirstTimeSetup = async () => {
    console.log('First time setup with PIN:', pin);
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter a PIN with at least 4 digits');
      return;
    }
    
    try {
      const success = await AuthService.setASHA_PIN(pin);
      console.log('PIN setup result:', success);
      if (success) {
        Alert.alert('Success', 'PIN set successfully');
        navigation.replace('PatientList');
      } else {
        Alert.alert('Error', 'Failed to set PIN');
        setPin('');
      }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to set up PIN');
    }
    
    Alert.alert('Success', 'PIN set successfully!', [
      { text: 'OK', onPress: () => navigation.replace('PatientList') }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ASHA EHR</Text>
          <Text style={styles.subtitle}>Community Health Management</Text>
        </View>

        <View style={styles.form}>
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
            style={[styles.button, styles.loginButton]}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Login as ASHA Worker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.setupButton]}
            onPress={handleFirstTimeSetup}
          >
            <Text style={styles.setupButtonText}>First Time Setup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#3498db',
  },
  setupButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  setupButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
