import { View, Text } from 'react-native';
import { BaseToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#4CAF50',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
      }}
      text2Style={{
        fontSize: 14,
        color: '#7f8c8d',
      }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#f44336',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
      }}
      text2Style={{
        fontSize: 14,
        color: '#7f8c8d',
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#3498db',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
      }}
      text2Style={{
        fontSize: 14,
        color: '#7f8c8d',
      }}
    />
  ),
};