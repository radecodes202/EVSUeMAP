# Routing Debug Guide

## Issue: "No suitable custom path available" when paths exist

If you're seeing "no suitable custom path available" even though admins have created paths, this guide will help you debug the issue.

---

## Changes Made

### 1. **Increased Distance Threshold**
- **Before**: 500m (0.5 km) - too strict
- **After**: 1000m (1.0 km) - more lenient
- **Why**: Paths might be slightly further from start/end points than expected

### 2. **Better Null/Undefined Handling**
- `is_accessible` now defaults to `true` if not set (instead of rejecting)
- Coordinates are validated before use
- Supports both number and string coordinate formats

### 3. **Comprehensive Debug Logging**
Added detailed console logs to track:
- Path fetching from Supabase
- Path details (name, waypoints, accessibility)
- Distance calculations
- Route matching process
- Why paths are accepted/rejected

---

## How to Debug

### Step 1: Check Console Logs

When you try to calculate a route, check the console for these logs:

```
📡 Fetching custom paths from Supabase...
✅ Fetched X paths from Supabase
  Path 1: "Main Walkway" (ID: 1)
    - Active: true
    - Waypoints: 10
    - First waypoint: (11.2440, 125.0020), accessible: true
    - Last waypoint: (11.2450, 125.0030), accessible: true

🔍 findBestCustomPath called
  Start: {latitude: 11.2440, longitude: 125.0020}
  End: {latitude: 11.2450, longitude: 125.0030}
  Paths count: 1
  Connections count: 0

    Path 1: "Main Walkway"
      - Distance to start: 0.012 km
      - Distance to end: 0.015 km
      - Total score: 0.027 km
      ✅ New best route found!

📊 Best route summary:
  - Best score: 0.027 km
  - Threshold: 1.0 km (1000m)
  - Within threshold: true
✅ Returning best route: Main Walkway
```

### Step 2: Common Issues to Check

#### Issue 1: No Paths Fetched
```
✅ Fetched 0 paths from Supabase
```
**Solution**: 
- Check if paths exist in Supabase
- Check if `is_active = true` in database
- Check Supabase connection

#### Issue 2: Paths Have No Waypoints
```
  Path 1: "Main Walkway"
    - Waypoints: 0
```
**Solution**: 
- Ensure waypoints are created for each path
- Check waypoints table in Supabase
- Verify waypoints are linked to path via `path_id`

#### Issue 3: All Waypoints Inaccessible
```
    - Accessible waypoints: 0
```
**Solution**: 
- Check `is_accessible` field in waypoints table
- Set `is_accessible = true` for waypoints that should be usable
- Or leave `is_accessible` as `NULL` (defaults to true now)

#### Issue 4: Distances Too Large
```
      - Distance to start: 0.850 km
      - Distance to end: 0.920 km
      - Total score: 1.770 km
⚠️ Best route found but score (1.770 km) exceeds threshold (1.0 km)
```
**Solution**: 
- Paths are too far from start/end points
- Create waypoints closer to buildings
- Or increase threshold further (edit `THRESHOLD` in `routing.js`)

#### Issue 5: Invalid Coordinates
```
Invalid waypoint coordinates: (undefined, undefined)
```
**Solution**: 
- Check waypoint coordinates in database
- Ensure `latitude` and `longitude` are set
- Verify coordinate format (should be decimal numbers)

---

## Database Checks

### Check Paths Exist
```sql
SELECT path_id, path_name, is_active, 
       (SELECT COUNT(*) FROM waypoints WHERE path_id = paths.path_id) as waypoint_count
FROM paths
WHERE is_active = true;
```

### Check Waypoints
```sql
SELECT w.waypoint_id, w.path_id, w.sequence, w.latitude, w.longitude, w.is_accessible,
       p.path_name
FROM waypoints w
JOIN paths p ON w.path_id = p.path_id
WHERE p.is_active = true
ORDER BY p.path_id, w.sequence;
```

### Check Accessible Waypoints
```sql
SELECT path_id, COUNT(*) as total, 
       COUNT(*) FILTER (WHERE is_accessible = true OR is_accessible IS NULL) as accessible
FROM waypoints
GROUP BY path_id;
```

---

## Quick Fixes

### Fix 1: Make All Waypoints Accessible
```sql
UPDATE waypoints 
SET is_accessible = true 
WHERE is_accessible IS NULL OR is_accessible = false;
```

### Fix 2: Increase Threshold (if paths are far)
Edit `src/utils/routing.js`:
```javascript
const THRESHOLD = 2.0; // 2 km instead of 1 km
```

### Fix 3: Check Path Format
Ensure paths have:
- `path_name` set
- `is_active = true`
- At least 2 waypoints
- Waypoints with valid coordinates

---

## Testing

### Test 1: Simple Route
1. Pick two buildings close to each other
2. Ensure a path connects them
3. Calculate route
4. Check console logs

### Test 2: Path Coverage
1. Check which buildings have nearby waypoints
2. Create waypoints near buildings if missing
3. Recalculate route

### Test 3: Distance Check
1. Calculate distance from building to nearest waypoint
2. If > 1km, create closer waypoint
3. Or increase threshold

---

## Expected Console Output (Success)

```
📡 Fetching custom paths from Supabase...
✅ Fetched 3 paths from Supabase
  Path 1: "Main Walkway" (ID: 1)
    - Active: true
    - Waypoints: 15
    - First waypoint: (11.2440, 125.0020), accessible: true
    - Last waypoint: (11.2450, 125.0030), accessible: true
  Path 2: "Library Path" (ID: 2)
    - Active: true
    - Waypoints: 8
    - First waypoint: (11.2438, 125.0018), accessible: true
    - Last waypoint: (11.2442, 125.0022), accessible: true

🔍 findBestCustomPath called
  Start: {latitude: 11.2440, longitude: 125.0020}
  End: {latitude: 11.2450, longitude: 125.0030}
  Paths count: 3
  Connections count: 2

    Path 1: "Main Walkway"
      - Distance to start: 0.012 km
      - Distance to end: 0.015 km
      - Total score: 0.027 km
      ✅ New best route found!

📊 Best route summary:
  - Best score: 0.027 km
  - Threshold: 1.0 km (1000m)
  - Within threshold: true
✅ Returning best route: Main Walkway
```

---

## Still Not Working?

1. **Share console logs** - Copy the full console output
2. **Check database** - Run the SQL queries above
3. **Verify coordinates** - Ensure building and waypoint coordinates are correct
4. **Test with known path** - Try routing between two waypoints directly

---

## Summary

The routing system now:
- ✅ Has more lenient distance threshold (1km)
- ✅ Handles null/undefined values better
- ✅ Provides detailed debug logging
- ✅ Validates coordinates before use
- ✅ Defaults `is_accessible` to `true` if not set

Check the console logs to see exactly what's happening! 🔍

