# ASHA EHR - Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying both the mobile app and web dashboard components of the ASHA EHR system.

## 📱 Mobile App Deployment

### Prerequisites
- Expo CLI installed globally: `npm install -g @expo/cli`
- EAS CLI installed: `npm install -g eas-cli`
- Expo account and project created

### 1. Configure EAS Build

```bash
cd asha-ehr
eas login
eas build:configure
```

### 2. Update app.json
Ensure your `app.json` has the correct bundle identifiers and EAS project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-eas-project-id"
      }
    }
  }
}
```

### 3. Build for Android

```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

### 4. Build for iOS

```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

### 5. Submit to App Stores

```bash
# Submit to Google Play Store
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

## 🖥️ Dashboard Deployment

### Option 1: Vercel (Recommended)

1. **Connect to Vercel:**
   ```bash
   cd phc-dashboard
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Configure Environment Variables:**
   - Add Firebase configuration in Vercel dashboard
   - Set `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - Set `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Set `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - Set `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - Set `NEXT_PUBLIC_FIREBASE_APP_ID`

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Firebase Hosting

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase:**
   ```bash
   cd phc-dashboard
   firebase init hosting
   ```

3. **Build and Deploy:**
   ```bash
   npm run build
   firebase deploy
   ```

### Option 3: Netlify

1. **Connect to Netlify:**
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `.next`

2. **Configure Environment Variables:**
   - Add Firebase configuration in Netlify dashboard

## 🔧 Firebase Configuration

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Enable Storage
6. Get your Firebase configuration

### 2. Update Configuration Files

**Mobile App (`asha-ehr/src/auth/authService.js`):**
```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

**Dashboard (`phc-dashboard/src/lib/firebase.js`):**
```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

### 3. Set Up Firebase Security Rules

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /voice_notes/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🔐 Environment Variables

### Mobile App
No environment variables needed for mobile app (Firebase config is hardcoded).

### Dashboard
Create `.env.local` file:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 📋 Pre-Deployment Checklist

### Mobile App
- [ ] Firebase configuration updated
- [ ] App icons and splash screens added
- [ ] Permissions configured in app.json
- [ ] EAS project configured
- [ ] Bundle identifiers set

### Dashboard
- [ ] Firebase configuration updated
- [ ] Environment variables set
- [ ] Build successful (`npm run build`)
- [ ] Firebase security rules configured
- [ ] Domain configured (if using custom domain)

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Connection Errors:**
   - Verify Firebase configuration
   - Check internet connectivity
   - Ensure Firebase project is active

2. **Build Failures:**
   - Check for TypeScript errors
   - Verify all dependencies are installed
   - Check for missing environment variables

3. **Authentication Issues:**
   - Verify Firebase Auth is enabled
   - Check authentication rules
   - Ensure proper user permissions

4. **Database Access Issues:**
   - Check Firestore security rules
   - Verify user authentication
   - Check database permissions

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check Expo/EAS documentation
4. Create an issue in the repository

---

**Note:** This is a demo project. For production deployment, ensure proper security measures, data encryption, and compliance with healthcare data regulations.
