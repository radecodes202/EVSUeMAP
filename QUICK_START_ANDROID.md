# Quick Start Guide - Android Studio Setup ✅

## ✅ What's Already Done

1. ✓ **Node.js v25.2.1** - Installed and working
2. ✓ **Java 21** - Installed and working  
3. ✓ **Android SDK** - Found at `C:\Users\ZJ\AppData\Local\Android\Sdk`
   - API 35 and API 36 installed
4. ✓ **Android Native Project** - Generated (`android/` folder created)
5. ✓ **Environment Variables** - ANDROID_HOME and PATH configured

---

## 🚀 Next Steps

### Step 1: Install Android Studio (if not already installed)

1. Download from: https://developer.android.com/studio
2. Install with default settings
3. Open Android Studio and let it complete the setup wizard

### Step 2: Open Your Project in Android Studio

1. **Open Android Studio**
2. Click **File → Open** (or **Open an Existing Project**)
3. Navigate to: `C:\Users\ZJ\Documents\html codes\EVSUeMAP`
4. **Select the `android` folder** (not the root project folder)
5. Click **OK**

### Step 3: Wait for Gradle Sync

- Android Studio will automatically sync Gradle
- First time may take 5-15 minutes (downloading dependencies)
- Watch the bottom status bar for progress
- If sync fails, click **File → Sync Project with Gradle Files**

### Step 4: Set Up Android Emulator (Optional)

1. In Android Studio: **Tools → Device Manager**
2. Click **Create Device**
3. Choose a device (e.g., **Pixel 6**)
4. Select system image: **API 33** or **API 34** (download if needed)
5. Click **Finish**
6. Start the emulator by clicking the ▶️ play button

### Step 5: Run Your App

**Option A: Using Terminal (Recommended)**
```bash
# Make sure you're in the project root
cd "C:\Users\ZJ\Documents\html codes\EVSUeMAP"

# Start Expo dev server
npm start

# Then press 'a' to open on Android
# OR run directly:
npm run android
```

**Option B: Using Android Studio**
1. Make sure emulator is running or device is connected
2. Click the **Run** button (▶️) or press `Shift+F10`
3. Select your device/emulator
4. Wait for build to complete

---

## 🔧 Verify Your Setup

Run these commands to verify everything is set up:

```powershell
# Check Node.js
node --version
# Should show: v25.2.1

# Check Java
java -version
# Should show: Java 21

# Check Android SDK
$env:ANDROID_HOME
# Should show: C:\Users\ZJ\AppData\Local\Android\Sdk

# Check ADB (Android Debug Bridge)
adb version
# Should show version number
```

---

## 📱 Testing Options

### Option 1: Physical Android Device
1. Enable **Developer Options** on your phone
2. Enable **USB Debugging**
3. Connect via USB
4. Run `npm run android`

### Option 2: Android Emulator
1. Create emulator in Android Studio (Step 4 above)
2. Start emulator
3. Run `npm run android`

### Option 3: Expo Go (Quick Testing)
- Install **Expo Go** app from Play Store
- Run `npm start`
- Scan QR code with Expo Go app
- No Android Studio needed for this method!

---

## 🐛 Common Issues & Solutions

### Issue: "SDK location not found"
**Solution:** Restart your terminal/IDE after running the setup script

### Issue: "Gradle sync failed"
**Solution:**
- Check internet connection
- Try: **File → Invalidate Caches → Invalidate and Restart**
- Wait for all downloads to complete

### Issue: "Build failed"
**Solution:**
- Make sure you're using the `android` folder, not root project
- Check that all SDK components are installed
- Try: `cd android && .\gradlew clean`

### Issue: "Emulator won't start"
**Solution:**
- Enable Virtualization in BIOS
- Allocate more RAM (4GB+) to emulator
- Use a physical device instead

---

## 📝 Project Configuration

Your project is configured with:
- **Package Name:** `com.evsu.emap`
- **Min SDK:** 23 (Android 6.0)
- **Target SDK:** 34 (Android 14)
- **Permissions:** Location (Fine & Coarse)

---

## 🎯 You're Ready!

Your project is set up and ready for Android development. Just:
1. Install Android Studio (if needed)
2. Open the `android` folder in Android Studio
3. Wait for Gradle sync
4. Run `npm run android` or use Android Studio's run button

Happy coding! 🚀

