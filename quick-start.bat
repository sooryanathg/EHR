@echo off
REM ASHA EHR Quick Start Script for Windows
REM This script helps you get the ASHA EHR system up and running quickly

echo 🏥 ASHA EHR - Quick Start Setup
echo ================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install mobile app dependencies
echo 📱 Installing mobile app dependencies...
cd asha-ehr
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install mobile app dependencies
    pause
    exit /b 1
)
echo ✅ Mobile app dependencies installed

REM Install dashboard dependencies
echo 🖥️ Installing dashboard dependencies...
cd ..\phc-dashboard
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dashboard dependencies
    pause
    exit /b 1
)
echo ✅ Dashboard dependencies installed

REM Check if Expo CLI is installed
expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Expo CLI...
    call npm install -g @expo/cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Expo CLI
        pause
        exit /b 1
    )
    echo ✅ Expo CLI installed
) else (
    echo ✅ Expo CLI is already installed
)

echo.
echo 🎉 Setup Complete!
echo.
echo Next Steps:
echo 1. 📝 Update Firebase configuration in both projects
echo    - asha-ehr\src\auth\authService.js
echo    - phc-dashboard\src\lib\firebase.js
echo.
echo 2. 🚀 Start the mobile app:
echo    cd asha-ehr ^&^& npx expo start
echo.
echo 3. 🌐 Start the dashboard:
echo    cd phc-dashboard ^&^& npm run dev
echo.
echo 4. 📖 Read DEPLOYMENT.md for production deployment
echo.
echo Happy coding! 🎊
pause
