import { Platform } from 'react-native';

export const toastConfig = {
  success: (props) => ({
    type: 'success',
    position: 'bottom',
    visibilityTime: 2500,
    autoHide: true,
    topOffset: Platform.OS === 'ios' ? 40 : 30,
    bottomOffset: Platform.OS === 'ios' ? 40 : 30,
    props: {
      style: {
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      },
      text1Style: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
      },
      text2Style: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
      },
    },
    ...props,
  }),
  error: (props) => ({
    type: 'error',
    position: 'bottom',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: Platform.OS === 'ios' ? 40 : 30,
    bottomOffset: Platform.OS === 'ios' ? 40 : 30,
    props: {
      style: {
        backgroundColor: '#f44336',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      },
      text1Style: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
      },
      text2Style: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
      },
    },
    ...props,
  }),
  info: (props) => ({
    type: 'info',
    position: 'bottom',
    visibilityTime: 2000,
    autoHide: true,
    topOffset: Platform.OS === 'ios' ? 40 : 30,
    bottomOffset: Platform.OS === 'ios' ? 40 : 30,
    props: {
      style: {
        backgroundColor: '#2196F3',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      },
      text1Style: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
      },
      text2Style: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
      },
    },
    ...props,
  }),
  warning: (props) => ({
    type: 'warning',
    position: 'bottom',
    visibilityTime: 2500,
    autoHide: true,
    topOffset: Platform.OS === 'ios' ? 40 : 30,
    bottomOffset: Platform.OS === 'ios' ? 40 : 30,
    props: {
      style: {
        backgroundColor: '#FFC107',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
      },
      text1Style: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
      },
      text2Style: {
        fontSize: 14,
        color: 'rgba(0,0,0,0.7)',
      },
    },
    ...props,
  }),
};

export const formatRemindersDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';

  // Format date as "Mon, Oct 4" or similar
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const getRelativeDays = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1) return `in ${diffDays} days`;
  return '';
};