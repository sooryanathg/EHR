import React, { useState, useEffect, createContext } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView as RN_SafeAreaView, StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';

// Import local files
import en from './src/i18n/en.json';
import hi from './src/i18n/hi.json';
import ta from './src/i18n/ta.json';
import ml from './src/i18n/ml.json';
import { toastConfig } from './src/utils/toastConfig';
import { NavigationStateHelper } from './src/utils/navigationHelper';
import { initDatabase } from './src/database/schema';
import { syncManager } from './src/services/syncManager';
import { auth, db } from './src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

import LoginScreen from './src/auth/LoginScreen';
import PatientListScreen from './src/screens/NewPatientListScreen';
import AddPatientScreen from './src/screens/NewAddPatientScreen';
import PatientProfileScreen from './src/screens/PatientProfileScreen';
import AddVisitScreen from './src/screens/AddVisitScreen';
import AddVaccinationScreen from './src/screens/AddVaccinationScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import TodayVisitsScreen from './src/screens/TodayVisitsScreen';
import ScheduleVisitScreen from './src/screens/ScheduleVisitScreen';

// Create a context for ASHA details
export const AshaContext = createContext(null);

// SafeArea handling
let SafeAreaProvider = null;
let SafeAreaView = RN_SafeAreaView;
try {
  const safe = require('react-native-safe-area-context');
  SafeAreaProvider = safe.SafeAreaProvider;
  SafeAreaView = safe.SafeAreaView || RN_SafeAreaView;
} catch (e) {
  // Fallback to RN SafeAreaView
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
i18n.use(initReactI18next).init({
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
  const [initialRoute, setInitialRoute] = useState('Login');
  const [ashaName, setAshaName] = useState('');

  useEffect(() => {
    let unsubscribeFn = null;

    async function initAll() {
      try {
        await registerForPushNotificationsAsync();
        await initDatabase();

        // Load ASHA name
        try {
          const user = auth.currentUser;
          let name = (await AsyncStorage.getItem('asha_name')) || '';
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data()?.name) {
              name = userDoc.data().name;
              await AsyncStorage.setItem('asha_name', name);
            } else if (user.displayName) {
              name = user.displayName;
              await AsyncStorage.setItem('asha_name', name);
            }
          }
          setAshaName(name || 'ASHA');
        } catch (e) {
          console.warn('Error loading ASHA name:', e);
          setAshaName('ASHA');
        }

        // Session check
        const loginTimestamp = await AsyncStorage.getItem('asha_login_timestamp');
        if (loginTimestamp && Date.now() - parseInt(loginTimestamp, 10) < 7 * 24 * 60 * 60 * 1000) {
          setInitialRoute('PatientList');
        } else {
          await AsyncStorage.removeItem('asha_login_timestamp');
          setInitialRoute('Login');
        }

        // Connectivity listener
        let wasConnected = true;
        const unsub = NetInfo.addEventListener(async (state) => {
          const isConnected = Boolean(state.isConnected && state.isInternetReachable);

          if (wasConnected && !isConnected && auth.currentUser) {
            if (NavigationStateHelper.getCurrentScreen() !== 'Login') {
              Toast.show({
                type: 'info',
                text1: 'Working Offline',
                text2: 'Changes will sync when connection is restored',
                position: 'top',
                autoHide: true,
                visibilityTime: 3000,
              });
            }
          }

          if (!wasConnected && isConnected && auth.currentUser) {
            if (NavigationStateHelper.getCurrentScreen() !== 'Login') {
              Toast.show({
                type: 'info',
                text1: 'Back Online',
                text2: 'Syncing your data...',
                position: 'top',
                autoHide: true,
                visibilityTime: 3000,
              });
            }
            try {
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
              await syncManager.syncData();
              if (NavigationStateHelper.getCurrentScreen() !== 'Login') {
                setTimeout(() => {
                  Toast.show({
                    type: 'success',
                    text1: 'Sync Complete',
                    text2: 'Your data is up to date',
                    position: 'top',
                    autoHide: true,
                    visibilityTime: 2000,
                  });
                }, 1000);
              }
            } catch (e) {
              console.warn('Background sync failed:', e);
              if (NavigationStateHelper.getCurrentScreen() !== 'Login') {
                Toast.show({
                  type: 'error',
                  text1: 'Sync Failed',
                  text2: 'Please try again later',
                  position: 'top',
                  autoHide: true,
                  visibilityTime: 3000,
                });
              }
            }
          }

          wasConnected = isConnected;
        });

        // Cleanup
        unsubscribeFn = typeof unsub === 'function' ? unsub : () => unsub?.remove?.();

        // Auth listener
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
          if (user && NavigationStateHelper.getCurrentScreen() !== 'Login') {
            syncManager.syncData().catch((e) => console.warn('Sync after sign-in failed:', e));
          }
        });

        const prevUnsub = unsubscribeFn;
        unsubscribeFn = () => {
          prevUnsub?.();
          unsubscribeAuth?.();
        };
      } catch (error) {
        console.warn('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initAll();

    return () => {
      unsubscribeFn?.();
    };
  }, []);

  // Language persistence
  useEffect(() => {
    (async () => {
      try {
        const lng = await AsyncStorage.getItem('@app_language');
        if (lng) await i18n.changeLanguage(lng);
      } catch (e) {
        console.warn('Failed to load language', e);
      }
    })();
  }, []);

  const changeLanguage = async (lng) => {
    try {
      await i18n.changeLanguage(lng);
      await AsyncStorage.setItem('@app_language', lng);
    } catch (e) {
      console.warn('Failed to change language', e);
    }
  };

  if (isLoading) return <LoadingScreen />;

  const AppContent = (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <NavigationContainer
        onStateChange={(state) => {
          const currentRoute = state?.routes[state.routes.length - 1];
          if (currentRoute) NavigationStateHelper.setCurrentScreen(currentRoute.name);
        }}
      >
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#fff' },
              headerTintColor: '#2c3e50',
            }}
          />
          <Stack.Screen name="PatientList" component={PatientListScreen} />
          <Stack.Screen name="AddPatient" component={AddPatientScreen} />
          <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
          <Stack.Screen name="AddVisit" component={AddVisitScreen} />
          <Stack.Screen name="AddVaccination" component={AddVaccinationScreen} />
          <Stack.Screen name="Reminders" component={RemindersScreen} />
          <Stack.Screen name="TodayVisits" component={TodayVisitsScreen} />
          <Stack.Screen name="ScheduleVisit" component={ScheduleVisitScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );

  return (
    <I18nextProvider i18n={i18n}>
      {SafeAreaProvider ? <SafeAreaProvider>{AppContent}</SafeAreaProvider> : AppContent}
      <Toast config={toastConfig} />
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 20, fontSize: 16, color: '#7f8c8d' },
  languageBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f5f5f5' },
  languageLabel: { marginRight: 8, color: '#333' },
  langButton: { paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: 4 },
  langText: { color: '#333' },
  langTextActive: { color: '#3498db', fontWeight: '600' },
});
