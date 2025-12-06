# Setup Instructions - OpenStreetMap, Authentication & Admin Panel

## ✅ What's Been Implemented

### 1. **OpenStreetMap Integration**
- Switched from Google Maps to OpenStreetMap
- Using `PROVIDER_DEFAULT` which uses OpenStreetMap on Android
- Map now uses OpenStreetMap tiles instead of Google Maps

### 2. **Authentication System**
- Login/Logout functionality
- AuthContext for managing user state
- Protected routes (users must login first)
- Token-based authentication
- Persistent login (saved in AsyncStorage)

### 3. **Admin Panel**
- Admin-only screen accessible after login
- Edit building coordinates
- Add new buildings
- Delete buildings
- Full CRUD operations for buildings

## 📦 New Dependencies

You need to install the stack navigator:

```bash
npm install @react-navigation/stack
```

## 🔧 Backend Requirements

Your backend needs to support:

### 1. **Authentication Endpoint**
```
POST /api/auth/login
Body: { email, password }
Response: { success: true, user: {...}, token: "..." }
```

The user object should include:
- `role: "admin"` or `isAdmin: true` for admin users
- Other user fields as needed

### 2. **Building Management Endpoints** (Admin only)
```
GET    /api/buildings          - Get all buildings
POST   /api/buildings          - Create new building
PUT    /api/buildings/:id      - Update building
DELETE /api/buildings/:id      - Delete building
```

All admin endpoints should require authentication token in header:
```
Authorization: Bearer <token>
```

## 🚀 How to Use

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Update API Configuration**
Make sure `src/constants/config.js` has the correct API URL:
```javascript
export const API_URL = 'http://YOUR_IP:3000/api';
```

### 3. **Login**
- App will show login screen on first launch
- Enter admin credentials from your backend
- After login, admin users will see an "Admin" tab

### 4. **Admin Features**
- Go to Admin tab (only visible for admin users)
- Click "+" button to add new building
- Click edit icon to modify building coordinates
- Click delete icon to remove building
- Changes sync with backend (or mock data in dev mode)

## 🔐 User Roles

The app checks for admin access using:
- `user.role === 'admin'` OR
- `user.isAdmin === true`

Make sure your backend returns one of these in the user object.

## 🗺️ OpenStreetMap

The map now uses OpenStreetMap instead of Google Maps:
- No API key required
- Free and open source
- Works on Android and iOS
- Uses standard map tiles

## 📝 Notes

- **Mock Data Mode**: If `USE_MOCK_DATA = true`, admin edits will only affect local mock data
- **Authentication**: Tokens are stored securely in AsyncStorage
- **Auto-logout**: Users stay logged in until they manually logout
- **Admin Tab**: Only visible to users with admin role

## 🐛 Troubleshooting

### Login not working?
- Check backend is running
- Verify API URL in config.js
- Check backend returns correct user format with role/isAdmin

### Admin tab not showing?
- Verify user has `role: "admin"` or `isAdmin: true`
- Check AuthContext is properly detecting admin status

### Map not loading?
- OpenStreetMap should work by default
- Check internet connection
- Verify map permissions are granted

## 🎯 Next Steps

1. **Backend Setup**: Implement the authentication and building management endpoints
2. **Test Login**: Try logging in with admin credentials
3. **Test Admin Panel**: Add/edit/delete buildings
4. **Customize**: Adjust admin UI as needed

All features are ready to use once your backend is set up!

