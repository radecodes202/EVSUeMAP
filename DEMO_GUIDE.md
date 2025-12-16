# 🎯 EVSU eMAP - University Demo Guide

Since you cannot use Expo Go at the university, here are **3 reliable ways** to demo your app:

---

## 🎯 Option 0: Android Studio (BEST - Full Native Experience)

**Best for:** Professional demo with full features

See **ANDROID_STUDIO_DEMO_GUIDE.md** for complete instructions.

**Quick Start:**
```bash
# Generate Android project (one time)
npx expo prebuild --platform android

# Start Metro bundler
npm start

# Then in Android Studio: Open android/ folder and Run
```

**Advantages:**
- ✅ Full interactive maps
- ✅ All native features work
- ✅ Can use emulator (show on screen) or real device
- ✅ Very professional

---

## 🌐 Option 1: Web Version (EASIEST - Quick Setup)

**Best for:** Quick demo on any computer with a browser

### Steps:

1. **Before going to university:**
   ```bash
   npm install
   npm run web
   ```
   OR use the quick launcher:
   ```bash
   # Windows
   demo-web.bat
   
   # Mac/Linux  
   chmod +x demo-web.sh && ./demo-web.sh
   ```
   This will start the app at `http://localhost:8081` (or similar)

2. **At the university:**
   - Connect your laptop to the projector/screen
   - Open browser and go to `http://localhost:8081`
   - The app will run in the browser!

### Advantages:
- ✅ No installation needed
- ✅ Works on any computer
- ✅ Easy to show on projector
- ✅ All features work (except native GPS - but you can simulate location)

### Note:
- **Maps on Web:** Your app already has a web fallback! On web, it shows a building list instead of the interactive map (maps work fully on mobile)
- **Location:** Browser will ask for location permission
- **All Other Features Work:** Search, navigation logic, chatbot, favorites all work perfectly on web
- Make sure your laptop has internet connection for Supabase

### Quick Start:
```bash
# Windows
demo-web.bat

# Mac/Linux
chmod +x demo-web.sh
./demo-web.sh

# Or manually:
npm run web
```

---

## 📱 Option 2: Standalone APK (For Android Devices)

**Best for:** If you have Android phones/tablets available

### Steps:

1. **Build the APK on your computer:**
   ```bash
   # Install EAS CLI (if not already installed)
   npm install -g eas-cli
   
   # Login to Expo
   eas login
   
   # Build APK
   eas build --platform android --profile preview
   ```
   
   OR use local build:
   ```bash
   npx expo prebuild
   npx expo run:android --variant release
   ```

2. **Find the APK:**
   - EAS build: Download from Expo dashboard
   - Local build: `android/app/build/outputs/apk/release/app-release.apk`

3. **Install on devices:**
   - Transfer APK to Android device
   - Enable "Install from Unknown Sources" in settings
   - Install the APK
   - App works without Expo Go!

### Advantages:
- ✅ Full native app experience
- ✅ All features work (GPS, maps, etc.)
- ✅ Can install on multiple devices
- ✅ No internet needed for demo (if data is cached)

---

## 🎥 Option 3: Pre-recorded Video Demo

**Best for:** Backup option or if nothing else works

### Steps:

1. **Record your screen:**
   - Use OBS Studio, QuickTime (Mac), or Windows Game Bar
   - Show all key features:
     - Login/Registration
     - Map view with buildings
     - Search functionality
     - Navigation/routing
     - Chatbot
     - Favorites

2. **Create a presentation:**
   - Show video + explain features
   - Have code/documentation ready for questions

### Advantages:
- ✅ Guaranteed to work
- ✅ Can show best-case scenario
- ✅ Professional presentation
- ✅ No technical issues during demo

---

## 🚀 Quick Start: Web Demo (Recommended)

### Right Now - Test Web Version:

```bash
# In your project directory
npm install
npm run web
```

Then open `http://localhost:8081` in your browser.

### If Maps Don't Work on Web:

`react-native-maps` needs special setup for web. You may need to:

1. **Use a web-compatible map library** OR
2. **Show a message** that maps work on mobile but demo the other features

### Web-Specific Considerations:

- **Location:** Browser will ask for location permission
- **Maps:** Your app has a smart web fallback - it shows a building list with map placeholder on web (full interactive maps work on mobile)
- **Storage:** Uses browser localStorage instead of AsyncStorage (works the same)
- **Navigation:** All navigation features work the same
- **What Works on Web:**
  - ✅ Login/Registration
  - ✅ Search buildings
  - ✅ Building list view
  - ✅ Navigation/routing logic
  - ✅ Chatbot
  - ✅ Favorites
  - ✅ Settings
  - ⚠️ Interactive map (shows building list instead - explain this is mobile-optimized)

---

## 📋 Pre-Demo Checklist

Before going to university:

- [ ] Test web version on your laptop (`npm run web`)
- [ ] Test all features work (login, search, map, routing)
- [ ] Have Supabase connection working
- [ ] Prepare backup: APK or video
- [ ] Bring laptop charger
- [ ] Test internet connection at university (or use mobile hotspot)
- [ ] Have documentation ready (PROJECT_DOCUMENTATION.md)

---

## 🔧 Troubleshooting

### Web version won't start:
```bash
# Clear cache and try again
npm run web:clear
```

### Maps not showing on web:
- This is expected - `react-native-maps` has limited web support
- Focus demo on other features (search, navigation logic, UI)
- Or use a web map library like `react-map-gl` for web version

### Can't connect to Supabase:
- Check internet connection
- Verify Supabase URL/key in `src/lib/supabase.js`
- Use mock data mode: Set `USE_MOCK_DATA = true` in `src/constants/config.js`

### Location not working:
- Browser needs location permission
- On web, you can manually set location for demo purposes

---

## 💡 Demo Tips

1. **Start with web version** - easiest and most reliable
2. **Have APK ready** - if someone wants to test on their phone
3. **Show code** - be ready to explain architecture
4. **Highlight key features:**
   - Custom routing system (no external APIs)
   - Real-time building data
   - Admin path creation
   - User favorites
   - Chatbot integration

---

## 🎯 Recommended Demo Flow

1. **Introduction** (2 min)
   - What the app does
   - Problem it solves

2. **Live Demo - Web Version** (5-7 min)
   - Login/Register
   - Map view
   - Search buildings
   - Navigate to building
   - Show routing
   - Chatbot

3. **Technical Overview** (3-5 min)
   - Architecture
   - Database structure
   - Custom routing algorithm
   - Tech stack

4. **Q&A** (remaining time)

---

## 📞 Need Help?

If web version has issues, you can:
1. Use the APK on your own phone
2. Show pre-recorded video
3. Focus on code walkthrough instead

Good luck with your demo! 🎓

