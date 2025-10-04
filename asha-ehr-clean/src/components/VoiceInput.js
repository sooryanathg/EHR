import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

const isVoiceAvailable = NativeModules.Voice !== null;

const VoiceInput = ({ value, onChangeText, placeholder, style, ...props }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!isVoiceAvailable) {
			setError('Voice recognition is not available in Expo Go. Please use a development build.');
			return;
		}
		Voice.onSpeechResults = onSpeechResults;
		Voice.onSpeechError = onSpeechError;
		return () => {
			Voice.destroy().then(Voice.removeAllListeners);
		};
	}, []);

	const onSpeechResults = (e) => {
		if (e.value && e.value.length > 0) {
			onChangeText(e.value[0]);
		}
		setIsRecording(false);
	};

	const onSpeechError = (e) => {
		setError(e.error.message);
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
		setError(null);
		setIsRecording(true);
		if (!isVoiceAvailable) {
			setError('Voice recognition is not available. Please use a development build.');
			setIsRecording(false);
			return;
		}

		if (Platform.OS === 'android') {
			const hasPermission = await requestAudioPermission();
			if (!hasPermission) {
				setError('Microphone permission denied');
				setIsRecording(false);
				return;
			}
		}

		try {
			await Voice.start('en-US');
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
