# 📱 EVSU eMAP - Android Studio Demo Guide

Using Android Studio is a **great option** for your university demo! You can run the app on an emulator or a real Android device.

---

## 🎯 Why Android Studio?

✅ **Full native app experience** - All features work perfectly  
✅ **No Expo Go needed** - Standalone app  
✅ **Emulator option** - Run on computer screen (great for presentations)  
✅ **Real device option** - Install on Android phones/tablets  
✅ **Professional demo** - Shows you can build production apps  

---

## 📋 Prerequisites

Before starting, make sure you have:

- [ ] **Android Studio** installed ([Download here](https://developer.android.com/studio))
- [ ] **Java JDK** (usually comes with Android Studio)
- [ ] **Node.js** installed (you already have this)
- [ ] **Expo CLI** (comes with your project)

---

## 🚀 Step-by-Step Setup

### Step 1: Generate Android Project

Your Expo project needs to generate native Android code first:

```bash
# In your project directory
npx expo prebuild --platform android
```

This creates the `android/` folder with all native Android code.

**Note:** This only needs to be done once (or if you change native configs).

### Step 2: Open in Android Studio

1. **Open Android Studio**
2. **File → Open**
3. Navigate to your project folder: `C:\Users\Nino\Desktop\EVSUeMAP`
4. Select the `android` folder (not the root folder)
5. Click **OK**

Android Studio will:
- Sync Gradle files
- Download dependencies
- Index the project (takes a few minutes first time)

### Step 3: Set Up Emulator (Option A - Recommended for Demo)

**Best for:** Showing on computer screen/projector

1. **Tools → Device Manager** (or click the device icon in toolbar)
2. **Create Device**
3. Choose a device (e.g., **Pixel 6** or **Pixel 7**)
4. Choose a system image:
   - **API 33** (Android 13) or **API 34** (Android 14)
   - Click **Download** if not installed
5. Click **Finish**

**Recommended Settings:**
- Device: Pixel 6 or Pixel 7
- API Level: 33 or 34
- RAM: 2048 MB (default is fine)

### Step 4: Run on Emulator

**Method A: Android Studio UI**
1. **Start the Metro bundler** (in terminal):
   ```bash
   npm start
   ```
   Keep this running!

2. **In Android Studio:**
   - Select your emulator from device dropdown (top toolbar)
   - Make sure "app" is selected in configuration dropdown
   - Click the **▶️ Run** button (green play icon)
   - OR press `Shift + F10`

3. **First time:** Android Studio will build the app (takes 5-10 minutes)
   - Subsequent runs are much faster (30 seconds)

4. **The app will launch** on the emulator!

**Method B: Command Line (EASIER - Recommended)**
```bash
# Terminal 1 - Start Metro
npm start

# Terminal 2 - Run on device/emulator
npx expo run:android
```
This is often more reliable than Android Studio UI!

---

## 📲 Option B: Run on Real Device

**Best for:** More realistic demo, better performance

### Setup:

1. **Enable Developer Options** on your Android device:
   - Go to **Settings → About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings → Developer Options**
   - Enable **USB Debugging**

2. **Connect device** via USB cable

3. **Allow USB Debugging** (popup on phone - click Allow)

4. **In Android Studio:**
   - Your device should appear in device dropdown
   - Make sure "app" configuration is selected
   - Select your device and click **▶️ Run**
   
   **OR use command line (easier):**
   ```bash
   # Terminal 1
   npm start
   
   # Terminal 2
   npx expo run:android
   ```
   
   **Note:** If you see "Start Mirror" instead of "Run", see **FIX_DEVICE_RUN.md** for troubleshooting

---

## 🎯 For Your University Demo

### Recommended Setup:

1. **Before going to university:**
   ```bash
   # Generate Android project (one time)
   npx expo prebuild --platform android
   
   # Test it works
   npm start
   # Then in Android Studio: Run on emulator
   ```

2. **At university:**
   - **Option A:** Use emulator on your laptop (connect to projector)
   - **Option B:** Bring Android device, connect via USB
   - **Option C:** Build APK beforehand, install on multiple devices

---

## 📦 Building APK for Distribution

If you want to install on multiple devices without Android Studio:

### Method 1: Build in Android Studio

1. **Build → Generate Signed Bundle / APK**
2. Choose **APK**
3. Create a keystore (first time only):
   - **Key store path:** Choose location
   - **Password:** Create a password
   - **Key alias:** `evsuemap`
   - **Validity:** 25 years
   - Fill in certificate info
4. Choose **release** build variant
5. Click **Finish**
6. APK location: `android/app/release/app-release.apk`

### Method 2: Command Line (Faster)

```bash
# Navigate to android folder
cd android

# Build release APK
.\gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

Then transfer APK to devices and install!

---

## 🔧 Troubleshooting

### "SDK location not found"
- **Fix:** Android Studio → **File → Project Structure → SDK Location**
- Set Android SDK path (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)

### "Gradle sync failed"
- **Fix:** 
  ```bash
  cd android
  .\gradlew clean
  ```
  Then in Android Studio: **File → Sync Project with Gradle Files**

### "Metro bundler not found"
- **Fix:** Make sure `npm start` is running in a separate terminal

### Emulator is slow
- **Fix:** 
  - Enable **Hardware Acceleration** in Android Studio
  - Use a smaller device (Pixel 4 instead of Pixel 7)
  - Reduce RAM allocation in AVD settings

### App crashes on launch
- **Check:** 
  - Metro bundler is running (`npm start`)
  - Supabase connection (check `src/lib/supabase.js`)
  - Internet connection (for Supabase)

### "Build failed" errors
- **Fix:** 
  ```bash
  cd android
  .\gradlew clean
  npx expo prebuild --clean --platform android
  ```

---

## ⚡ Quick Commands Reference

```bash
# Generate Android project
npx expo prebuild --platform android

# Start Metro bundler (keep running)
npm start

# Build APK (from android folder)
cd android
.\gradlew assembleRelease

# Clean build
cd android
.\gradlew clean
```

---

## 🎓 Demo Day Checklist

**Before University:**
- [ ] Android Studio installed
- [ ] Generated Android project (`npx expo prebuild`)
- [ ] Tested on emulator - works!
- [ ] Tested on real device - works!
- [ ] Built APK (backup option)
- [ ] All features tested (login, map, search, routing)

**At University:**
- [ ] Laptop charged
- [ ] Android Studio ready
- [ ] Emulator configured OR device connected
- [ ] Metro bundler script ready (`npm start`)
- [ ] Internet connection (for Supabase)
- [ ] Backup: APK file on USB drive

---

## 💡 Pro Tips

1. **Use Emulator for Presentation:**
   - Easier to show on projector
   - No device connection issues
   - Consistent experience

2. **Have APK Ready:**
   - Build APK beforehand
   - Install on multiple devices
   - Let people test on their phones

3. **Test Everything First:**
   - Run through entire demo at home
   - Note any issues
   - Have fixes ready

4. **Performance:**
   - Emulator needs good RAM (8GB+ recommended)
   - Close other apps during demo
   - Use release build for smoother performance

---

## 🆚 Android Studio vs Web Demo

| Feature | Android Studio | Web Demo |
|---------|---------------|----------|
| **Setup Time** | 10-15 min (first time) | 2 min |
| **Map Features** | ✅ Full interactive maps | ⚠️ Building list only |
| **Location** | ✅ Real GPS | ⚠️ Browser location |
| **Performance** | ✅ Native speed | ⚠️ Browser speed |
| **Professional** | ✅ Very professional | ✅ Good |
| **Ease** | ⚠️ More setup | ✅ Very easy |

**Recommendation:** Use **Android Studio** if you have time to set up. Use **Web** as backup.

---

## 🎯 Recommended Demo Flow with Android Studio

1. **Introduction** (2 min)
   - Show app running on emulator/device
   - Explain what it does

2. **Live Demo** (7-10 min)
   - Login/Register
   - Show interactive map (zoom, pan)
   - Search buildings
   - Navigate to building (show route)
   - Chatbot interaction
   - Favorites

3. **Technical Overview** (3-5 min)
   - Show Android Studio
   - Explain architecture
   - Database structure
   - Custom routing

4. **Q&A** (remaining time)

---

## 📞 Need Help?

If Android Studio setup is too complex:
- **Fallback to Web:** `npm run web` (much easier)
- **Use APK:** Build once, install on devices
- **Video Demo:** Pre-record if tech fails

Good luck! 🚀

