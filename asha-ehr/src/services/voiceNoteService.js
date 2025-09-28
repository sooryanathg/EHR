import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import db from '../database/schema';

export const VoiceNoteService = {
  recording: null,
  sound: null,

  // Request permissions
  requestPermissions: async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  },

  // Start recording
  startRecording: async () => {
    try {
      const hasPermission = await VoiceNoteService.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      VoiceNoteService.recording = recording;
      return recording;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  },

  // Stop recording
  stopRecording: async () => {
    try {
      if (!VoiceNoteService.recording) {
        throw new Error('No recording in progress');
      }

      await VoiceNoteService.recording.stopAndUnloadAsync();
      const uri = VoiceNoteService.recording.getURI();
      VoiceNoteService.recording = null;
      
      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  },

  // Play audio
  playAudio: async (uri) => {
    try {
      if (VoiceNoteService.sound) {
        await VoiceNoteService.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri });
      VoiceNoteService.sound = sound;
      
      await sound.playAsync();
      return sound;
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  },

  // Pause audio
  pauseAudio: async () => {
    try {
      if (VoiceNoteService.sound) {
        await VoiceNoteService.sound.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  },

  // Stop audio
  stopAudio: async () => {
    try {
      if (VoiceNoteService.sound) {
        await VoiceNoteService.sound.stopAsync();
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  },

  // Get audio duration
  getDuration: async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      
      return status.durationMillis || 0;
    } catch (error) {
      console.error('Error getting audio duration:', error);
      return 0;
    }
  },

  // Save voice note to database
  saveVoiceNote: async (visitId, filePath, duration) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO voice_notes (visit_id, file_path, duration) 
           VALUES (?, ?, ?)`,
          [visitId, filePath, duration],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get voice notes for a visit
  getVoiceNotesByVisitId: async (visitId) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM voice_notes WHERE visit_id = ? ORDER BY created_at DESC',
          [visitId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get all voice notes
  getAllVoiceNotes: async () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT vn.*, v.date as visit_date, p.name as patient_name 
           FROM voice_notes vn 
           JOIN visits v ON vn.visit_id = v.id 
           JOIN patients p ON v.patient_id = p.id 
           ORDER BY vn.created_at DESC`,
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Delete voice note
  deleteVoiceNote: async (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM voice_notes WHERE id = ?',
          [id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get unsynced voice notes
  getUnsyncedVoiceNotes: async () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM voice_notes WHERE synced = 0',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Mark voice note as synced
  markVoiceNoteAsSynced: async (id, firebaseUrl) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE voice_notes SET synced = 1, firebase_url = ? WHERE id = ?',
          [firebaseUrl, id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Cleanup
  cleanup: async () => {
    try {
      if (VoiceNoteService.recording) {
        await VoiceNoteService.recording.stopAndUnloadAsync();
        VoiceNoteService.recording = null;
      }
      if (VoiceNoteService.sound) {
        await VoiceNoteService.sound.unloadAsync();
        VoiceNoteService.sound = null;
      }
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  }
};

