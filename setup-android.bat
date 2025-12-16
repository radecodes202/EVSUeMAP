@echo off
echo ========================================
echo   EVSU eMAP - Android Studio Setup
echo ========================================
echo.
echo This will generate the Android project files.
echo After this completes, open Android Studio and:
echo   1. File -^> Open
echo   2. Select the 'android' folder in this project
echo   3. Wait for Gradle sync
echo   4. Run the app!
echo.
echo ========================================
echo.

echo Generating Android project...
npx expo prebuild --platform android

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Open Android Studio
echo   2. File -^> Open -^> Select 'android' folder
echo   3. Wait for Gradle sync (first time takes 5-10 min)
echo   4. Start Metro: npm start
echo   5. In Android Studio: Click Run button
echo.
pause

