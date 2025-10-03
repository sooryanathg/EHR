import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfileMenu({ visible, onClose, navigation }) {
  const { t, i18n } = useTranslation();
  const [ashaName, setAshaName] = useState('');
  
  useEffect(() => {
    const loadAshaDetails = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // First try to get from users collection in Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data()?.name) {
            setAshaName(userDoc.data().name);
          } else {
            // Fallback to auth displayName
            setAshaName(user.displayName || 'ASHA');
          }
        }
      } catch (error) {
        console.error('Error loading ASHA details:', error);
        setAshaName('ASHA'); // Fallback name
      }
    };
    loadAshaDetails();
  }, [visible]); // Reload when modal becomes visible

  const handleLanguageChange = async (lang) => {
    try {
      await AsyncStorage.setItem('userLanguage', lang);
      i18n.changeLanguage(lang);
      onClose(); // Close the profile menu after language change
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      onClose();
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={styles.menuContainer}>
          {/* ASHA Profile Section */}
          <View style={styles.profileSection}>
            <Text style={styles.nameText}>{ashaName}</Text>
            <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
          </View>

          {/* Language Selection */}
          <Text style={styles.sectionTitle}>{t('Select Language')}</Text>
          <View style={styles.languageButtons}>
            <TouchableOpacity 
              style={[styles.langButton, i18n.language === 'en' && styles.activeLang]} 
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.langText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langButton, i18n.language === 'hi' && styles.activeLang]} 
              onPress={() => handleLanguageChange('hi')}
            >
              <Text style={styles.langText}>हिंदी</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langButton, i18n.language === 'ta' && styles.activeLang]} 
              onPress={() => handleLanguageChange('ta')}
            >
              <Text style={styles.langText}>தமிழ்</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langButton, i18n.language === 'ml' && styles.activeLang]} 
              onPress={() => handleLanguageChange('ml')}
            >
              <Text style={styles.langText}>മലയാളം</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t('Logout')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 60,
    marginRight: 10,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  profileSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  languageButtons: {
    marginBottom: 16,
  },
  langButton: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  activeLang: {
    backgroundColor: '#e3f2fd',
  },
  langText: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#ff5252',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});