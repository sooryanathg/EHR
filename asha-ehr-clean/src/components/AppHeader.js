import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText} numberOfLines={2}>{t('welcome')}</Text>
        <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">{ashaName}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.syncButton, isSyncing && styles.syncingButton]} 
          onPress={handleSync}
          disabled={isSyncing}
        >
          <Text style={styles.buttonText} numberOfLines={2}>{isSyncing ? t('syncing') : t('sync')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.remindersButton]}
          onPress={() => navigation.navigate('Reminders')}
        >
          <Text style={styles.buttonText} numberOfLines={2}>{t('reminders')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.profileButton]}
          onPress={() => setShowProfile(true)}
        >
          <Text style={styles.buttonText} numberOfLines={2}>{t('profile')}</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 64,
    maxWidth: '100%',
  },
  welcomeSection: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: 12,
    maxWidth: '45%',
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2196f3',
    flexShrink: 1,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#2196f3',
    minWidth: 60,
    maxWidth: 90,
  },
  syncButton: {
    backgroundColor: '#27ae60',
  },
  syncingButton: {
    backgroundColor: '#95a5a6',
  },
  remindersButton: {
    backgroundColor: '#f39c12',
  },
  profileButton: {
    backgroundColor: '#2196f3',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
});