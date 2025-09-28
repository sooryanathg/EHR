#!/bin/bash

# ASHA EHR Quick Start Script
# This script helps you get the ASHA EHR system up and running quickly

echo "🏥 ASHA EHR - Quick Start Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install mobile app dependencies
echo "📱 Installing mobile app dependencies..."
cd asha-ehr
npm install
if [ $? -eq 0 ]; then
    echo "✅ Mobile app dependencies installed"
else
    echo "❌ Failed to install mobile app dependencies"
    exit 1
fi

# Install dashboard dependencies
echo "🖥️ Installing dashboard dependencies..."
cd ../phc-dashboard
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dashboard dependencies installed"
else
    echo "❌ Failed to install dashboard dependencies"
    exit 1
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
    if [ $? -eq 0 ]; then
        echo "✅ Expo CLI installed"
    else
        echo "❌ Failed to install Expo CLI"
        exit 1
    fi
else
    echo "✅ Expo CLI is already installed"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. 📝 Update Firebase configuration in both projects"
echo "   - asha-ehr/src/auth/authService.js"
echo "   - phc-dashboard/src/lib/firebase.js"
echo ""
echo "2. 🚀 Start the mobile app:"
echo "   cd asha-ehr && npx expo start"
echo ""
echo "3. 🌐 Start the dashboard:"
echo "   cd phc-dashboard && npm run dev"
echo ""
echo "4. 📖 Read DEPLOYMENT.md for production deployment"
echo ""
echo "Happy coding! 🎊"
