import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

// Language display configuration
const languageNames = {
  'en-IN': 'EN',
  'hi-IN': 'हि',
  'ta-IN': 'த',
  'ml-IN': 'മ'
};

const VoiceInput = ({ 
  value, 
  onChangeText, 
  placeholder, 
  style,
  ...props 
}) => {
  const { t, i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  // Effect to handle language changes
  useEffect(() => {
    if (i18n.language !== selectedLanguage) {
      setSelectedLanguage(i18n.language);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [i18n.language]);

  // Map app languages to speech recognition language codes
  const languageMap = {
    'en': 'en-IN',  // English (India)
    'hi': 'hi-IN',  // Hindi
    'ta': 'ta-IN',  // Tamil
    'ml': 'ml-IN'   // Malayalam
  };

  const currentLanguage = languageMap[i18n.language] || 'en-IN';
  
  // Debug logging for language selection
  console.log('Current app language:', i18n.language);
  console.log('Selected speech recognition language:', currentLanguage);

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
          Alert.alert('Permission Denied', 'Microphone permission is required for voice input');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const startRecording = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setError(null);
    setIsRecording(true);
    setShowWebView(true);
    
    // Start speech recognition in WebView
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          startRecognition();
          true;
        `);
      }
    }, 500);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        stopRecognition();
        true;
      `);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Received from WebView:', data);

      if (data.type === 'result') {
        const transcript = data.transcript.trim();
        if (transcript) {
          onChangeText(value ? `${value} ${transcript}` : transcript);
        }
        setIsRecording(false);
        setShowWebView(false);
      } else if (data.type === 'error') {
        console.error('Speech recognition error:', data.error);
        setError(data.message || 'Speech recognition failed');
        setIsRecording(false);
        setShowWebView(false);
        
        if (data.error === 'not-allowed' || data.error === 'service-not-allowed') {
          Alert.alert(
            'Permission Required',
            'Microphone permission was denied. Please enable it in your browser settings.',
            [{ text: 'OK' }]
          );
        } else if (data.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        }
      } else if (data.type === 'interim') {
        // Optional: show interim results
        console.log('Interim result:', data.transcript);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const webViewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .status {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
        .indicator {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          background: #f44336;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .transcript {
          margin-top: 20px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          min-width: 200px;
          text-align: center;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="status" id="status">Initializing...</div>
      <div class="indicator"></div>
      <div class="transcript" id="transcript">Listening...</div>

      <script>
        let recognition = null;
        let finalTranscript = '';
        let currentLanguage = '${currentLanguage}';

        function sendMessage(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }

        function initRecognition() {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          
          if (!SpeechRecognition) {
            sendMessage({
              type: 'error',
              error: 'not-supported',
              message: 'Speech recognition not supported in this browser'
            });
            return;
          }

          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = currentLanguage;
          recognition.maxAlternatives = 1;

          recognition.onstart = function() {
            document.getElementById('status').textContent = 'Listening...';
            console.log('Speech recognition started');
          };

          recognition.onresult = function(event) {
            let interimTranscript = '';
            finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }

            const displayText = finalTranscript || interimTranscript;
            document.getElementById('transcript').textContent = displayText || 'Listening...';

            if (interimTranscript) {
              sendMessage({
                type: 'interim',
                transcript: interimTranscript
              });
            }
          };

          recognition.onend = function() {
            console.log('Speech recognition ended');
            document.getElementById('status').textContent = 'Processing...';
            
            if (finalTranscript) {
              sendMessage({
                type: 'result',
                transcript: finalTranscript
              });
            } else {
              sendMessage({
                type: 'error',
                error: 'no-speech',
                message: 'No speech detected'
              });
            }
          };

          recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            let message = 'Speech recognition failed';
            
            switch(event.error) {
              case 'no-speech':
                message = 'No speech detected. Please try again.';
                break;
              case 'audio-capture':
                message = 'No microphone found or microphone not working.';
                break;
              case 'not-allowed':
                message = 'Microphone permission denied.';
                break;
              case 'network':
                message = 'Network error occurred.';
                break;
              case 'aborted':
                message = 'Speech recognition aborted.';
                break;
            }

            sendMessage({
              type: 'error',
              error: event.error,
              message: message
            });
          };
        }

        function startRecognition() {
          if (!recognition) {
            initRecognition();
          }
          
          if (recognition) {
            finalTranscript = '';
            document.getElementById('transcript').textContent = 'Listening...';
            recognition.start();
          }
        }

        function stopRecognition() {
          if (recognition) {
            recognition.stop();
          }
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
          initRecognition();
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <View style={styles.languageIndicator}>
          <Text style={styles.languageText}>
            {languageNames[currentLanguage]}
          </Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          style={[
            styles.input,
            isRecording && styles.inputRecording
          ]}
          multiline
          editable={!isRecording}
          {...props}
        />
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              {transcribing ? t('transcribing') : t('listening')}...
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.micButton,
          isRecording && styles.micButtonActive,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.7}
      >
        {isRecording ? (
          <Text style={styles.micText}>⏹</Text>
        ) : (
          <Text style={styles.micText}>🎤</Text>
        )}
      </TouchableOpacity>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      
      {showWebView && (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: webViewHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            style={styles.webView}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    position: 'relative',
  },
  languageIndicator: {
    position: 'absolute',
    top: 5,
    right: 8,
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  languageText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    paddingRight: 35, // Space for language indicator
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#fff',
  },
  inputRecording: {
    borderColor: '#f44336',
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f44336',
    marginRight: 6,
  },
  recordingText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '500',
  },
  micButton: {
    marginLeft: 8,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  micButtonActive: {
    backgroundColor: '#f44336',
  },
  micText: {
    fontSize: 20,
  },
  errorContainer: {
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 50,
    backgroundColor: '#fdecea',
    padding: 4,
    borderRadius: 4,
  },
  error: {
    color: '#f44336',
    fontSize: 11,
    textAlign: 'center',
  },
  webViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default VoiceInput;