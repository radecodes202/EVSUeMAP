# Campus Settings Guide

## Overview

Campus center and boundaries are now **stored in the database** instead of hardcoded in the config file. This allows admins to update campus settings without modifying code.

---

## Database Table

### `campus_settings` Table

```sql
CREATE TABLE campus_settings (
  id SERIAL PRIMARY KEY,
  campus_name TEXT DEFAULT 'EVSU Campus',
  center_latitude DECIMAL(15, 12) NOT NULL,
  center_longitude DECIMAL(15, 12) NOT NULL,
  center_latitude_delta DECIMAL(10, 6) DEFAULT 0.01,
  center_longitude_delta DECIMAL(10, 6) DEFAULT 0.01,
  boundary_north_latitude DECIMAL(15, 12) NOT NULL,
  boundary_east_longitude DECIMAL(15, 12) NOT NULL,
  boundary_south_latitude DECIMAL(15, 12) NOT NULL,
  boundary_west_longitude DECIMAL(15, 12) NOT NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
```

**Important**: Only one row should exist (id = 1). Admins update this single row.

---

## How It Works

### 1. **Database First**
- App fetches campus settings from `campus_settings` table
- Settings are cached after first fetch (no repeated database calls)

### 2. **Config Fallback**
- If database fetch fails, uses hardcoded values from `config.js`
- Ensures app always works even if database is unavailable

### 3. **Automatic Updates**
- Settings are loaded when app starts
- Map automatically centers on campus center from database
- Boundaries are used for routing (inside/outside campus detection)

---

## Admin Panel Usage

### Update Campus Center

```sql
UPDATE campus_settings
SET 
  center_latitude = 11.239173,
  center_longitude = 124.997,
  center_latitude_delta = 0.01,
  center_longitude_delta = 0.01,
  updated_by = 'admin-user-id',
  updated_at = NOW()
WHERE id = 1;
```

### Update Campus Boundaries

```sql
UPDATE campus_settings
SET 
  boundary_north_latitude = 11.26,
  boundary_east_longitude = 125.02,
  boundary_south_latitude = 11.23,
  boundary_west_longitude = 124.99,
  updated_by = 'admin-user-id',
  updated_at = NOW()
WHERE id = 1;
```

### Update Everything

```sql
UPDATE campus_settings
SET 
  campus_name = 'EVSU Tacloban Campus',
  center_latitude = 11.239173,
  center_longitude = 124.997,
  center_latitude_delta = 0.01,
  center_longitude_delta = 0.01,
  boundary_north_latitude = 11.26,
  boundary_east_longitude = 125.02,
  boundary_south_latitude = 11.23,
  boundary_west_longitude = 124.99,
  updated_by = 'admin-user-id',
  updated_at = NOW()
WHERE id = 1;
```

---

## Finding Campus Coordinates

### Method 1: Google Maps
1. Open Google Maps
2. Right-click on campus center → "What's here?"
3. Copy latitude and longitude
4. Repeat for boundary points (north, east, south, west)

### Method 2: OpenStreetMap
1. Go to https://www.openstreetmap.org
2. Navigate to your campus
3. Right-click → "Show address"
4. Copy coordinates from URL or popup

### Method 3: GPS Device
1. Use a GPS device at each location
2. Record coordinates
3. Update database

---

## Coordinate Format

- **Latitude**: -90 to 90 (negative = south, positive = north)
- **Longitude**: -180 to 180 (negative = west, positive = east)
- **Precision**: Use 12 decimal places for accuracy (~1mm precision)

**Example:**
```
Latitude: 11.239173
Longitude: 124.997
```

---

## Boundary Definition

Boundaries define a **rectangle** around campus:

```
North East Corner: (boundary_north_latitude, boundary_east_longitude)
South West Corner: (boundary_south_latitude, boundary_west_longitude)
```

**Visual:**
```
        North (boundary_north_latitude)
        ┌─────────────────────────┐
        │                         │
West   │      CAMPUS AREA        │  East
       │                         │
        └─────────────────────────┘
        South (boundary_south_latitude)
```

**Rules:**
- `boundary_north_latitude` > `boundary_south_latitude`
- `boundary_east_longitude` > `boundary_west_longitude`
- All points inside this rectangle = "inside campus"
- All points outside = "outside campus"

---

## Center Delta (Zoom Level)

`center_latitude_delta` and `center_longitude_delta` control the **initial zoom level** of the map:

- **Smaller values** = More zoomed in (closer view)
- **Larger values** = More zoomed out (wider view)

**Recommended:**
- Small campus: `0.005` to `0.01`
- Medium campus: `0.01` to `0.02`
- Large campus: `0.02` to `0.05`

---

## Code Implementation

### Fetching Settings

```javascript
// In mapService.js
async getCampusSettings() {
  const { data } = await supabase
    .from('campus_settings')
    .select('*')
    .eq('id', 1)
    .single();
  
  return {
    campusName: data.campus_name,
    center: {
      latitude: parseFloat(data.center_latitude),
      longitude: parseFloat(data.center_longitude),
      latitudeDelta: parseFloat(data.center_latitude_delta),
      longitudeDelta: parseFloat(data.center_longitude_delta),
    },
    boundaries: {
      northEast: {
        latitude: parseFloat(data.boundary_north_latitude),
        longitude: parseFloat(data.boundary_east_longitude),
      },
      southWest: {
        latitude: parseFloat(data.boundary_south_latitude),
        longitude: parseFloat(data.boundary_west_longitude),
      },
    },
  };
}
```

### Using Settings

```javascript
// In MapScreen.js
useEffect(() => {
  const loadSettings = async () => {
    const settings = await mapService.getCampusSettings();
    if (settings) {
      setCampusCenter(settings.center);
      setCampusBoundaries(settings.boundaries);
    }
  };
  loadSettings();
}, []);
```

---

## Troubleshooting

### Settings Not Loading
1. **Check database**: Ensure `campus_settings` table exists
2. **Check row**: Ensure row with `id = 1` exists
3. **Check RLS**: Ensure public read policy exists
4. **Check console**: Look for error messages

### Wrong Campus Center
1. **Verify coordinates**: Check database values
2. **Check format**: Ensure coordinates are valid numbers
3. **Clear cache**: Restart app to reload settings

### Boundaries Not Working
1. **Check order**: North > South, East > West
2. **Check values**: All boundaries must be set
3. **Test coordinates**: Try a known inside/outside point

---

## Default Values

If database is unavailable, app uses these defaults from `config.js`:

```javascript
EVSU_CENTER = {
  latitude: 11.239173,
  longitude: 124.997,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

CAMPUS_BOUNDARIES = {
  northEast: { latitude: 11.26, longitude: 125.02 },
  southWest: { latitude: 11.23, longitude: 124.99 },
};
```

---

## Security

### Row Level Security (RLS)

```sql
-- Public can read (for mobile app)
CREATE POLICY "Public read campus_settings" 
ON campus_settings 
FOR SELECT 
USING (true);

-- Only admins can update (via admin panel)
CREATE POLICY "Admin update campus_settings" 
ON campus_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

---

## Summary

✅ **Campus settings are now in the database**
✅ **Admins can update without code changes**
✅ **App automatically uses database values**
✅ **Falls back to config if database unavailable**
✅ **Settings are cached for performance**

No more hardcoded coordinates! 🎉

