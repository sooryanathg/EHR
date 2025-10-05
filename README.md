# ASHA EHR System

A comprehensive healthcare management system designed for rural India, consisting of two main components:
1. ASHA-EHR Mobile App - For community health workers (ASHA workers)
2. PHC Dashboard - For Primary Health Centre staff

## Key Features

### For ASHA Workers (Mobile App)
- 📱 Work offline with full functionality
- 👥 Register and manage patients with ease
- 🏥 Record visits with structured data
- 💉 Track vaccinations and schedule follow-ups
- 🌐 Automatic background sync when online
- 🗣️ Multilingual support (English, Hindi, Tamil)

### For PHC Staff (Web Dashboard)
- 📊 Real-time analytics and insights
- 🎯 Track ASHA worker performance
- 📈 Monitor health trends by village
- 🗺️ Geographic distribution of patients
- 📱 Mobile-responsive design
- 🔐 Role-based access control

## Project Structure

```
EHR/
├── asha-ehr-clean/          # Mobile app (React Native + Expo)
│   ├── src/
│   │   ├── auth/           # Authentication & security
│   │   ├── screens/        # App UI screens
│   │   ├── database/       # Local SQLite + sync logic
│   │   ├── services/       # Business logic
│   │   ├── i18n/          # Translations (en, hi, ta)
│   │   └── lib/           # Utilities
│   └── ...
│
└── phc-dashboard/          # Web dashboard (Next.js 13+)
    ├── src/
    │   ├── app/           # Next.js app router pages
    │   ├── components/    # React components
    │   └── lib/          # Firebase & utilities
    └── ...
```

## Technology Stack

### Mobile App (ASHA-EHR)
- **Platform**: React Native with Expo
- **Storage**: SQLite for offline data
- **State**: React Context + Hooks
- **UI**: Custom components with native look
- **Security**: PIN-based auth + data encryption
- **Network**: Automatic background sync
- **Language**: JavaScript

### Web Dashboard (PHC)
- **Framework**: Next.js 13+ (App Router)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **UI**: Tailwind CSS
- **Charts**: Modern interactive visualizations
- **Language**: TypeScript

## Technology Stack

### Mobile App (ASHA-EHR)
- **Framework**: React Native with Expo
- **Database**: SQLite for offline storage
- **State Management**: React Context
- **UI Components**: Native Base
- **Authentication**: PIN-based system

### Web Dashboard (PHC)
- **Framework**: Next.js 13+ (App Router)
- **UI**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Analytics**: Custom charts and metrics

## Quick Start Guide

### Prerequisites
- Node.js 16+
- npm or yarn
- Firebase account
- Expo CLI (for mobile app)

### 1. First-Time Setup

**Option A: Automated Setup (Recommended)**
```bash
# Clone and setup
git clone https://github.com/sooryanathg/EHR.git
cd EHR

# Run quick start script
# On Windows:
quick-start.bat

# On Linux/Mac:
chmod +x quick-start.sh
./quick-start.sh
```

**Option B: Manual Setup**
```bash
# Clone repository
git clone https://github.com/sooryanathg/EHR.git
cd EHR

# Setup mobile app
cd asha-ehr-clean
npm install

# Setup dashboard
cd ../phc-dashboard
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable required services:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage (for attachments)
3. Get your Firebase config
4. Set up environment files:

**For Mobile App (`asha-ehr-clean/.env`):**
```
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MSG_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
```

**For Dashboard (`phc-dashboard/.env.local`):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MSG_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Run Development Environment

#### Mobile App
```bash
cd asha-ehr-clean

# Start Expo development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (macOS only)
npx expo run:ios
```

#### Web Dashboard
```bash
cd phc-dashboard

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 4. Default Login Credentials

**Mobile App (ASHA)**
- email:asha@gmail.com
- Password: 123456

**Web Dashboard (PHC)**
- Email: admin@phc.local
- Password: password123 (for testing only)

## Key Features In Detail

### Mobile App

#### Offline-First Architecture
- All data stored locally in SQLite
- Work without internet connection
- Background sync when online
- Conflict resolution handling

#### Patient Management
- Register new patients
- Update patient details
- Track pregnancy status
- Monitor child growth
- Record family history

#### Visit Tracking
- Schedule appointments
- Record vital signs
- Track symptoms
- Add notes and observations
- Set follow-up reminders

#### Vaccination Module
- View vaccination schedule
- Record vaccine administration
- Track due/overdue vaccines
- Generate reminder lists

### Web Dashboard

#### Analytics Dashboard
- Key performance indicators
- Patient demographics
- Visit statistics
- Vaccination coverage
- ASHA performance metrics

#### Patient Overview
- Comprehensive patient lists
- Detailed patient profiles
- Visit history
- Vaccination status
- Family connections

#### Geographic Insights
- Village-wise distribution
- Coverage analysis
- Resource allocation
- Risk area identification

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and queries:
- 📧 Email: sooryanathgopi@gmail.com
- 🌐 Website: https://example.com
- 📱 Mobile: +1234567890

## Acknowledgments

- Thanks to all ASHA workers for their feedback
- PHC staff for requirements guidance
- Development team for their contributions

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
