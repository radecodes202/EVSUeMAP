# EVSU eMAP

Campus navigation app with Supabase backend, admin-defined paths, feedback/help, and offline-friendly mock data fallback.

## Features

- **Auth**: Supabase email/password, roles (admin/user/guest), guest mode
- **Map**: Buildings, admin paths/waypoints overlay, custom-path routing with OSRM fallback, map type toggle (standard/satellite/hybrid/terrain), campus bounds guard
- **Search & Favorites**: Filter by category, search by name/code/description, save favorites
- **Feedback**: In-app feedback form to `user_feedback` table
- **Help/About**: Built-in help guide and about screen
- **Admin data**: Uses Supabase `buildings`, `paths`, `waypoints`, `locations`, etc.

## Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Expo CLI** (installed globally or via npx)
- **Supabase account** (free tier works)
- **Git** (for cloning the repository)

## Quick Start Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/ZJake15/EVSUeMAP.git
cd EVSUeMAP
```

### Step 2: Install Dependencies

```bash
npm install
```

If you encounter dependency issues, try:
```bash
npm install --legacy-peer-deps
```

### Step 3: Set Up Supabase

#### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `evsuemap` (or your choice)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

#### 3.2 Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3.3 Set Up Database Tables (IMPORTANT!)

**⚠️ This step is critical! Without it, you'll get "table not found" errors.**

1. In Supabase dashboard, go to **SQL Editor**
2. Open the `database-setup.sql` file from this project
3. Copy the **entire** SQL script content
4. Paste it into the SQL Editor
5. Click **Run** to execute
6. Verify tables were created:
   - Go to **Table Editor** in Supabase dashboard
   - You should see: `users`, `buildings`, `paths`, `waypoints`, `locations`, `points_of_interest`, `user_feedback`, `favorites`

**Expected tables:**
- `public.users` - User profiles and roles
- `buildings` - Building data with coordinates
- `locations` - Rooms within buildings
- `paths` - Admin-defined paths
- `waypoints` - Ordered points for each path
- `points_of_interest` - POI markers
- `user_feedback` - Feedback submissions
- `favorites` - User favorites

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Create .env file
touch .env
```

Add your Supabase credentials to `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note**: The `.env` file is already in `.gitignore` and won't be committed to git.

### Step 5: Configure App Settings

Open `src/constants/config.js` and verify:

```javascript
// Set to false to use Supabase (true = mock data mode)
export const USE_MOCK_DATA = false;

// API URL (if using legacy API)
export const API_URL = 'your-api-url-if-needed';
```

### Step 6: Run the App

```bash
npx expo start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

## Platform-Specific Setup

### Android Development

1. Install Android Studio
2. Set up Android SDK and emulator
3. See `ANDROID_STUDIO_SETUP.md` for detailed instructions

### iOS Development (macOS only)

1. Install Xcode from App Store
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Install CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```

## Database Schema

### Key Tables

- **`public.users`**: User profiles/roles (extends Supabase auth.users)
- **`buildings`**: Building data (lat/lng, category, name, code)
- **`locations`**: Rooms within buildings
- **`paths`**: Admin-defined paths
- **`waypoints`**: Ordered points for each path
- **`points_of_interest`**: POI markers on map
- **`user_feedback`**: Feedback submissions
- **`favorites`**: User saved favorites

### Database Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Automatic user creation**: Trigger creates user profile on signup
- **PostGIS extension**: For geographic queries (if needed)

## Common Errors and Solutions

### Error: "Could not find the table 'public.users' in the schema cache"

**Solution**: You haven't run the database setup SQL script.

1. Go to Supabase dashboard → SQL Editor
2. Run the `database-setup.sql` script
3. Verify tables exist in Table Editor
4. Restart your app

### Error: "Could not find the table 'public.paths' in the schema cache"

**Solution**: Same as above - run `database-setup.sql` to create all tables.

### Error: "Invalid API key" or "Supabase connection failed"

**Solution**: 
1. Check your `.env` file has correct credentials
2. Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set
3. Restart Expo dev server after changing `.env`
4. Check Supabase dashboard → Settings → API for correct keys

### Error: "Mock data shows up instead of real data"

**Solution**:
1. Check `src/constants/config.js` - `USE_MOCK_DATA` should be `false`
2. Verify Supabase credentials in `.env`
3. Check network connection
4. Verify tables exist in Supabase (run `database-setup.sql`)

### Error: "Row Level Security policy violation"

**Solution**: 
1. Ensure you ran the complete `database-setup.sql` script
2. Check RLS policies in Supabase dashboard → Authentication → Policies
3. Verify user is authenticated before accessing protected data

### Error: Dependency installation fails

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use legacy peer deps
npm install --legacy-peer-deps
```

### Error: Expo start fails

**Solution**:
```bash
# Clear Expo cache
npx expo start -c

# Or clear all caches
npm start -- --reset-cache
```

## Troubleshooting

### App shows mock data
- ✅ Verify Supabase URL/key in `.env`
- ✅ Check `USE_MOCK_DATA = false` in `src/constants/config.js`
- ✅ Verify network connectivity
- ✅ Check console logs for errors

### OSRM routing fails
- ✅ Routing falls back to admin paths or straight-line automatically
- ✅ Check internet connection for OSRM service
- ✅ Verify coordinates are valid

### Authentication not working
- ✅ Verify `database-setup.sql` was run (creates users table and trigger)
- ✅ Check Supabase Auth is enabled in dashboard
- ✅ Verify email confirmation settings in Supabase

### Build errors on Android/iOS
- ✅ Run `npx expo install` for platform-specific packages
- ✅ Clear build cache: `npx expo start -c`
- ✅ Check platform-specific setup guides

## Development Workflow

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test

3. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. Push to your fork:
   ```bash
   git push origin main
   ```

### Syncing with Upstream

To get updates from the original repository:

```bash
# Fetch changes
git fetch upstream

# Merge into your branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

## Project Structure

```
EVSUeMAP/
├── src/
│   ├── components/      # Reusable UI components
│   ├── constants/       # App constants and config
│   ├── context/         # React Context providers
│   ├── lib/             # Utilities and services
│   ├── screens/         # App screens
│   ├── services/        # API and data services
│   └── utils/           # Helper functions
├── assets/              # Images and static files
├── database-setup.sql   # Database schema (RUN THIS!)
├── app.json             # Expo configuration
└── package.json         # Dependencies
```

## Routing Logic

1. **First**: Try admin-defined paths (closest endpoints within ~0.5 km)
2. **Second**: Call OSRM public service
3. **Fallback**: Straight-line route if all else fails

## Map Features

- **Buildings**: Render as rectangles (footprint) plus markers
- **Admin paths**: Render as dashed polylines
- **Map types**: Standard, satellite, hybrid, terrain
- **Campus bounds**: Guard to keep map focused on campus

## Additional Resources

- **Supabase Setup**: See `SUPABASE_CONFIGURATION.md`
- **User Management**: See `USER_MANAGEMENT_GUIDE.md`
- **Admin Panel**: See `ADMIN_PANEL_SETUP.md`
- **Android Setup**: See `ANDROID_STUDIO_SETUP.md` (if available)

## Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Verify all setup steps were completed
3. Check Supabase dashboard for errors
4. Review console logs in Expo dev tools
5. Ensure `database-setup.sql` was run completely

## License

[Add your license information here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a Pull Request

---

**Important Reminders:**
- ⚠️ **Always run `database-setup.sql`** before using the app
- ⚠️ **Never commit `.env` file** (already in `.gitignore`)
- ⚠️ **Use anon key only** in mobile app (never service_role key)
- ✅ App works with mock data if Supabase isn't configured
- ✅ All database errors are handled gracefully with fallbacks
