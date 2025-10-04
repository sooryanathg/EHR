import React, { useState, useEffect } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import en from './src/i18n/en.json';
import hi from './src/i18n/hi.json';
import ta from './src/i18n/ta.json';
import ml from './src/i18n/ml.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView as RN_SafeAreaView, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/utils/toastConfig';
// Try to load react-native-safe-area-context at runtime; fall back to RN's SafeAreaView if unavailable
let SafeAreaProvider = null;
let SafeAreaView = RN_SafeAreaView;
try {
  // eslint-disable-next-line global-require
  const safe = require('react-native-safe-area-context');
  SafeAreaProvider = safe.SafeAreaProvider;
  SafeAreaView = safe.SafeAreaView || RN_SafeAreaView;
} catch (e) {
  // If the package isn't available at runtime (Expo Go limitations), we'll use RN SafeAreaView
}
import { initDatabase } from './src/database/schema';
import LoginScreen from './src/auth/LoginScreen';
import PatientListScreen from './src/screens/NewPatientListScreen';
import AddPatientScreen from './src/screens/NewAddPatientScreen';
import PatientProfileScreen from './src/screens/PatientProfileScreen';
import AddVisitScreen from './src/screens/AddVisitScreen';
import AddVaccinationScreen from './src/screens/AddVaccinationScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import TodayVisitsScreen from './src/screens/TodayVisitsScreen';
import ScheduleVisitScreen from './src/screens/ScheduleVisitScreen';
import NetInfo from '@react-native-community/netinfo';
import { syncManager } from './src/services/syncManager';
import { auth } from './src/lib/firebase';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request notification permissions
async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus;
}

// i18n initialization
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      ml: { translation: ml },
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
    let unsubscribeFn = null;
    async function initAll() {
      try {
        // Initialize notifications first
        await registerForPushNotificationsAsync();

        // Initialize database
        await initDatabase();

        // After DB is ready, set up connectivity listener for sync
        let wasConnected = false;
        const unsub = NetInfo.addEventListener((state) => {
          const isConnected = Boolean(state.isConnected && state.isInternetReachable);
          if (!wasConnected && isConnected) {
            try {
              syncManager.syncData().catch((e) => console.warn('Background sync failed:', e));
            } catch (e) {
              console.warn('Error invoking syncManager:', e);
            }
          }
          wasConnected = isConnected;
        });

        // Normalize unsubscribe function
        if (typeof unsub === 'function') unsubscribeFn = unsub;
        else if (unsub && typeof unsub.remove === 'function') unsubscribeFn = () => unsub.remove();

        // Listen for auth state changes to trigger sync when user signs in
        try {
          const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
              console.log('Firebase user signed in:', user.uid);
              // trigger sync for deferred items
              syncManager.syncData().catch((e) => console.warn('Sync after sign-in failed:', e));
            } else {
              console.log('No Firebase user');
            }
          });
          // Merge cleanup
          const prevUnsub = unsubscribeFn;
          unsubscribeFn = () => {
            if (prevUnsub) prevUnsub();
            if (unsubscribeAuth) unsubscribeAuth();
          };
        } catch (e) {
          console.warn('Failed to add auth state listener', e);
        }
      } catch (error) {
        console.warn('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initAll();

    return () => {
      try {
        if (unsubscribeFn) unsubscribeFn();
      } catch (e) {
        // ignore errors during cleanup
      }
    };
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

  const AppContent = (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator 
                initialRouteName="Login"
                screenOptions={{
                  headerShown: false // Disable default headers globally
                }}
              >
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#fff' },
                  headerTintColor: '#2c3e50',
                }}
              />
              <Stack.Screen name="PatientList" component={PatientListScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AddPatient" component={AddPatientScreen} />
              <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
              <Stack.Screen name="AddVisit" component={AddVisitScreen} />
              <Stack.Screen name="AddVaccination" component={AddVaccinationScreen} />
              <Stack.Screen name="Reminders" component={RemindersScreen} />
              <Stack.Screen name="TodayVisits" component={TodayVisitsScreen} />
              <Stack.Screen name="ScheduleVisit" component={ScheduleVisitScreen} />
            </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaView>
  );

  return (
    <I18nextProvider i18n={i18n}>
      {SafeAreaProvider ? <SafeAreaProvider>{AppContent}</SafeAreaProvider> : AppContent}
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