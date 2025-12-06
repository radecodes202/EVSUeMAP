# Admin Webapp Context Document
## For Building Admin Panel with Cursor AI

This document provides comprehensive context about the EVSU eMAP React Native application to help build a complete admin webapp that can manage all aspects of the mobile app.

---

## 📱 Application Overview

**EVSU eMAP** is a React Native campus navigation app built with Expo that helps users:
- Navigate the EVSU Tacloban campus using an interactive map
- Search for buildings by name, code, or description
- Get directions to buildings
- Save favorite buildings
- Chat with an AI assistant for campus information

**Tech Stack:**
- React Native with Expo (~54.0.27)
- React Navigation (Native Stack, Bottom Tabs)
- React Native Maps (OpenStreetMap)
- Axios for API calls
- AsyncStorage for local data persistence
- Expo Location for GPS

---

## 🗄️ Data Models & Structures

### Building Model
The core data entity in the app. Each building has the following structure:

```javascript
{
  building_id: Number,           // Unique identifier (primary key)
  building_name: String,         // Full name (e.g., "Main Administration Building")
  building_code: String,         // Short code (e.g., "ADMIN", "LIB")
  latitude: String,              // GPS latitude (stored as string, e.g., "11.2443")
  longitude: String,             // GPS longitude (stored as string, e.g., "125.0023")
  floors: Number,                // Number of floors (e.g., 3)
  description: String            // Detailed description of the building
}
```

**Example Building:**
```javascript
{
  building_id: 1,
  building_name: 'Main Administration Building',
  building_code: 'ADMIN',
  latitude: '11.2443',
  longitude: '125.0023',
  floors: 3,
  description: 'Main administrative offices and student services center.'
}
```

### User Model (Authentication)
```javascript
{
  // User object returned from login endpoint
  user: {
    id: Number,                  // User ID
    email: String,               // User email
    role: String,               // "admin" or "user" (or isAdmin: true/false)
    name: String,               // User's full name (optional)
    // ... other user fields
  },
  token: String                  // JWT authentication token
}
```

**Admin Detection:**
- Admin users have `role === 'admin'` OR `isAdmin === true`
- Admin users can access admin-only features in the mobile app

---

## 🌐 API Endpoints

### Base URL Configuration
- **Development:** `http://192.168.1.8:3000/api` (configurable in `src/constants/config.js`)
- **Production:** `https://api.evsuemap.com/api` (placeholder)

### Authentication Endpoints

#### POST `/api/auth/login`
**Request:**
```json
{
  "email": "admin@evsu.edu.ph",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@evsu.edu.ph",
    "name": "Admin User",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Headers Required:**
- `Content-Type: application/json`

---

### Building Management Endpoints

#### GET `/api/buildings`
Get all buildings.

**Headers:**
- `Authorization: Bearer <token>` (optional for public access, required for admin)

**Response:**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "building_id": 1,
      "building_name": "Main Administration Building",
      "building_code": "ADMIN",
      "latitude": "11.2443",
      "longitude": "125.0023",
      "floors": 3,
      "description": "Main administrative offices..."
    },
    // ... more buildings
  ]
}
```

#### POST `/api/buildings`
Create a new building (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "building_name": "New Building",
  "building_code": "NEW",
  "latitude": "11.2450",
  "longitude": "125.0030",
  "floors": 2,
  "description": "Description of the new building"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Building created successfully",
  "data": {
    "building_id": 7,
    "building_name": "New Building",
    // ... full building object
  }
}
```

#### PUT `/api/buildings/:id`
Update an existing building (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "building_name": "Updated Building Name",
  "building_code": "UPD",
  "latitude": "11.2460",
  "longitude": "125.0040",
  "floors": 4,
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Building updated successfully",
  "data": {
    // ... updated building object
  }
}
```

#### DELETE `/api/buildings/:id`
Delete a building (Admin only).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Building deleted successfully"
}
```

---

### Path/Walkway Management Endpoints

#### GET `/api/paths`
Get all paths with their waypoints.

**Headers:**
- `Authorization: Bearer <token>` (optional for public access)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "path_id": 1,
      "path_name": "Main Administration Walkway",
      "path_type": "walkway",
      "is_active": true,
      "waypoints": [
        {
          "waypoint_id": 1,
          "sequence": 0,
          "latitude": "11.2440",
          "longitude": "125.0020",
          "is_accessible": true,
          "notes": null
        }
      ]
    }
  ]
}
```

#### POST `/api/paths`
Create a new path with waypoints (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "path_name": "Library to Admin Walkway",
  "path_type": "walkway",
  "is_active": true,
  "waypoints": [
    {
      "sequence": 0,
      "latitude": "11.2440",
      "longitude": "125.0020",
      "is_accessible": true,
      "notes": "Start point"
    },
    {
      "sequence": 1,
      "latitude": "11.2442",
      "longitude": "125.0021",
      "is_accessible": true,
      "notes": null
    }
  ]
}
```

#### PUT `/api/paths/:id`
Update a path and its waypoints (Admin only).

#### DELETE `/api/paths/:id`
Delete a path and all its waypoints (Admin only).

#### POST `/api/paths/:pathId/waypoints`
Add a waypoint to a path (Admin only).

#### PUT `/api/waypoints/:id`
Update a waypoint (Admin only).

#### DELETE `/api/waypoints/:id`
Delete a waypoint (Admin only).

---

## 🎯 Features & Functionality

### 1. Map Screen (`src/screens/MapScreen.js`)
- Displays interactive map with building markers
- Shows user's current location
- Allows navigation to selected buildings
- Displays route polyline between user and building
- Shows building info card when marker is tapped
- Features:
  - Center on campus button
  - Center on user location button
  - Clear route button
  - Building count badge

**What needs admin management:**
- Building locations (latitude/longitude)
- Building markers visibility
- Map center coordinates (EVSU_CENTER in config)

### 2. Search Screen (`src/screens/SearchScreen.js`)
- Search buildings by name, code, or description
- Filter buildings
- Display building cards with details
- Navigate to building on map
- Add/remove favorites
- Shows distance from user location

**What needs admin management:**
- Building names, codes, descriptions (affects search results)
- Building data that appears in search results

### 3. Chatbot Screen (`src/screens/ChatbotScreen.js`)
- AI assistant interface
- Keyword-based responses (currently simple, can be enhanced)
- Suggested questions
- Chat history

**What needs admin management:**
- Chatbot responses/knowledge base
- Suggested questions
- AI prompt templates (if using AI service)

### 4. Favorites Screen (`src/screens/FavoritesScreen.js`)
- Lists user's favorite buildings
- Stored locally in AsyncStorage
- Navigate to favorites on map

**What needs admin management:**
- (No direct admin control needed - user-specific data)

### 5. Authentication System (`src/context/AuthContext.js`)
- Login/logout functionality
- Token-based authentication
- Persistent login (AsyncStorage)
- Admin role detection

**What needs admin management:**
- User accounts
- User roles (admin/user)
- Password management
- User permissions

---

## ⚙️ Configuration Files

### `src/constants/config.js`
Contains app-wide configuration:

```javascript
// API Configuration
export const API_URL = 'http://192.168.1.8:3000/api';  // Development
export const USE_MOCK_DATA = true;  // Use mock data when API unavailable
export const API_TIMEOUT = 5000;    // 5 seconds

// Campus Location
export const EVSU_CENTER = {
  latitude: 11.2443,
  longitude: 125.0023,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Campus Boundaries
export const CAMPUS_BOUNDARIES = {
  northEast: { latitude: 11.2500, longitude: 125.0080 },
  southWest: { latitude: 11.2380, longitude: 124.9960 },
};

// Map Settings
export const MAP_ANIMATION_DURATION = 1000;
export const MAP_ZOOM_DELTA = 0.005;
```

**What needs admin management:**
- Campus center coordinates
- Campus boundaries
- API URL (for different environments)
- Map settings

### `src/constants/theme.js`
Contains UI theme constants (colors, spacing, typography, etc.)

**What needs admin management:**
- App branding (colors, logos)
- UI customization

---

## 📦 Mock Data

Located in `src/utils/mockData.js` - contains sample buildings for development/testing.

**Current mock buildings:**
1. Main Administration Building (ADMIN)
2. Library Building (LIB)
3. Science Laboratory (SCI)
4. Engineering Building (ENG)
5. Cafeteria (CAFE)
6. Gymnasium (GYM)

---

## 🔐 Authentication Flow

1. User opens app → Login screen shown
2. User enters email/password → POST `/api/auth/login`
3. On success:
   - Token saved to AsyncStorage
   - User object saved to AsyncStorage
   - Axios default header set: `Authorization: Bearer <token>`
   - User redirected to Main Navigator
4. On app restart:
   - Token loaded from AsyncStorage
   - If valid, user stays logged in
   - If invalid/missing, user sees login screen

**Admin Detection:**
- Check `user.role === 'admin'` OR `user.isAdmin === true`
- Admin users can see admin-only tabs/features

---

## 🎨 UI Components

### Reusable Components (`src/components/`)
- `BuildingCard.js` - Building display card
- `ControlButton.js` - Map control buttons
- `ErrorView.js` - Error display
- `InfoCard.js` - Building info card
- `LoadingView.js` - Loading spinner

---

## 📋 Admin Webapp Requirements

Based on the mobile app structure, the admin webapp should allow editing:

### 1. **Building Management (CRUD)**
- ✅ Create new buildings
- ✅ Edit existing buildings (name, code, coordinates, floors, description)
- ✅ Delete buildings
- ✅ View all buildings in a table/list
- ✅ Bulk import/export buildings (CSV/JSON)
- ✅ Validate coordinates are within campus boundaries

### 1.5. **Path/Walkway Management (NEW)**
- ✅ Create custom paths/walkways
- ✅ Draw paths on map interface (click to add waypoints)
- ✅ Edit path waypoints (add, remove, reorder, drag to adjust)
- ✅ Delete paths
- ✅ Enable/disable paths
- ✅ Categorize paths (walkway, sidewalk, path, road)
- ✅ View all paths on map
- ✅ Path visualization with waypoint markers
- ✅ Export/import paths (JSON format)

### 2. **User Management**
- ✅ Create/edit/delete user accounts
- ✅ Assign roles (admin/user)
- ✅ Reset passwords
- ✅ View user activity/logs
- ✅ Manage user permissions

### 3. **Campus Configuration**
- ✅ Edit campus center coordinates (EVSU_CENTER)
- ✅ Edit campus boundaries (CAMPUS_BOUNDARIES)
- ✅ Configure map settings (zoom, animation duration)
- ✅ Set API URLs for different environments

### 4. **Chatbot Management**
- ✅ Edit chatbot responses/knowledge base
- ✅ Manage suggested questions
- ✅ Configure AI settings (if using external AI service)
- ✅ View chat logs/analytics

### 5. **App Settings**
- ✅ Configure app theme/branding
- ✅ Manage feature flags
- ✅ View app analytics
- ✅ System logs/error monitoring

### 6. **Content Management**
- ✅ Manage building descriptions
- ✅ Upload building images
- ✅ Manage building categories/types (if added)
- ✅ Edit app metadata

---

## 🔧 Technical Implementation Notes

### API Authentication
- All admin endpoints require `Authorization: Bearer <token>` header
- Token obtained from login endpoint
- Token should be stored securely in admin webapp (localStorage/sessionStorage)

### Data Validation
- **Coordinates:** Must be valid lat/lng within campus boundaries
- **Building Code:** Should be unique, uppercase, 2-10 characters
- **Building Name:** Required, max 100 characters
- **Floors:** Must be positive integer
- **Description:** Optional, max 500 characters

### Error Handling
- API timeout: 5 seconds
- Network errors should show user-friendly messages
- Validation errors should be displayed inline

### Real-time Updates
- Consider WebSocket or polling for real-time building updates
- Mobile app should refresh when admin makes changes

---

## 📁 File Structure Reference

```
EVSUeMAP/
├── src/
│   ├── components/          # Reusable UI components
│   ├── constants/          # Config, theme, constants
│   │   ├── config.js       # API URLs, campus coordinates
│   │   └── theme.js        # Colors, typography, spacing
│   ├── context/            # React Context providers
│   │   └── AuthContext.js  # Authentication state
│   ├── navigation/         # Navigation setup
│   │   ├── AuthNavigator.js
│   │   └── MainNavigator.js
│   ├── screens/            # Screen components
│   │   ├── MapScreen.js
│   │   ├── SearchScreen.js
│   │   ├── ChatbotScreen.js
│   │   ├── FavoritesScreen.js
│   │   └── LoginScreen.js
│   ├── styles/            # Shared styles
│   └── utils/             # Utility functions
│       ├── mockData.js    # Sample building data
│       ├── authStorage.js # Auth persistence
│       └── storage.js     # Favorites storage
├── package.json
└── App.js                 # Root component
```

---

## 🚀 Recommended Admin Webapp Tech Stack

**Frontend:**
- React or Next.js (for SSR/SEO if needed)
- React Router for navigation
- Material-UI or Ant Design for UI components
- React Query or SWR for API data fetching
- Axios for HTTP requests
- Formik + Yup for form validation
- React Hook Form (alternative to Formik)

**State Management:**
- React Context API (simple)
- Redux Toolkit (if complex state needed)
- Zustand (lightweight alternative)

**Maps Integration:**
- Leaflet or Google Maps for building location editing
- Allow drag-and-drop markers for coordinate selection

**Authentication:**
- JWT token storage (localStorage/sessionStorage)
- Protected routes
- Auto-refresh tokens

**Features to Include:**
- Dashboard with statistics
- Data tables with sorting/filtering
- Rich text editor for descriptions
- Image upload for buildings
- Export/import functionality
- Audit logs for changes
- Responsive design (mobile-friendly)

---

## 📝 Additional Notes

1. **Coordinate Format:** Currently stored as strings, but should be validated as valid decimal numbers
2. **Mock Data Mode:** App can run with `USE_MOCK_DATA = true` when API is unavailable
3. **Campus Location:** EVSU Tacloban Campus (Philippines)
4. **Map Provider:** OpenStreetMap (no API key needed)
5. **Future Enhancements:** Consider adding building images, categories, hours of operation, etc.

---

## 🎯 Quick Start for Admin Webapp

When building with Cursor, provide this context and ask for:

1. **Building Management Dashboard**
   - List all buildings in a data table
   - Add/Edit/Delete functionality
   - Map interface for selecting coordinates
   - Form validation

2. **User Management**
   - User list with roles
   - Create/edit users
   - Role assignment

3. **Settings Page**
   - Campus configuration
   - API settings
   - App customization

4. **Authentication**
   - Login page matching mobile app API
   - Protected routes
   - Token management

---

**Last Updated:** Based on current codebase state
**API Base URL:** Configure in `src/constants/config.js`
**Authentication:** Token-based JWT

