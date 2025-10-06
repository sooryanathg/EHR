import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { syncManager } from '../services/syncManager';
import ProfileMenu from './ProfileMenu';

export default function AppHeader({ navigation }) {
  const { t } = useTranslation();
  const [showProfile, setShowProfile] = useState(false);
  const [ashaName, setAshaName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadAshaDetails = async () => {
      try {
        // First try to get from AsyncStorage as it's fastest
        const storedName = await AsyncStorage.getItem('asha_name');
        if (storedName) {
          setAshaName(storedName);
          return;
        }

        // If no stored name, try getting from Firestore
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data()?.name) {
            const name = userDoc.data().name;
            setAshaName(name);
            await AsyncStorage.setItem('asha_name', name);
            return;
          }
          
          // Last resort: use displayName
          if (user.displayName) {
            setAshaName(user.displayName);
            await AsyncStorage.setItem('asha_name', user.displayName);
            return;
          }
        }
        
        setAshaName('ASHA');
      } catch (error) {
        console.error('Error loading ASHA details:', error);
        setAshaName('ASHA');
      }
    };
    loadAshaDetails();
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncManager.syncData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Left Section - Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingLabel}>{t('welcome')}</Text>
          <Text style={styles.userName} numberOfLines={1}>{ashaName}</Text>
        </View>

        {/* Right Section - Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Sync Button */}
          <TouchableOpacity 
            style={[styles.iconButton, isSyncing && styles.iconButtonDisabled]} 
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.syncCircle, isSyncing && styles.syncingCircle]}>
              <Text style={styles.iconText}>↻</Text>
            </View>
          </TouchableOpacity>

          {/* Reminders Button */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Reminders')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.reminderCircle]}>
              <Text style={styles.iconText}>🔔</Text>
            </View>
          </TouchableOpacity>

          {/* Profile Button */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowProfile(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.profileCircle]}>
              <Text style={styles.profileInitial}>
                {ashaName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Menu Modal */}
      <ProfileMenu 
        visible={showProfile} 
        onClose={() => setShowProfile(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greetingSection: {
    flex: 1,
    marginRight: 16,
  },
  greetingLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 2,
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  syncCircle: {
    backgroundColor: '#10B981',
  },
  syncingCircle: {
    backgroundColor: '#9CA3AF',
  },
  reminderCircle: {
    backgroundColor: '#F59E0B',
  },
  profileCircle: {
    backgroundColor: '#3B82F6',
  },
  iconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileInitial: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});