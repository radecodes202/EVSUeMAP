# EVSU eMAP - Complete Project Documentation

## 📍 How Routing Works

### Overview
The routing system uses **custom paths** created by admins in the database. It does NOT use external routing services like OSRM or Google Maps. All routes are based on waypoints that admins define.

### Step-by-Step Routing Process

#### 1. **User Requests Navigation**
```
User taps "Navigate" button → MapScreen.calculateRoute(userLocation, buildingLocation)
```

#### 2. **Fetch Custom Paths**
```javascript
// src/utils/routing.js - calculateRoute()
const customPaths = await getCustomPaths();
```
- Calls `mapService.getPaths()` which queries Supabase
- Gets all active paths with their waypoints (ordered by sequence)
- Returns array like: `[{ path_id: 1, path_name: "Main Walkway", waypoints: [...] }]`

#### 3. **Find Best Path**
```javascript
// src/utils/routing.js - findBestCustomPath()
```
For each path:
- **Find nearest waypoint to START** (user location)
- **Find nearest waypoint to END** (destination building)
- **Calculate score** = distance to start waypoint + distance to end waypoint
- **Pick path with lowest score** (closest combined distance)

**Example:**
```
User at: (11.2440, 125.0020)
Building at: (11.2450, 125.0030)

Path A: 
  - Nearest to start: waypoint 3 (distance: 0.05 km)
  - Nearest to end: waypoint 8 (distance: 0.08 km)
  - Score: 0.13 km

Path B:
  - Nearest to start: waypoint 1 (distance: 0.15 km)
  - Nearest to end: waypoint 5 (distance: 0.10 km)
  - Score: 0.25 km

✅ Path A wins (lower score)
```

#### 4. **Build Route Coordinates**
```javascript
// src/utils/routing.js - buildSinglePathRoute()
```
- Gets waypoints between start and end waypoints
- Determines direction (forward or reverse based on sequence numbers)
- Creates coordinate array: `[userLocation, ...waypoints, buildingLocation]`
- Calculates total distance by summing distances between each point
- Calculates walking time (distance × walking speed)

#### 5. **Display Route**
```javascript
// src/screens/MapScreen.js
setRouteCoordinates(route.coordinates);
// Renders as Polyline on map
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `getCustomPaths()` | Fetches paths from Supabase |
| `findBestCustomPath()` | Finds path with closest waypoints to start/end |
| `buildSinglePathRoute()` | Builds coordinate array from waypoints |
| `calculateRoute()` | Main function - orchestrates the routing |
| `calculateDistance()` | Calculates distance between two coordinates (Haversine formula) |
| `calculateWalkingTime()` | Converts distance to walking time |

### Database Structure

**Paths Table:**
- `path_id` - Unique ID
- `path_name` - Name (e.g., "Main Walkway")
- `path_type` - Type (walkway, road, stairs, etc.)
- `is_active` - Whether path is enabled

**Waypoints Table:**
- `waypoint_id` - Unique ID
- `path_id` - Which path this belongs to
- `sequence` - Order (0, 1, 2, 3...)
- `latitude`, `longitude` - Location
- `is_accessible` - Whether accessible

### Route Types

1. **Custom Path Route** (`isCustomPath: true`)
   - Uses admin-defined waypoints
   - Shows path name to user
   - Most accurate

2. **Direct Route** (`isDirectRoute: true`)
   - Straight line when no path covers the route
   - Shows message: "No custom path available"

### Limitations

- **Single Path Only**: Currently only routes on ONE path (start and end must be on same path)
- **No Cross-Path Routing**: Can't route from Path A to Path B (would need `path_connections` table)
- **500m Threshold**: Path must be within 500m combined distance to start/end

---

## 📁 Complete File Structure & Documentation

### Root Files

#### `App.js`
**Purpose**: Main application entry point
- Sets up React Native app
- Wraps app with `AuthProvider` (authentication context)
- Handles deep linking for email confirmation
- Renders `AuthNavigator` (decides login vs main app)

**Key Features:**
- Deep link handling for `evsuemap://auth/callback`
- Extracts tokens from email confirmation links
- Sets Supabase session automatically

#### `app.json`
**Purpose**: Expo configuration file
- App metadata (name, version, icon)
- Platform-specific settings (iOS, Android, Web)
- Deep linking scheme: `evsuemap://`
- Android intent filters for email confirmation

#### `package.json`
**Purpose**: Node.js dependencies and scripts
- Lists all npm packages
- Defines scripts: `start`, `android`, `ios`, `web`
- React Native, Expo, Supabase, Maps dependencies

#### `index.js`
**Purpose**: React Native entry point
- Registers the app component
- Required by React Native

#### `metro.config.js`
**Purpose**: Metro bundler configuration
- Configures how JavaScript is bundled
- Asset resolution settings

#### `supabase-fresh-setup.sql`
**Purpose**: Complete database schema
- Creates all tables (users, buildings, paths, waypoints, etc.)
- Sets up Row Level Security (RLS) policies
- Creates functions, triggers, indexes
- **Run this in Supabase SQL Editor to set up database**

---

### `src/` Directory Structure

#### **`src/components/`** - Reusable UI Components

##### `BuildingCard.js`
**Purpose**: Displays building information in a card format
- Shows building name, code, category
- Distance from user
- Favorite button
- Used in SearchScreen and FavoritesScreen

##### `CategoryPicker.js`
**Purpose**: Filter buildings by category
- Dropdown/picker component
- Categories: academic, administrative, facilities, etc.

##### `ControlButton.js`
**Purpose**: Reusable button component
- Used for map controls (center on user, center on campus, clear route)
- Consistent styling across app

##### `ErrorView.js`
**Purpose**: Error display component
- Shows error messages with retry button
- Used when API calls fail or data can't load

##### `InfoCard.js`
**Purpose**: Information card overlay
- Shows building details when marker is tapped
- Displays on map screen
- Can navigate to building

##### `LoadingView.js`
**Purpose**: Loading spinner component
- Shows while data is fetching
- Can show retry button if loading fails

---

#### **`src/constants/`** - App Constants

##### `config.js`
**Purpose**: App-wide configuration
- `USE_MOCK_DATA` - Toggle mock data mode
- `API_URL` - Backend API URL (if using separate backend)
- `EVSU_CENTER` - Campus center coordinates
- `CAMPUS_BOUNDARIES` - Map boundaries
- `WALKING_SPEED_KM_PER_MIN` - For route time calculation

##### `categories.js`
**Purpose**: Building category definitions
- List of all building categories
- Category colors, icons

##### `theme.js`
**Purpose**: UI theme constants
- Colors (primary, secondary, error, etc.)
- Typography (font sizes, weights)
- Spacing (margins, padding)
- Border radius, shadows
- Consistent styling across app

---

#### **`src/context/`** - React Context Providers

##### `AuthContext.js`
**Purpose**: Authentication state management
- Manages user login/logout/registration
- Stores user session in AsyncStorage
- Provides `useAuth()` hook to all components
- Handles Supabase authentication
- Auto-creates user profile in database

**Key Functions:**
- `login(email, password)` - Sign in user
- `register(email, password)` - Create new account
- `logout()` - Sign out
- `isAdmin()` - Check if user is admin
- `loginAsGuest()` - Guest mode

---

#### **`src/lib/`** - External Library Configurations

##### `supabase.js`
**Purpose**: Supabase client setup
- Creates Supabase client instance
- Configures authentication storage (AsyncStorage)
- Sets up auto-refresh tokens
- Exports `supabase` client for use throughout app
- Exports `isSupabaseConfigured()` helper

---

#### **`src/navigation/`** - Navigation Structure

##### `AuthNavigator.js`
**Purpose**: Handles authentication flow
- Shows `LoginScreen` if not authenticated
- Shows `RegisterScreen` for signup
- Shows `MainNavigator` if authenticated
- Decides which screen to show based on auth state

##### `MainNavigator.js`
**Purpose**: Main app navigation (bottom tabs)
- Tab navigation with 5 screens:
  - Map
  - Search
  - Chatbot
  - Favorites
  - Settings
- Header with logout button
- Tab bar styling

##### `SettingsNavigator.js`
**Purpose**: Settings screen navigation
- Stack navigator for settings-related screens
- Settings, About, Help, Feedback screens

---

#### **`src/screens/`** - App Screens

##### `MapScreen.js`
**Purpose**: Main map view
- Displays interactive map with buildings
- Shows user location
- Renders building polygons (with rotation support)
- Displays custom paths as polylines
- Route calculation and display
- Building markers and info cards
- Map controls (center, clear route, map type)

**Key Features:**
- Building polygons with dimensions (width, height, rotation)
- Custom path visualization
- Route polyline rendering
- Location permissions handling
- Real-time location tracking

##### `SearchScreen.js`
**Purpose**: Building search interface
- Search buildings by name, code, description
- Filter by category
- Display results as cards
- Navigate to building on map
- Add/remove favorites
- Shows distance from user

##### `ChatbotScreen.js`
**Purpose**: AI assistant interface
- Chat interface for campus questions
- Keyword-based responses (can be enhanced with AI)
- Suggested questions
- Chat history

##### `FavoritesScreen.js`
**Purpose**: User's favorite buildings
- Lists saved favorite buildings
- Remove favorites
- Navigate to favorites on map
- Stored in AsyncStorage (local) or Supabase

##### `FeedbackScreen.js`
**Purpose**: User feedback submission
- Submit bug reports, suggestions, complaints
- Category selection
- Rating (1-5 stars)
- Saves to `user_feedback` table in Supabase

##### `LoginScreen.js`
**Purpose**: User login
- Email and password input
- Login button
- Navigate to register
- Guest login option
- Error handling

##### `RegisterScreen.js`
**Purpose**: User registration
- Email and password input (no username needed)
- Password confirmation
- Creates account in Supabase
- Handles email confirmation requirement
- Navigates to login after registration

##### `SettingsScreen.js`
**Purpose**: App settings
- User profile display (email, role)
- Account settings
- Preferences
- Help & Support links
- Logout button
- App version

##### `AboutScreen.js`
**Purpose**: App information
- App description
- Features list
- Version info
- Links to help/resources

##### `HelpScreen.js`
**Purpose**: Help documentation
- How to use the app
- FAQ
- Troubleshooting tips

---

#### **`src/services/`** - Data Services

##### `mapService.js`
**Purpose**: All map-related data operations
- Fetches buildings from Supabase
- Searches buildings
- Gets nearby buildings (using PostGIS function)
- Gets building details with locations
- Fetches custom paths with waypoints
- Real-time subscriptions for building changes
- Handles mock data fallback

**Key Functions:**
- `getBuildings()` - Get all buildings
- `search(query)` - Search buildings
- `getNearby(lat, lng, radius)` - Find nearby buildings
- `getBuildingDetails(id)` - Get single building with locations
- `getPaths()` - Get custom paths with waypoints
- `subscribeToBuildings(callback)` - Real-time updates

---

#### **`src/utils/`** - Utility Functions

##### `routing.js`
**Purpose**: Route calculation logic
- **Main routing system** (explained in detail above)
- Uses custom paths only (no external services)
- Finds best path between two points
- Calculates distance and walking time
- Builds route coordinates

##### `distance.js`
**Purpose**: Distance calculations
- `calculateDistance(start, end)` - Haversine formula for distance between coordinates
- `calculateWalkingTime(distance)` - Converts distance to walking time
- Returns distance in kilometers
- Returns time in minutes

##### `authStorage.js`
**Purpose**: Authentication data storage
- `saveAuthData(data)` - Save user session to AsyncStorage
- `getAuthData()` - Get saved session
- `clearAuthData()` - Clear session (logout)
- Persists login across app restarts

##### `errorHandler.js`
**Purpose**: Error message formatting
- `getErrorMessage(error)` - Formats errors for display
- Handles network errors, API errors
- User-friendly error messages

##### `mockData.js`
**Purpose**: Mock data for development
- Sample buildings when Supabase not available
- Used when `USE_MOCK_DATA = true`
- Development/testing purposes

##### `storage.js`
**Purpose**: General storage utilities
- AsyncStorage helpers
- Save/load any data
- Used for favorites, preferences, etc.

---

#### **`src/styles/`** - Shared Styles

##### `common.js`
**Purpose**: Common style definitions
- Shared styles used across multiple screens
- Consistent spacing, colors, typography
- Reusable style objects

---

## 🔄 Data Flow

### Authentication Flow
```
User opens app
  → AuthNavigator checks auth state
  → If not logged in → LoginScreen
  → User enters email/password
  → AuthContext.login() → Supabase auth
  → Creates/fetches user profile
  → Saves to AsyncStorage
  → AuthNavigator → MainNavigator (shows app)
```

### Map Data Flow
```
MapScreen loads
  → mapService.getBuildings() → Supabase
  → Transforms data (adds dimensions, rotation)
  → Sets buildings state
  → Renders on map as polygons + markers
```

### Routing Flow
```
User taps Navigate
  → calculateRoute(userLocation, building)
  → getCustomPaths() → Supabase
  → findBestCustomPath() → Finds closest path
  → buildSinglePathRoute() → Creates coordinates
  → setRouteCoordinates() → Updates map
  → Polyline renders route on map
```

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles (email, role) |
| `buildings` | Building locations, dimensions, rotation |
| `locations` | Rooms within buildings |
| `paths` | Custom walkways/routes |
| `waypoints` | Points along paths (ordered) |
| `path_connections` | Connections between paths (for future cross-path routing) |
| `favorites` | User favorite buildings |
| `routes` | Pre-calculated routes (optional) |
| `user_feedback` | Feedback submissions |
| `admin_users` | Admin panel users |
| `audit_logs` | Admin action tracking |

---

## 🎯 Key Concepts

### Custom Paths
- Admin-created walkways defined by waypoints
- Waypoints have sequence numbers (0, 1, 2, 3...)
- Routes follow waypoints in order
- Only active paths are used for routing

### Building Dimensions
- `width_meters` - Building width
- `height_meters` - Building height
- `rotation_degrees` - Rotation angle (0° = north-facing)
- Used to draw accurate building polygons on map

### Row Level Security (RLS)
- Supabase security feature
- Controls who can read/write data
- Public read for buildings, paths
- Admin write only for modifications

---

## 🚀 Getting Started

1. **Set up Supabase**: Run `supabase-fresh-setup.sql`
2. **Configure**: Update `src/lib/supabase.js` with your Supabase URL/key
3. **Install**: `npm install`
4. **Run**: `npx expo start`
5. **Test**: Register user, add buildings, create paths, test routing

---

## 📝 Notes

- **No External Routing**: App uses only custom paths from database
- **Email Confirmation**: Configure redirect URLs in Supabase
- **Mock Data**: Set `USE_MOCK_DATA = true` for offline development
- **Building Rotation**: Supports any angle for accurate visualization
- **Real-time Updates**: Can subscribe to building changes via Supabase

