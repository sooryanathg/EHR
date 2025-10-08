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
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: '#f87171',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#991b1b',
      }}
      text2Style={{
        fontSize: 14,
        color: '#b91c1c',
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#64748b',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
      }}
      text2Style={{
        fontSize: 14,
        color: '#64748b',
      }}
    />
  ),
};