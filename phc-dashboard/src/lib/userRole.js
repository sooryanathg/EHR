import { auth } from '../lib/firebase';
import { getIdToken } from 'firebase/auth';

export const setUserRole = async (role) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Force token refresh to include new custom claims
    await user.getIdToken(true);
    
    // Store role in local storage as backup
    localStorage.setItem('userRole', role);
    
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
};