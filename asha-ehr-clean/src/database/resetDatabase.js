import { deleteAsync } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetDatabase = async () => {
  try {
    // Close any open database connections
    SQLite.closeDatabase('asha_ehr.db');
    
    // Get the database file path
    const dbDir = `${SQLite.openDatabase('asha_ehr.db').databasePath}`;
    
    // Delete the database file
    await deleteAsync(dbDir);
    
    // Clear AsyncStorage
    await AsyncStorage.clear();
    
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
};