import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfileMenu({ visible, onClose, navigation }) {
  const { t, i18n } = useTranslation();
  const [ashaName, setAshaName] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  
  useEffect(() => {
    const loadAshaDetails = async () => {
      try {
        const user = auth.currentUser;
        let name = '';
        if (user) {
          // First try to get from users collection in Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data()?.name) {
            name = userDoc.data().name;
          } else if (user.displayName) {
            name = user.displayName;
          }
        }
        // Fallback to AsyncStorage if name is still empty
        if (!name) {
          const storedName = await AsyncStorage.getItem('asha_name');
          name = storedName || 'ASHA';
        }
        setAshaName(name);
      } catch (error) {
        console.error('Error loading ASHA details:', error);
        // Fallback to AsyncStorage
        const storedName = await AsyncStorage.getItem('asha_name');
        setAshaName(storedName || 'ASHA');
      }
    };
    loadAshaDetails();
  }, [visible]); // Reload when modal becomes visible

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

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

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        onPress={onClose}
        activeOpacity={1}
      >
        <Animated.View 
          style={[
            styles.menuContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {ashaName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName} numberOfLines={1}>{ashaName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {auth.currentUser?.email}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Language Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Select Language')}</Text>
            <View style={styles.languageGrid}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageCard,
                    i18n.language === lang.code && styles.languageCardActive
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.languageNative,
                    i18n.language === lang.code && styles.languageTextActive
                  ]}>
                    {lang.native}
                  </Text>
                  <Text style={[
                    styles.languageName,
                    i18n.language === lang.code && styles.languageTextActive
                  ]}>
                    {lang.name}
                  </Text>
                  {i18n.language === lang.code && (
                    <View style={styles.checkMark}>
                      <Text style={styles.checkMarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>{t('Logout')}</Text>
          </TouchableOpacity>
        </Animated.View>
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
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 70,
    marginRight: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  languageCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  languageNative: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  languageName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  languageTextActive: {
    color: '#3B82F6',
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});