import React, { useState, useEffect } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from './src/i18n/en.json';
import hi from './src/i18n/hi.json';
import ta from './src/i18n/ta.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { initDatabase } from './src/database/schema';
import LoginScreen from './src/auth/LoginScreen';
import PatientListScreen from './src/screens/NewPatientListScreen';
import AddPatientScreen from './src/screens/NewAddPatientScreen';
import PatientProfileScreen from './src/screens/PatientProfileScreen';
import AddVisitScreen from './src/screens/AddVisitScreen';
import AddVaccinationScreen from './src/screens/AddVaccinationScreen';


// i18n initialization
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.loadingText}>Loading ASHA-EHR...</Text>
    </View>
  );
}


export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initDatabase()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Load persisted language and set i18n
  useEffect(() => {
    (async () => {
      try {
        const lng = await AsyncStorage.getItem('@app_language');
        if (lng) {
          await i18n.changeLanguage(lng);
        }
      } catch (e) {
        console.warn('Failed to load language', e);
      }
    })();
  }, []);

  // Helper to change language and persist
  const changeLanguage = async (lng) => {
    try {
      await i18n.changeLanguage(lng);
      await AsyncStorage.setItem('@app_language', lng);
    } catch (e) {
      console.warn('Failed to change language', e);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator 
                initialRouteName="Login"
                screenOptions={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#fff' },
                  headerTintColor: '#2c3e50',
                }}
              >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="PatientList" component={PatientListScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AddPatient" component={AddPatientScreen} />
              <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
              <Stack.Screen name="AddVisit" component={AddVisitScreen} />
              <Stack.Screen name="AddVaccination" component={AddVaccinationScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SafeAreaView>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#7f8c8d',
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
  },
  languageLabel: {
    marginRight: 8,
    color: '#333',
  },
  langButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  langText: {
    color: '#333',
  },
  langTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
});