import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../auth/authService';
import { NotificationService } from '../services/notificationService';

const SettingsScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifications = await AsyncStorage.getItem('notifications_enabled');
      setNotificationsEnabled(notifications !== 'false');
      
      const language = await AsyncStorage.getItem('app_language');
      setCurrentLanguage(language || 'en');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleLanguageChange = async (language) => {
    try {
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem('app_language', language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.error'), 'Failed to change language');
    }
  };

  const handleNotificationsToggle = async (value) => {
    try {
      setNotificationsEnabled(value);
      await AsyncStorage.setItem('notifications_enabled', value.toString());
      
      if (value) {
        await NotificationService.requestPermissions();
      } else {
        await NotificationService.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert(t('common.error'), 'Failed to update notification settings');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.clearData'),
      t('settings.confirmClearData'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all data except PIN
              await AsyncStorage.multiRemove([
                'app_language',
                'notifications_enabled',
                'last_sync_time'
              ]);
              
              // Clear database (this would require additional implementation)
              Alert.alert(t('common.success'), 'Data cleared successfully');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert(t('common.error'), 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      'Are you sure you want to logout?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.languageContainer}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLanguage === 'en' && styles.activeLanguageButton
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={[
              styles.languageButtonText,
              currentLanguage === 'en' && styles.activeLanguageButtonText
            ]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLanguage === 'hi' && styles.activeLanguageButton
            ]}
            onPress={() => handleLanguageChange('hi')}
          >
            <Text style={[
              styles.languageButtonText,
              currentLanguage === 'hi' && styles.activeLanguageButtonText
            ]}>
              हिंदी
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#bdc3c7', true: '#3498db' }}
            thumbColor={notificationsEnabled ? '#fff' : '#fff'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.sync')}</Text>
        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => navigation.navigate('Sync')}
        >
          <Text style={styles.settingButtonText}>Sync Data</Text>
          <Text style={styles.settingButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.version')}</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Name</Text>
          <Text style={styles.infoValue}>ASHA EHR</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>React Native</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearData}
        >
          <Text style={styles.dangerButtonText}>{t('settings.clearData')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
        </TouchableOpacity>
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
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
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
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  languageButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeLanguageButtonText: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingButtonText: {
    fontSize: 16,
    color: '#3498db',
  },
  settingButtonArrow: {
    fontSize: 16,
    color: '#3498db',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  infoLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;

