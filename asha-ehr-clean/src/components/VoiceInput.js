import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, PermissionsAndroid, Platform, NativeModules } from 'react-native';
import Voice from '@react-native-voice/voice';

// Debug check for native module
console.log('Native Voice module:', NativeModules.Voice);

const VoiceInput = ({ value, onChangeText, placeholder, style, ...props }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [error, setError] = useState(null);
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const initializeVoice = async () => {
			try {
				// Check native module availability
				if (!NativeModules.Voice) {
					throw new Error('Native voice module is not available');
				}

				// Wait briefly for native module initialization
				await new Promise(resolve => setTimeout(resolve, 300));

				// Set up event handlers
				Voice.onSpeechStart = () => isMounted && setIsRecording(true);
				Voice.onSpeechEnd = () => isMounted && setIsRecording(false);
				Voice.onSpeechResults = onSpeechResults;
				Voice.onSpeechError = onSpeechError;

				// Wait a moment for initialization
				await new Promise(resolve => setTimeout(resolve, 100));
				
				if (isMounted) {
					setIsInitialized(true);
					console.log('Voice initialized successfully');
				}
			} catch (error) {
				console.error('Error initializing Voice:', error);
				if (isMounted) {
					setError('Error initializing voice recognition');
				}
			}
		};

		initializeVoice();

		return () => {
			isMounted = false;
			try {
				Voice.cancel();
			} catch (e) {
				console.log('Error cleaning up Voice:', e);
			}
		};
	}, []);

	const onSpeechResults = (e) => {
		if (e.value && e.value.length > 0) {
			onChangeText(e.value[0]);
		}
		setIsRecording(false);
	};

	const onSpeechError = (e) => {
		console.log('Speech error:', e);
		setError(e?.error?.message || 'Speech recognition failed');
		setIsRecording(false);
	};

	const requestAudioPermission = async () => {
		try {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
				{
					title: "Microphone Permission",
					message: "This app needs access to your microphone for voice input.",
					buttonNeutral: "Ask Me Later",
					buttonNegative: "Cancel",
					buttonPositive: "OK"
				}
			);
			return granted === PermissionsAndroid.RESULTS.GRANTED;
		} catch (err) {
			console.warn(err);
			return false;
		}
	};

	const startRecording = async () => {
		try {
			setError(null);
			
			// Check for native module
			if (!NativeModules.Voice) {
				throw new Error('Native voice module is not available');
			}

			if (!isInitialized) {
				throw new Error('Voice recognition is not initialized yet');
			}

			if (Platform.OS === 'android') {
				const hasPermission = await requestAudioPermission();
				if (!hasPermission) {
					throw new Error('Microphone permission denied');
				}
			}

			// Attempt to start voice recognition
			console.log('Starting voice recognition...');
			setIsRecording(true);
			
			// Wait briefly for native module to be ready
			await new Promise(resolve => setTimeout(resolve, 300));
			
			try {
				await Voice.start('en-US');
				console.log('Voice recognition started successfully');
			} catch (e) {
				console.error('Error starting voice recognition:', e);
				if (e.message.includes('startSpeech')) {
					throw new Error('Voice recognition service is not responding. Please try again.');
				}
				throw e;
			}
		} catch (e) {
			setError(e.message);
			setIsRecording(false);
		}
	};

	const stopRecording = async () => {
		try {
			await Voice.stop();
		} catch (e) {
			setError(e.message);
		}
		setIsRecording(false);
	};

	return (
		<View style={[styles.container, style]}>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				style={styles.input}
				multiline
				{...props}
			/>
			<TouchableOpacity
				style={[styles.micButton, isRecording && styles.micButtonActive]}
				onPress={isRecording ? stopRecording : startRecording}
			>
				<Text style={styles.micText}>{isRecording ? 'Stop' : '🎤'}</Text>
			</TouchableOpacity>
			{error && <Text style={styles.error}>{error}</Text>}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 8,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 10,
		minHeight: 40,
		maxHeight: 120,
		backgroundColor: '#fff',
	},
	micButton: {
		marginLeft: 8,
		padding: 10,
		backgroundColor: '#eee',
		borderRadius: 20,
	},
	micButtonActive: {
		backgroundColor: '#ffcccc',
	},
	micText: {
		fontSize: 20,
	},
	error: {
		color: 'red',
		marginLeft: 8,
	},
});

export default VoiceInput;
