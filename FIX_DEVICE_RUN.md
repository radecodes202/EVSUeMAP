# 🔧 Fix: "Start Mirror" Instead of "Run" in Android Studio

If you see "Start Mirror" instead of "Run" when your phone is connected, follow these steps:

---

## ✅ Step-by-Step Fix

### 1. Check Device Recognition

**In Android Studio:**
- Look at the **top toolbar** - you should see a device dropdown
- Your phone should appear there (e.g., "SM-G950F" or your phone model)
- If it says "No devices" or doesn't appear, see troubleshooting below

### 2. Select the App Configuration

**In Android Studio toolbar:**
- Look for a dropdown that says **"app"** (next to the device dropdown)
- Make sure **"app"** is selected (not "No run configurations")

If "app" doesn't exist:
1. Click the dropdown → **Edit Configurations...**
2. Click **+** → **Android App**
3. Name: `app`
4. Module: `app`
5. Click **OK**

### 3. Build the Project First

**Before running, build once:**
- **Build → Make Project** (or press `Ctrl+F9`)
- Wait for build to complete
- This creates the APK that will be installed

### 4. Run the App

**Now try running:**
- Select your device from device dropdown
- Click the **▶️ Run** button (green play icon)
- OR press `Shift + F10`

---

## 🔍 Troubleshooting

### Device Not Appearing?

1. **Check USB Debugging:**
   - On phone: Settings → Developer Options → USB Debugging (should be ON)
   - Try unplugging and replugging USB cable
   - On phone: Allow USB debugging when prompted

2. **Check ADB:**
   ```bash
   # In terminal/command prompt
   adb devices
   ```
   - Should show your device with "device" status
   - If it says "unauthorized", allow on phone

3. **Install USB Drivers:**
   - Some phones need manufacturer USB drivers
   - Samsung: Install Samsung USB drivers
   - Other brands: Check manufacturer website

### "No run configurations" Error?

1. **Sync Gradle:**
   - **File → Sync Project with Gradle Files**
   - Wait for sync to complete

2. **Invalidate Caches:**
   - **File → Invalidate Caches / Restart**
   - Choose **Invalidate and Restart**

3. **Check build.gradle:**
   - Make sure `android/app/build.gradle` exists
   - If missing, run: `npx expo prebuild --platform android --clean`

### Build Fails?

1. **Clean Build:**
   ```bash
   cd android
   .\gradlew clean
   ```
   Then in Android Studio: **Build → Rebuild Project**

2. **Check Gradle Version:**
   - Android Studio should handle this automatically
   - If errors, check `android/build.gradle` for Gradle version

---

## 🚀 Quick Alternative: Use Command Line

If Android Studio UI is giving you trouble, use command line:

### Terminal 1 - Start Metro:
```bash
npm start
```

### Terminal 2 - Run on Device:
```bash
npx expo run:android
```

This will:
- Build the app
- Install on your connected device
- Launch automatically

**Much simpler!** This is often easier than using Android Studio's UI.

---

## 📱 Alternative: Build APK and Install Manually

If nothing works, build APK and install manually:

### Build APK:
```bash
cd android
.\gradlew assembleRelease
```

### Find APK:
- Location: `android/app/build/outputs/apk/release/app-release.apk`

### Install:
- Transfer APK to phone
- Open on phone and install
- Enable "Install from Unknown Sources" if needed

---

## ✅ Quick Checklist

- [ ] Phone connected via USB
- [ ] USB Debugging enabled on phone
- [ ] Device appears in Android Studio device dropdown
- [ ] "app" configuration selected in Android Studio
- [ ] Metro bundler running (`npm start`)
- [ ] Project built successfully (Build → Make Project)
- [ ] Click Run button (not Mirror)

---

## 💡 Pro Tip

**Easiest method:** Use command line instead of Android Studio UI:

```bash
# Terminal 1
npm start

# Terminal 2 (new terminal)
npx expo run:android
```

This bypasses all Android Studio UI issues and works directly!

---

If still having issues, try the command line method - it's usually more reliable! 🚀

