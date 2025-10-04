import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Animated,
} from 'react-native';
import { showError, showWarning } from '../utils/alerts';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

// --- Simple custom icons (pure RN views) ---
const MicIcon = ({ color = '#fff' }) => (
  <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
    <View
      style={{
        width: 14,
        height: 20,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: 2, height: 10, backgroundColor: color, borderRadius: 1 }} />
    </View>
    <View
      style={{
        width: 12,
        height: 2,
        backgroundColor: color,
        borderRadius: 1,
        position: 'absolute',
        bottom: 0,
      }}
    />
  </View>
);

const StopIcon = ({ color = '#fff' }) => (
  <View style={{ width: 16, height: 16, backgroundColor: color, borderRadius: 2 }} />
);

// --- Language shorthand display ---
const languageNames = {
  'en-IN': 'EN',
  'hi-IN': 'हि',
  'ta-IN': 'த',
  'ml-IN': 'മ',
};

// --- Small recording pulse animation component ---
const RecordingAnimation = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 800, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 800, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(pulse);
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View style={[styles.recordingCircle, { transform: [{ scale }] }]}>
      <View style={styles.recordingInnerCircle} />
    </Animated.View>
  );
};

// --- Mic button used inside input row ---
const MicButton = ({ isRecording, onPress }) => (
  <View style={styles.micButtonWrapper}>
    <TouchableOpacity
      style={[styles.micButton, isRecording && styles.micButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isRecording ? <StopIcon /> : <MicIcon />}
    </TouchableOpacity>
    <Text style={styles.micLabel}>Voice</Text>
  </View>
);

// --- Main component ---
const VoiceInput = ({ value, onChangeText, placeholder, style, ...props }) => {
  const { t, i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  // map app language code to speech recognition locale
  const languageMap = {
    en: 'en-IN',
    'en-US': 'en-US',
    'en-IN': 'en-IN',
    hi: 'hi-IN',
    'hi-IN': 'hi-IN',
    ta: 'ta-IN',
    'ta-IN': 'ta-IN',
    ml: 'ml-IN',
    'ml-IN': 'ml-IN',
  };

  const currentLanguage = languageMap[i18n.language] || languageMap[i18n.language?.split('-')[0]] || 'en-IN';

  useEffect(() => {
    // If the app language changed while recording, stop recording
    if (i18n.language !== selectedLanguage) {
      setSelectedLanguage(i18n.language);
      if (isRecording) {
        stopRecording();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  // Android microphone permission request
  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for voice input.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showError('microphone_permission_required', { 
            title: 'permission_denied'
          });
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  };

  const startRecording = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setError(null);
    setIsRecording(true);
    setShowWebView(true);
    setTranscribing(false);

    // Wait for WebView to mount & initialize, then call startRecognition inside it.
    // The web content defines startRecognition().
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`(function(){ if(window.startRecognition) { startRecognition(); } })(); true;`);
      }
    }, 400);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setTranscribing(true); // waiting for final result
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`(function(){ if(window.stopRecognition) { stopRecognition(); } })(); true;`);
    }
  };

  // handle messages posted from the WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      // console.log('Received from WebView:', data);

      if (data.type === 'result') {
        const transcript = data.transcript.trim();
        if (transcript) {
          // Add a space only if there's existing text and it doesn't end with a space
          const newValue = value 
            ? value.trim() + ' ' + transcript
            : transcript;
          onChangeText(newValue);
        }
        setIsRecording(false);
        setShowWebView(false);
        setTranscribing(false);
      } else if (data.type === 'error') {
        setError(data.message || 'Speech recognition failed');
        setIsRecording(false);
        setShowWebView(false);
        setTranscribing(false);

        if (data.error === 'not-allowed' || data.error === 'service-not-allowed') {
          showWarning('microphone_permission_denied_browser', {
            title: 'permission_required'
          });
        }
      } else if (data.type === 'interim') {
        // optional: show interim text somewhere
        // console.log('Interim:', data.transcript);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  // HTML content for WebView: uses Web Speech API (browser) to listen & post results
  const webViewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin:0; padding:12px; font-family:Arial, sans-serif; background:#fff; color:#333; }
        .status { font-size:14px; margin-bottom:8px; text-align:center; }
        .transcript { font-style:italic; text-align:center; }
      </style>
    </head>
    <body>
      <div class="status" id="status">Initializing...</div>
      <div class="transcript" id="transcript">Waiting...</div>
      <script>
        (function() {
          let recognition = null;
          let finalTranscript = '';
          const currentLang = '${currentLanguage}';

          function sendMessage(obj) {
            window.ReactNativeWebView.postMessage(JSON.stringify(obj));
          }

          function initRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
              sendMessage({ type: 'error', error: 'not-supported', message: 'Speech recognition not supported in this browser' });
              return;
            }
            recognition = new SpeechRecognition();
            recognition.continuous = false;  // Changed to false to prevent duplicates
            recognition.interimResults = true;
            recognition.lang = currentLang;
            recognition.maxAlternatives = 1;

            recognition.onstart = function() {
              document.getElementById('status').textContent = 'Listening...';
            };

            recognition.onresult = function(event) {
              let interim = '';
              let currentTranscript = '';
              
              // Get only the latest result
              const result = event.results[event.results.length - 1];
              const transcript = result[0].transcript;
              
              if (result.isFinal) {
                finalTranscript = transcript; // Replace instead of append
              } else {
                interim = transcript;
              }
              
              document.getElementById('transcript').textContent = (finalTranscript || interim) || 'Listening...';
              if (interim) {
                sendMessage({ type: 'interim', transcript: interim });
              }
            };

            recognition.onend = function() {
              document.getElementById('status').textContent = 'Processing...';
              if (finalTranscript) {
                sendMessage({ type: 'result', transcript: finalTranscript });
              } else {
                sendMessage({ type: 'error', error: 'no-speech', message: 'No speech detected' });
              }
            };

            recognition.onerror = function(event) {
              let message = 'Speech recognition failed';
              if (event && event.error) {
                switch(event.error) {
                  case 'no-speech': message = 'No speech detected.'; break;
                  case 'audio-capture': message = 'Microphone not found or not accessible.'; break;
                  case 'not-allowed': message = 'Microphone permission denied.'; break;
                  case 'network': message = 'Network error.'; break;
                }
                sendMessage({ type: 'error', error: event.error, message });
              } else {
                sendMessage({ type: 'error', message });
              }
            };
          }

          window.startRecognition = function() {
            if (!recognition) initRecognition();
            if (recognition) {
              finalTranscript = '';
              document.getElementById('transcript').textContent = 'Listening...';
              try { recognition.start(); } catch(e){ /* ignore repeated starts */ }
            }
          };

          window.stopRecognition = function() {
            if (recognition) recognition.stop();
          };

          document.addEventListener('DOMContentLoaded', function(){ initRecognition(); });
        })();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={styles.input}
            multiline
            editable={!isRecording}
            {...props}
          />
          <MicButton isRecording={isRecording} onPress={isRecording ? stopRecording : startRecording} />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
      </View>

      {isRecording && (
        <View style={styles.recordingOverlay}>
          <View style={styles.recordingModal}>
            <RecordingAnimation />
            <Text style={styles.recordingModalText}>
              {transcribing ? t('transcribing') : t('listening') || (transcribing ? 'Transcribing' : 'Listening')}...
            </Text>
            <Text style={styles.recordingLanguage}>{languageNames[currentLanguage] || currentLanguage}</Text>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Text style={styles.stopButtonText}>⏹ {t('stop') || 'Stop'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Render WebView only while active to save resources */}
      {showWebView && (
        <View style={styles.webViewVisible}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: webViewHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            style={styles.webView}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    position: 'relative',
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
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
    marginRight: 8,
  },
  micButtonWrapper: {
    alignItems: 'center',
    marginLeft: 8,
  },
  micButton: {
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  micLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  micButtonActive: {
    backgroundColor: '#f44336',
    transform: [{ scale: 1.05 }],
  },
  micText: {
    fontSize: 24,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  errorContainer: {
    marginTop: 8,
    backgroundColor: '#fdecea',
    padding: 8,
    borderRadius: 6,
    width: '100%',
  },
  error: {
    color: '#f44336',
    fontSize: 12,
    textAlign: 'left',
  },
  webViewVisible: {
    height: 1, // keep it tiny and hidden visually; required for WebView to run
    width: 1,
    opacity: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  recordingModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244,67,54,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingInnerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f44336',
  },
  recordingModalText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  recordingLanguage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VoiceInput;
