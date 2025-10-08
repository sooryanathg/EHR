// Navigation state tracker
let currentScreen = '';

export const NavigationStateHelper = {
  setCurrentScreen: (screenName) => {
    currentScreen = screenName;
  },
  getCurrentScreen: () => currentScreen,
  isOnLoginScreen: () => currentScreen === 'Login'
};