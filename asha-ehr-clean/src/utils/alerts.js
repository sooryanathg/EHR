import { Alert, Platform } from 'react-native';

const formatMessage = (message) => {
  // Convert snake_case or camelCase to Title Case with spaces
  return message
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
    .replace(/\s+/g, ' ')  // Remove extra spaces
    .trim()  // Remove leading/trailing spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const showAlert = ({ 
  title = 'Alert',  // Default title
  message = '',
  type = 'info',  // 'success', 'error', 'info', 'warning'
  buttons = undefined,
  onClose = () => {}
}) => {
  const formattedMessage = formatMessage(message);
  let formattedTitle = formatMessage(title);

  // Default styling based on type
  switch (type) {
    case 'success':
      formattedTitle = title === 'Alert' ? 'Success' : formattedTitle;
      break;
    case 'error':
      formattedTitle = title === 'Alert' ? 'Error' : formattedTitle;
      break;
    case 'warning':
      formattedTitle = title === 'Alert' ? 'Warning' : formattedTitle;
      break;
    case 'info':
      formattedTitle = title === 'Alert' ? 'Information' : formattedTitle;
      break;
  }

  // Default buttons based on type if not provided
  const defaultButtons = [{ text: 'OK', onPress: onClose }];
  
  const alertButtons = buttons || defaultButtons;

  // Show the alert
  Alert.alert(
    formattedTitle,
    formattedMessage,
    Platform.OS === 'ios' 
      ? alertButtons
      : alertButtons.reverse(), // Android shows buttons in reverse order
    { cancelable: false }
  );
};

// Convenience methods
export const showSuccess = (message, options = {}) => 
  showAlert({ ...options, message, type: 'success' });

export const showError = (message, options = {}) => 
  showAlert({ ...options, message, type: 'error' });

export const showWarning = (message, options = {}) => 
  showAlert({ ...options, message, type: 'warning' });

export const showInfo = (message, options = {}) => 
  showAlert({ ...options, message, type: 'info' });

// Example usage:
// showSuccess('patient_added', { title: 'Patient Status' });
// showError('failed_to_save_record');
// showWarning('network_connection_slow');
// showInfo('sync_in_progress');