# Android Studio Setup Guide for EVSUeMAP

This guide will help you set up Android Studio to build and run your Expo React Native project on Android devices/emulators.

## Prerequisites

1. **Node.js** (v18 or later) - Already installed ✓
2. **Java Development Kit (JDK)** - Version 17 or 21
3. **Android Studio** - Latest version recommended

---

## Step 1: Install Java Development Kit (JDK)

### Option A: Install JDK 17 (Recommended for React Native)
1. Download JDK 17 from:
   - [Oracle JDK 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)
   - OR [OpenJDK 17](https://adoptium.net/temurin/releases/?version=17)

2. Install JDK 17
3. Set `JAVA_HOME` environment variable:
   - Windows: 
     - Open System Properties → Environment Variables
     - Add new System Variable:
       - Name: `JAVA_HOME`
       - Value: `C:\Program Files\Java\jdk-17` (or your JDK path)
     - Add to PATH: `%JAVA_HOME%\bin`

### Option B: Use Android Studio's Bundled JDK
- Android Studio includes JDK, but you may need to configure it

---

## Step 2: Install Android Studio

1. **Download Android Studio**
   - Visit: https://developer.android.com/studio
   - Download the latest version for Windows

2. **Install Android Studio**
   - Run the installer
   - Follow the setup wizard
   - Choose "Standard" installation (recommended)

3. **Install Android SDK Components**
   - Open Android Studio
   - Go to: **Tools → SDK Manager** (or **More Actions → SDK Manager**)
   - In the **SDK Platforms** tab, install:
     - ✅ Android 14.0 (API 34) - Latest
     - ✅ Android 13.0 (API 33) - Recommended
     - ✅ Android 12.0 (API 31) - Minimum for most devices
   
   - In the **SDK Tools** tab, ensure these are checked:
     - ✅ Android SDK Build-Tools
     - ✅ Android SDK Command-line Tools
     - ✅ Android SDK Platform-Tools
     - ✅ Android Emulator
     - ✅ Intel x86 Emulator Accelerator (HAXM installer) - for better performance

4. **Set Environment Variables**
   - Add to System Environment Variables:
     - `ANDROID_HOME`: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
     - Add to PATH:
       - `%ANDROID_HOME%\platform-tools`
       - `%ANDROID_HOME%\tools`
       - `%ANDROID_HOME%\tools\bin`

---

## Step 3: Generate Native Android Project

Since this is a managed Expo project, you need to prebuild it to generate the native Android folder:

```bash
# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Prebuild the project to generate android/ and ios/ folders
npx expo prebuild

# Or if you want only Android:
npx expo prebuild --platform android
```

**Note:** This will create an `android/` folder in your project root.

---

## Step 4: Configure Android Studio for Your Project

1. **Open Project in Android Studio**
   - Open Android Studio
   - Click **File → Open**
   - Navigate to your project folder: `C:\Users\ZJ\Documents\html codes\EVSUeMAP`
   - Select the `android` folder (created after prebuild)
   - Click **OK**

2. **Sync Gradle**
   - Android Studio will automatically sync Gradle
   - If not, click **File → Sync Project with Gradle Files**
   - Wait for dependencies to download (first time may take several minutes)

3. **Configure SDK**
   - Go to **File → Project Structure** (or press `Ctrl+Alt+Shift+S`)
   - Under **SDK Location**, verify:
     - Android SDK location: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
     - JDK location: Your JDK path

---

## Step 5: Set Up Android Emulator (Optional but Recommended)

1. **Create Virtual Device**
   - In Android Studio, click **Tools → Device Manager**
   - Click **Create Device**
   - Select a device (e.g., **Pixel 6** or **Pixel 7**)
   - Click **Next**
   - Select a system image:
     - Choose **API 33** or **API 34** (Android 13/14)
     - Download if needed
   - Click **Next → Finish**

2. **Start Emulator**
   - In Device Manager, click the ▶️ play button next to your device
   - Wait for emulator to boot (first time may take a few minutes)

---

## Step 6: Run Your Expo Project

### Option A: Using Expo CLI (Recommended)
```bash
# Start Expo development server
npm start

# Then press 'a' to open on Android emulator/device
# Or run:
npm run android
```

### Option B: Using Android Studio
1. Make sure your emulator is running or device is connected
2. In Android Studio, click the **Run** button (▶️) or press `Shift+F10`
3. Select your device/emulator
4. The app will build and install automatically

---

## Step 7: Configure Build Settings (if needed)

### Update `android/build.gradle`:
```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 23
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
    // ...
}
```

### Update `android/app/build.gradle`:
- Ensure `minSdkVersion` is at least 23 (for React Native Maps)
- Verify `targetSdkVersion` matches your compile SDK

---

## Troubleshooting

### Issue: "SDK location not found"
**Solution:** Set `ANDROID_HOME` environment variable correctly

### Issue: "Java version mismatch"
**Solution:** 
- Ensure JDK 17 or 21 is installed
- Set `JAVA_HOME` to point to correct JDK
- In Android Studio: **File → Project Structure → SDK Location → JDK location**

### Issue: "Gradle sync failed"
**Solution:**
- Check internet connection
- Try: **File → Invalidate Caches → Invalidate and Restart**
- Check `android/gradle/wrapper/gradle-wrapper.properties` for correct Gradle version

### Issue: "Emulator won't start"
**Solution:**
- Enable Virtualization in BIOS (Intel VT-x or AMD-V)
- Install HAXM (Intel) or use Hyper-V (Windows)
- Allocate more RAM to emulator in AVD settings

### Issue: "Build failed - NDK not found"
**Solution:**
- Install NDK in SDK Manager: **Tools → SDK Manager → SDK Tools → NDK**

### Issue: "Metro bundler connection issues"
**Solution:**
- Ensure Expo dev server is running: `npm start`
- Check firewall settings
- Try: `npx expo start --clear`

---

## Quick Commands Reference

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Prebuild native code
npx expo prebuild

# Clear cache and rebuild
npx expo start --clear

# Build APK (after prebuild)
cd android
./gradlew assembleRelease

# Build AAB (for Play Store)
cd android
./gradlew bundleRelease
```

---

## Next Steps

1. ✅ Install JDK 17
2. ✅ Install Android Studio
3. ✅ Install Android SDK (API 33/34)
4. ✅ Set environment variables
5. ✅ Run `npx expo prebuild`
6. ✅ Open `android/` folder in Android Studio
7. ✅ Create and start Android emulator
8. ✅ Run `npm run android` to test

---

## Additional Resources

- [Expo Android Development](https://docs.expo.dev/workflow/android/)
- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [Android Studio User Guide](https://developer.android.com/studio/intro)

---

## Notes

- **First build** may take 10-20 minutes (downloading dependencies)
- **Emulator** requires significant RAM (recommend 8GB+ system RAM)
- **Physical device** testing is faster than emulator
- You can use **Expo Go** app for quick testing without Android Studio setup

