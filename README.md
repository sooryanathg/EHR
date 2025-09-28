# ASHA EHR - Community Health Management System

A comprehensive Electronic Health Record (EHR) system designed for ASHA (Accredited Social Health Activist) workers and PHC (Primary Health Centre) staff to manage community health data efficiently.

## ✅ Project Status

**Current Status: READY FOR DEPLOYMENT** 🚀

### Completed Features
- ✅ Complete mobile app with all screens and functionality
- ✅ Full dashboard with analytics and data visualization
- ✅ Firebase integration for cloud sync
- ✅ SQLite database for offline storage
- ✅ Voice notes recording and playback
- ✅ Push notifications system
- ✅ Multilingual support (English/Hindi)
- ✅ Authentication system (PIN for ASHA, Firebase for PHC)
- ✅ Data synchronization between mobile and web
- ✅ Build and deployment configurations

### Ready for Production
- All core features implemented and tested
- Build processes verified
- Deployment guides provided
- Security configurations in place

## 🏗️ Architecture

### Tech Stack
- **Mobile App**: React Native (Expo)
- **Local Database**: SQLite (expo-sqlite)
- **Backend**: Firebase (Firestore + Auth + Storage)
- **Dashboard**: Next.js (React) with Tailwind CSS
- **Notifications**: Expo Notifications
- **Multilingual**: react-i18next (English/Hindi)
- **Voice Notes**: Expo AV
- **Security**: AES encryption + PIN authentication

### System Components
1. **Mobile App (ASHA Workers)**: Offline-first data collection
2. **Web Dashboard (PHC Staff)**: Data visualization and management
3. **Firebase Backend**: Cloud sync and storage
4. **Local SQLite**: Offline data persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase account
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### 1. Clone and Setup

**Option A: Automated Setup (Recommended)**
```bash
# Clone the repository
git clone <repository-url>
cd EHR

# Run quick start script
# On Linux/Mac:
chmod +x quick-start.sh
./quick-start.sh

# On Windows:
quick-start.bat
```

**Option B: Manual Setup**
```bash
# Clone the repository
git clone <repository-url>
cd EHR

# Install mobile app dependencies
cd asha-ehr
npm install

# Install dashboard dependencies
cd ../phc-dashboard
npm install
```

### 2. Firebase Configuration

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication (Email/Password)
5. Enable Storage
6. Get your Firebase config

#### Update Firebase Config
Replace the placeholder config in these files:

**Mobile App (`asha-ehr/src/auth/authService.js`):**
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

**Dashboard (`phc-dashboard/src/lib/firebase.js`):**
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Run the Applications

#### Mobile App (ASHA EHR)
```bash
cd asha-ehr

# Start Expo development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (macOS only)
npx expo run:ios

# Run on web (for testing)
npx expo start --web
```

#### PHC Dashboard
```bash
cd phc-dashboard

# Start development server
npm run dev

# Open http://localhost:3000
```

## 📱 Mobile App Features

### Authentication
- **ASHA Workers**: PIN-based login (stored securely with SHA-256 hash)
- **PHC Staff**: Firebase email/password authentication
- **Role-based UI**: Different interfaces based on user type

### Patient Management
- **Registration**: Add pregnant women and children
- **Patient List**: Search and filter patients
- **Patient Profiles**: View detailed patient information
- **Offline Storage**: All data stored locally in SQLite

### Visit Recording
- **ANC Visits**: Record blood pressure, weight, notes
- **Immunization**: Track vaccination schedules
- **General Visits**: Record any health visit
- **Next Visit Scheduling**: Set follow-up appointments

### Vaccination Tracking
- **Vaccine Management**: Track due dates and given dates
- **Status Updates**: Mark vaccinations as given/pending/overdue
- **Reminders**: Automatic notifications for due vaccinations

### Voice Notes
- **Audio Recording**: Record voice notes during visits
- **Cloud Storage**: Sync audio files to Firebase Storage
- **Playback**: Listen to recorded notes

### Offline-First Sync
- **Local Storage**: All data stored in SQLite
- **Background Sync**: Automatic sync when online
- **Manual Sync**: Force sync with "Sync Now" button
- **Conflict Resolution**: Handle sync conflicts gracefully

### Notifications
- **Visit Reminders**: Notifications for upcoming visits
- **Vaccination Alerts**: Reminders for due vaccinations
- **Daily Sync Reminders**: Encourage regular data sync

### Multilingual Support
- **Languages**: English and Hindi
- **Dynamic Switching**: Change language in settings
- **Complete Translation**: All UI elements translated

## 🖥️ Dashboard Features

### Authentication
- **PHC Staff Login**: Firebase email/password authentication
- **Secure Access**: Protected routes and session management

### Data Visualization
- **Dashboard Overview**: Key metrics and statistics
- **Patient Management**: View and search all patients
- **Visit Tracking**: Monitor all health visits
- **Analytics**: Charts and trends for data insights

### Real-time Updates
- **Live Data**: Real-time updates from mobile app sync
- **Patient Lists**: Comprehensive patient information
- **Visit History**: Complete visit records
- **Vaccination Status**: Track immunization progress

### Analytics & Reporting
- **Visit Trends**: Monthly visit patterns
- **Vaccination Coverage**: Status distribution
- **Village-wise Data**: Patient distribution by location
- **Performance Metrics**: Key health indicators

## 🔒 Security Features

### Data Protection
- **PIN Hashing**: SHA-256 encryption for ASHA PINs
- **AES Encryption**: Sensitive data encrypted before storage
- **Secure Sync**: HTTPS communication with Firebase
- **Local Encryption**: SQLite database encryption

### Access Control
- **Role-based Access**: Different permissions for ASHA vs PHC
- **Session Management**: Secure authentication sessions
- **Data Isolation**: User-specific data access

## 📊 Database Schema

### SQLite Tables (Mobile App)

#### Patients
```sql
CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pregnant', 'child')),
  village TEXT NOT NULL,
  health_id TEXT UNIQUE,
  language TEXT DEFAULT 'en',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced INTEGER DEFAULT 0
);
```

#### Visits
```sql
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('anc', 'immunization', 'general')),
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  weight REAL,
  notes TEXT,
  next_visit TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patients (id)
);
```

#### Vaccinations
```sql
CREATE TABLE vaccinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  vaccine_name TEXT NOT NULL,
  due_date TEXT NOT NULL,
  given_date TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'given', 'overdue')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patients (id)
);
```

#### Voice Notes
```sql
CREATE TABLE voice_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced INTEGER DEFAULT 0,
  firebase_url TEXT,
  FOREIGN KEY (visit_id) REFERENCES visits (id)
);
```

### Firestore Collections (Cloud)

- **patients**: Synced patient data
- **visits**: Synced visit records
- **vaccinations**: Synced vaccination data
- **voice_notes**: Audio file metadata and URLs

## 🎯 Demo Flow

### For Judges/Demo

1. **ASHA Worker Login**
   - Open mobile app
   - Use "First Time Setup" to set PIN (e.g., 1234)
   - Login with PIN

2. **Patient Registration**
   - Add new patient (pregnant woman or child)
   - Fill in details: name, age, village, health ID
   - Save to local database

3. **Visit Recording**
   - Open patient profile
   - Add ANC visit with BP, weight, notes
   - Set next visit date
   - Record voice note during visit

4. **Vaccination Tracking**
   - For child patients, add vaccination records
   - Set due dates and mark as given
   - View vaccination status

5. **Offline Persistence**
   - Close app and reopen
   - Patient data still available (offline storage)

6. **Data Sync**
   - Turn on internet connection
   - Use "Sync Now" button
   - Data uploads to Firebase

7. **PHC Dashboard**
   - Open dashboard in browser
   - Login with PHC credentials
   - View synced patient data
   - Check analytics and reports

8. **Notifications**
   - Receive visit reminders
   - Get vaccination alerts
   - Daily sync reminders

9. **Multilingual**
   - Switch to Hindi in settings
   - UI updates to Hindi
   - All text translated

10. **Voice Notes**
    - Play recorded voice notes in dashboard
    - Audio files synced to cloud storage

## 🛠️ Development

### Project Structure

```
EHR/
├── asha-ehr/                 # Mobile app (React Native/Expo)
│   ├── src/
│   │   ├── auth/            # Authentication services
│   │   ├── database/        # SQLite schema and services
│   │   ├── screens/         # App screens
│   │   ├── services/        # Sync, notifications, voice notes
│   │   └── i18n/           # Internationalization
│   ├── App.js              # Main app component
│   └── package.json
├── phc-dashboard/           # Web dashboard (Next.js)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/            # Firebase configuration
│   │   └── pages/          # Next.js pages
│   └── package.json
└── README.md
```

### Key Dependencies

#### Mobile App
```json
{
  "expo-sqlite": "^13.2.2",
  "firebase": "^10.7.1",
  "expo-notifications": "^0.27.6",
  "react-i18next": "^13.5.0",
  "expo-av": "^13.10.4",
  "@react-native-async-storage/async-storage": "^1.21.0",
  "crypto-js": "^4.2.0",
  "expo-network": "^1.0.0",
  "expo-file-system": "^16.0.6"
}
```

#### Dashboard
```json
{
  "firebase": "^10.7.1",
  "recharts": "^2.8.0",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0"
}
```

### Environment Setup

#### Mobile Development
```bash
# Install Expo CLI
npm install -g @expo/cli

# Install Expo Go app on your phone
# Android: Google Play Store
# iOS: App Store

# Start development server
npx expo start
```

#### Web Development
```bash
# Install Next.js dependencies
npm install

# Start development server
npm run dev
```

## 🚀 Deployment

### Mobile App Deployment

#### Android (APK)
```bash
cd asha-ehr

# Build APK
npx expo build:android

# Or use EAS Build
npx eas build --platform android
```

#### iOS (IPA)
```bash
cd asha-ehr

# Build for iOS
npx expo build:ios

# Or use EAS Build
npx eas build --platform ios
```

### Dashboard Deployment

#### Firebase Hosting
```bash
cd phc-dashboard

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Build and deploy
npm run build
firebase deploy
```

#### Vercel (Alternative)
```bash
cd phc-dashboard

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## 🔧 Configuration

### Firebase Rules

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Storage Rules
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

### App Configuration

#### Expo Configuration (`app.json`)
```json
{
  "expo": {
    "name": "ASHA EHR",
    "slug": "asha-ehr",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [
      "expo-sqlite",
      "expo-notifications",
      "expo-av"
    ]
  }
}
```

## 🧪 Testing

### Mobile App Testing
```bash
cd asha-ehr

# Run tests
npm test

# Test on different devices
npx expo start --tunnel
```

### Dashboard Testing
```bash
cd phc-dashboard

# Run tests
npm test

# Test build
npm run build
```

## 📈 Performance Optimization

### Mobile App
- **SQLite Indexing**: Optimized database queries
- **Image Optimization**: Compressed assets
- **Lazy Loading**: Components loaded on demand
- **Memory Management**: Proper cleanup of resources

### Dashboard
- **Code Splitting**: Dynamic imports
- **Image Optimization**: Next.js image optimization
- **Caching**: Firebase data caching
- **Bundle Analysis**: Optimized bundle size

## 🔍 Troubleshooting

### Common Issues

#### Mobile App
1. **Expo CLI not found**
   ```bash
   npm install -g @expo/cli
   ```

2. **Firebase connection error**
   - Check Firebase config
   - Verify internet connection
   - Check Firebase project settings

3. **SQLite database error**
   - Clear app data
   - Reinstall app
   - Check database initialization

#### Dashboard
1. **Firebase auth error**
   - Check Firebase config
   - Verify authentication setup
   - Check browser console for errors

2. **Build errors**
   ```bash
   npm run build
   # Check for TypeScript errors
   ```

### Debug Mode

#### Mobile App
```bash
# Enable debug mode
npx expo start --dev-client
```

#### Dashboard
```bash
# Enable debug mode
npm run dev
# Check browser developer tools
```

## 📚 API Documentation

### Mobile App APIs

#### Patient Service
```javascript
// Create patient
const patientId = await PatientService.createPatient(patientData);

// Get all patients
const patients = await PatientService.getAllPatients();

// Get patient by ID
const patient = await PatientService.getPatientById(id);

// Update patient
await PatientService.updatePatient(id, patientData);
```

#### Visit Service
```javascript
// Create visit
const visitId = await VisitService.createVisit(visitData);

// Get visits by patient
const visits = await VisitService.getVisitsByPatientId(patientId);

// Get upcoming visits
const upcoming = await VisitService.getUpcomingVisits();
```

#### Sync Service
```javascript
// Sync all data
const results = await SyncService.syncAll();

// Check sync status
const status = await SyncService.getSyncStatus();

// Check online status
const isOnline = await SyncService.isOnline();
```

### Dashboard APIs

#### Firebase Integration
```javascript
// Get patients
const patientsSnapshot = await getDocs(collection(db, 'patients'));

// Get visits
const visitsSnapshot = await getDocs(collection(db, 'visits'));

// Get vaccinations
const vaccinationsSnapshot = await getDocs(collection(db, 'vaccinations'));
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### Code Standards
- **ESLint**: Follow linting rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Type safety for dashboard
- **Comments**: Document complex logic

### Testing Requirements
- **Unit Tests**: Test individual functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Expo Team**: For the excellent React Native platform
- **Firebase Team**: For robust backend services
- **React Native Community**: For extensive documentation
- **ASHA Workers**: For their invaluable community health work

## 📞 Support

For support and questions:
- **Issues**: Create GitHub issues
- **Documentation**: Check this README
- **Community**: Join our discussion forum

---

**Built with ❤️ for Community Health Workers**
