# Building Positioning Guide

## How Buildings Are Positioned on the Map

### Current Method: Latitude & Longitude Coordinates

**Yes, latitude and longitude are the primary (and standard) way to position buildings on the map.**

Each building in the system has:
- `latitude`: GPS latitude coordinate (e.g., "11.2443")
- `longitude`: GPS longitude coordinate (e.g., "125.0023")

These coordinates are used to place markers on the map at the exact building location.

### Building Data Structure

```javascript
{
  building_id: 1,
  building_name: 'Main Administration Building',
  building_code: 'ADMIN',
  latitude: '11.2443',    // ← Used for map positioning
  longitude: '125.0023',   // ← Used for map positioning
  floors: 3,
  description: '...'
}
```

### How to Get Building Coordinates

1. **Google Maps Method:**
   - Open Google Maps
   - Find the building location
   - Right-click on the location
   - Click on the coordinates shown
   - Copy latitude and longitude

2. **GPS Device:**
   - Use a GPS device at the actual building location
   - Record the coordinates

3. **Online Tools:**
   - Use tools like latlong.net
   - Search for the address
   - Get coordinates

4. **Satellite Imagery:**
   - Use Google Earth or similar tools
   - Click on the building location
   - Get coordinates from the info panel

### Current EVSU Campus Coordinates

**Campus Center:**
- Latitude: `11.2443`
- Longitude: `125.0023`

**Campus Boundaries:**
- North-East: `11.2500, 125.0080`
- South-West: `11.2380, 124.9960`

### Example: Adding a New Building

To add a new building, you need to provide:

```javascript
{
  building_name: "New Building Name",
  building_code: "NEW",
  latitude: "11.2450",    // Get from Google Maps or GPS
  longitude: "125.0030",  // Get from Google Maps or GPS
  floors: 2,
  description: "Building description"
}
```

### Alternative Positioning Methods (Future Enhancements)

While lat/long is the standard, you could also consider:

1. **Relative Positioning:**
   - Position buildings relative to a central point
   - Requires conversion to lat/long anyway

2. **Address Geocoding:**
   - Store building addresses
   - Convert addresses to coordinates using geocoding API
   - Still results in lat/long coordinates

3. **Map Click/Tap:**
   - In admin panel, allow clicking on map to set coordinates
   - Automatically captures lat/long from click position

### Best Practice

**For the admin webapp, you should:**
1. Allow manual entry of lat/long coordinates
2. **AND** provide a map interface where admins can:
   - Click/tap on the map to set building location
   - Drag markers to adjust position
   - See coordinates update automatically

This gives admins both options:
- **Precise entry**: Type exact coordinates
- **Visual placement**: Click on map (easier for non-technical users)

### Coordinate Format

Coordinates are currently stored as **strings** in the database:
- `latitude: "11.2443"` (not `11.2443` as number)
- `longitude: "125.0023"` (not `125.0023` as number)

When using in code, they're converted to numbers:
```javascript
parseFloat(building.latitude)  // Converts "11.2443" to 11.2443
parseFloat(building.longitude) // Converts "125.0023" to 125.0023
```

### Summary

✅ **Latitude and Longitude are the standard way to position buildings**
✅ **This is how Google Maps, Apple Maps, and all mapping services work**
✅ **For admin panel: Provide both manual entry AND map click interface**

The coordinates you see in `src/utils/mockData.js` and `src/constants/config.js` are the actual GPS coordinates of EVSU Tacloban Campus buildings.

