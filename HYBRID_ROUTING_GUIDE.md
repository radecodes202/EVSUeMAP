# Hybrid Routing System Guide

## Overview

The routing system now uses a **hybrid approach**:
- **OSRM** for routing **outside** campus boundaries
- **Custom paths** for routing **inside** campus
- **Seamless transition** at campus boundary

This gives you the best of both worlds:
- ✅ Accurate campus navigation using admin-defined paths
- ✅ Reliable routing to/from campus using OSRM
- ✅ Smooth transition between systems

---

## How It Works

### Campus Boundary Detection

The system checks if coordinates are inside campus using `CAMPUS_BOUNDARIES`:

```javascript
// From src/constants/config.js
CAMPUS_BOUNDARIES = {
  northEast: { latitude: 11.2500, longitude: 125.0080 },
  southWest: { latitude: 11.2380, longitude: 124.9960 },
}
```

A point is **inside campus** if:
- `latitude` is between `southWest.latitude` and `northEast.latitude`
- `longitude` is between `southWest.longitude` and `northEast.longitude`

---

## Routing Scenarios

### Scenario 1: Both Outside Campus
```
User Location: Outside campus
Destination: Outside campus

→ Uses OSRM for entire route
→ Shows: "🌍 OSRM Route"
```

**Example:**
- User at home (11.2400, 125.0000) - outside
- Going to nearby store (11.2350, 124.9950) - outside
- **Result**: Full OSRM route

---

### Scenario 2: Both Inside Campus
```
User Location: Inside campus
Destination: Inside campus

→ Uses custom paths only
→ Shows: "📍 Campus Path" or "📍 Multi-Path Route"
```

**Example:**
- User at Library (11.2440, 125.0020) - inside
- Going to Admin Building (11.2450, 125.0030) - inside
- **Result**: Custom path route (or multi-path if connections exist)

---

### Scenario 3: Coming to Campus (Outside → Inside)
```
User Location: Outside campus
Destination: Inside campus

→ OSRM: start → campus entry point
→ Custom paths: entry point → destination
→ Shows: "🌍 Hybrid Route"
```

**Example:**
- User at home (11.2400, 125.0000) - outside
- Going to Library (11.2440, 125.0020) - inside
- **Process**:
  1. Find nearest waypoint to campus boundary (entry point)
  2. OSRM route: home → entry point
  3. Custom path route: entry point → Library
  4. Combine both routes seamlessly

---

### Scenario 4: Leaving Campus (Inside → Outside)
```
User Location: Inside campus
Destination: Outside campus

→ Custom paths: start → campus exit point
→ OSRM: exit point → destination
→ Shows: "🌍 Hybrid Route"
```

**Example:**
- User at Library (11.2440, 125.0020) - inside
- Going to home (11.2400, 125.0000) - outside
- **Process**:
  1. Find nearest waypoint to campus boundary (exit point)
  2. Custom path route: Library → exit point
  3. OSRM route: exit point → home
  4. Combine both routes seamlessly

---

## Entry/Exit Point Detection

When routing between inside and outside campus, the system:

1. **Finds all waypoints** inside campus
2. **Calculates distance** from outside point to each waypoint
3. **Picks closest waypoint** as entry/exit point
4. **Routes to/from that point** using appropriate system

**Example:**
```
Outside point: (11.2400, 125.0000)
Campus waypoints:
  - Waypoint A: (11.2440, 125.0020) - distance: 0.45 km
  - Waypoint B: (11.2438, 125.0018) - distance: 0.43 km ✅ CLOSEST
  - Waypoint C: (11.2442, 125.0022) - distance: 0.47 km

→ Uses Waypoint B as entry point
```

---

## Route Combination

When combining OSRM and custom path routes:

```javascript
// Remove duplicate point at transition
OSRM route: [start, ..., entryPoint]
Campus route: [entryPoint, ..., end]

Combined: [start, ..., entryPoint, ..., end]
// (entryPoint appears once, not twice)
```

This creates a **seamless route** with no visible break at the boundary.

---

## Route Types & Display

| Route Type | Flag | Display |
|------------|------|---------|
| **Hybrid** | `isHybridRoute: true` | "🌍 Hybrid Route - OSRM + Campus Path" |
| **OSRM Only** | `isOSRMRoute: true` | "🌍 OSRM Route (Outside campus)" |
| **Custom Path** | `isCustomPath: true` | "📍 Campus Path" |
| **Multi-Path** | `isMultiPath: true` | "📍 Multi-Path Route" |
| **Direct Line** | `isDirectRoute: true` | "📍 Direct Route (No routing available)" |

---

## Configuration

### Campus Boundaries

Update in `src/constants/config.js`:

```javascript
export const CAMPUS_BOUNDARIES = {
  northEast: { latitude: 11.2500, longitude: 125.0080 },
  southWest: { latitude: 11.2380, longitude: 124.9960 },
};
```

**To find your campus boundaries:**
1. Open map in Supabase or Google Maps
2. Find the northernmost point → `northEast.latitude`
3. Find the easternmost point → `northEast.longitude`
4. Find the southernmost point → `southWest.latitude`
5. Find the westernmost point → `southWest.longitude`

---

## Fallback Behavior

If routing fails at any step, the system falls back:

1. **Custom paths fail** → Try OSRM
2. **OSRM fails** → Try direct line
3. **All fail** → Show error message

This ensures users always get **some route**, even if not optimal.

---

## Performance

- **OSRM**: ~1-2 seconds (external API call)
- **Custom paths**: < 100ms (local calculation)
- **Hybrid**: ~1-2 seconds (OSRM + custom paths)
- **Graph routing**: < 100ms (Dijkstra's algorithm)

---

## Example Routes

### Example 1: Coming to Campus
```
Start: Home (11.2400, 125.0000) - OUTSIDE
End: Library (11.2440, 125.0020) - INSIDE

Route:
  1. OSRM: Home → Campus Entry (Waypoint B)
     Distance: 0.43 km
     Time: 5 min
  
  2. Custom Path: Waypoint B → Library
     Distance: 0.12 km
     Time: 1 min
  
  Total: 0.55 km, 6 min
  Display: "🌍 Hybrid Route - OSRM + Main Walkway"
```

### Example 2: Campus Navigation
```
Start: Library (11.2440, 125.0020) - INSIDE
End: Admin Building (11.2450, 125.0030) - INSIDE

Route:
  Custom Path: Library → Admin Building
  Distance: 0.15 km
  Time: 2 min
  Display: "📍 Main Walkway"
```

### Example 3: Leaving Campus
```
Start: Library (11.2440, 125.0020) - INSIDE
End: Home (11.2400, 125.0000) - OUTSIDE

Route:
  1. Custom Path: Library → Campus Exit (Waypoint B)
     Distance: 0.12 km
     Time: 1 min
  
  2. OSRM: Waypoint B → Home
     Distance: 0.43 km
     Time: 5 min
  
  Total: 0.55 km, 6 min
  Display: "🌍 Hybrid Route - Main Walkway + OSRM"
```

---

## Troubleshooting

### Route Always Uses OSRM
- **Check**: Are campus boundaries correct?
- **Check**: Are start/end points actually inside boundaries?
- **Fix**: Update `CAMPUS_BOUNDARIES` in `config.js`

### No Entry Point Found
- **Check**: Are there waypoints inside campus?
- **Check**: Are waypoints `is_accessible = true`?
- **Fix**: Create paths with waypoints inside campus boundaries

### Route Has Gap at Boundary
- **Check**: Are entry/exit waypoints correct?
- **Check**: Is route combination working?
- **Fix**: Verify waypoint coordinates are accurate

### OSRM Always Fails
- **Check**: Internet connection
- **Check**: OSRM API status (https://router.project-osrm.org)
- **Fix**: System will fallback to direct line

---

## Advantages

✅ **Best of both worlds**: OSRM for outside, custom paths for inside
✅ **Seamless transition**: No visible break at boundary
✅ **Accurate campus navigation**: Uses admin-defined paths
✅ **Reliable external routing**: OSRM handles outside campus
✅ **Automatic detection**: No manual selection needed
✅ **Fallback support**: Always provides some route

---

## Code Structure

### Key Functions

| Function | Purpose |
|----------|---------|
| `isInsideCampus(coord)` | Check if point is inside boundaries |
| `findCampusEntryPoint(coord, paths)` | Find nearest waypoint to outside point |
| `getOSRMRoute(start, end)` | Get route from OSRM API |
| `combineRoutes(osrm, campus)` | Merge two routes seamlessly |
| `calculateRoute(start, end)` | Main routing function (handles all scenarios) |

### Flow Diagram

```
calculateRoute(start, end)
  │
  ├─ Check: start inside? end inside?
  │
  ├─ Both outside → getOSRMRoute()
  │
  ├─ Both inside → findBestCustomPath()
  │
  └─ Mixed:
      ├─ Outside → Inside:
      │   ├─ findCampusEntryPoint()
      │   ├─ getOSRMRoute(start, entry)
      │   ├─ findBestCustomPath(entry, end)
      │   └─ combineRoutes()
      │
      └─ Inside → Outside:
          ├─ findCampusEntryPoint()
          ├─ findBestCustomPath(start, exit)
          ├─ getOSRMRoute(exit, end)
          └─ combineRoutes()
```

---

## Summary

🎯 **Hybrid routing automatically:**
- Uses OSRM when outside campus
- Uses custom paths when inside campus
- Combines both when crossing boundary
- Provides seamless navigation experience

No configuration needed - it just works! 🚀

