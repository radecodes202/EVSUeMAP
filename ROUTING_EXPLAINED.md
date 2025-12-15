# 🗺️ Routing System - Detailed Explanation

## How Routing Works (Visual Flow)

```
┌─────────────────────────────────────────────────────────────┐
│  USER ACTION: Taps "Navigate" button on building marker    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  MapScreen.calculateRoute(userLocation, buildingLocation)  │
│  - userLocation: { latitude: 11.2440, longitude: 125.0020 }│
│  - buildingLocation: { latitude: 11.2450, longitude: 125.0030 }│
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  routing.js: calculateRoute()                               │
│  1. Calls getCustomPaths()                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  mapService.getPaths() → Supabase Query                     │
│  SELECT paths + waypoints WHERE is_active = true            │
│                                                              │
│  Returns:                                                   │
│  [                                                           │
│    {                                                         │
│      path_id: 1,                                            │
│      path_name: "Main Walkway",                             │
│      waypoints: [                                            │
│        { sequence: 0, lat: 11.2440, lng: 125.0020 },        │
│        { sequence: 1, lat: 11.2442, lng: 125.0021 },        │
│        { sequence: 2, lat: 11.2444, lng: 125.0022 },        │
│        ...                                                   │
│        { sequence: 8, lat: 11.2450, lng: 125.0030 }         │
│      ]                                                       │
│    }                                                         │
│  ]                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  findBestCustomPath(start, end, paths)                      │
│                                                              │
│  FOR EACH PATH:                                             │
│    ┌──────────────────────────────────────────┐            │
│    │ Find nearest waypoint to START           │            │
│    │ - Calculate distance to each waypoint    │            │
│    │ - Pick closest one                       │            │
│    └──────────────────────────────────────────┘            │
│    ┌──────────────────────────────────────────┐            │
│    │ Find nearest waypoint to END             │            │
│    │ - Calculate distance to each waypoint    │            │
│    │ - Pick closest one                       │            │
│    └──────────────────────────────────────────┘            │
│    ┌──────────────────────────────────────────┐            │
│    │ Calculate SCORE                           │            │
│    │ score = distance_to_start + distance_to_end│          │
│    └──────────────────────────────────────────┘            │
│                                                              │
│  PICK PATH WITH LOWEST SCORE                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  buildSinglePathRoute(path, startWaypoint, endWaypoint)     │
│                                                              │
│  1. Get waypoints between start and end:                    │
│     - startWaypoint.sequence = 3                            │
│     - endWaypoint.sequence = 8                              │
│     - Get waypoints 3, 4, 5, 6, 7, 8                        │
│                                                              │
│  2. Determine direction:                                    │
│     - If startSeq < endSeq → forward                        │
│     - If startSeq > endSeq → reverse                        │
│                                                              │
│  3. Build coordinates array:                                │
│     [                                                        │
│       userLocation,        // Start point                   │
│       waypoint[3],         // First waypoint                │
│       waypoint[4],         // Second waypoint               │
│       waypoint[5],         // ...                           │
│       waypoint[6],                                          │
│       waypoint[7],                                          │
│       waypoint[8],         // Last waypoint                 │
│       buildingLocation     // End point                     │
│     ]                                                       │
│                                                              │
│  4. Calculate total distance:                               │
│     - Sum distances between each consecutive point          │
│     - distance = dist(user, wp3) + dist(wp3, wp4) + ...     │
│                                                              │
│  5. Calculate walking time:                                 │
│     - time = distance / walking_speed                       │
│     - walking_speed = 0.083 km/min (5 km/h)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Return Route Object:                                       │
│  {                                                          │
│    success: true,                                           │
│    coordinates: [...],      // Array of {lat, lng}          │
│    distance: 0.25,          // Kilometers                   │
│    duration: 3,             // Minutes                      │
│    pathName: "Main Walkway",                                │
│    isCustomPath: true                                       │
│  }                                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  MapScreen: setRouteCoordinates(route.coordinates)          │
│                                                              │
│  Renders Polyline on map:                                   │
│  <Polyline                                                  │
│    coordinates={route.coordinates}                          │
│    strokeColor="blue"                                        │
│    strokeWidth={4}                                          │
│  />                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Example Scenario

### Setup
- **User Location**: Library entrance (11.2440, 125.0020)
- **Destination**: Admin Building (11.2450, 125.0030)
- **Custom Path**: "Main Walkway" with 10 waypoints

### Step 1: Find Nearest Waypoints

**Path: "Main Walkway"**
```
Waypoint 0: (11.2438, 125.0018) - Distance to user: 0.03 km
Waypoint 1: (11.2440, 125.0020) - Distance to user: 0.00 km ✅ CLOSEST TO START
Waypoint 2: (11.2442, 125.0022) - Distance to user: 0.02 km
...
Waypoint 7: (11.2448, 125.0028) - Distance to building: 0.02 km
Waypoint 8: (11.2450, 125.0030) - Distance to building: 0.00 km ✅ CLOSEST TO END
Waypoint 9: (11.2452, 125.0032) - Distance to building: 0.02 km
```

**Result:**
- Start waypoint: Waypoint 1 (sequence: 1)
- End waypoint: Waypoint 8 (sequence: 8)

### Step 2: Build Route

**Direction**: Forward (1 < 8)

**Waypoints to include**: 1, 2, 3, 4, 5, 6, 7, 8

**Final Coordinates:**
```javascript
[
  { lat: 11.2440, lng: 125.0020 },  // User location
  { lat: 11.2440, lng: 125.0020 },  // Waypoint 1
  { lat: 11.2442, lng: 125.0022 }, // Waypoint 2
  { lat: 11.2444, lng: 125.0024 }, // Waypoint 3
  { lat: 11.2446, lng: 125.0026 }, // Waypoint 4
  { lat: 11.2448, lng: 125.0028 }, // Waypoint 5
  { lat: 11.2450, lng: 125.0030 }, // Waypoint 8
  { lat: 11.2450, lng: 125.0030 }  // Building location
]
```

### Step 3: Calculate Distance

```javascript
distance = 
  dist(user, wp1) +      // 0.00 km
  dist(wp1, wp2) +      // 0.02 km
  dist(wp2, wp3) +      // 0.02 km
  dist(wp3, wp4) +      // 0.02 km
  dist(wp4, wp5) +      // 0.02 km
  dist(wp5, wp8) +      // 0.02 km
  dist(wp8, building)   // 0.00 km
  = 0.10 km total
```

### Step 4: Calculate Time

```javascript
walking_speed = 0.083 km/min (5 km/h)
duration = 0.10 / 0.083 = 1.2 minutes ≈ 1 minute
```

### Step 5: Display

**Route shown on map:**
- Blue polyline connecting all points
- Alert: "🗺️ Route Found - Main Walkway - 0.10 km • 1 min walk"

---

## What If No Path Found?

If no custom path covers the route (start/end too far from any waypoints):

```
┌─────────────────────────────────────────────────────────────┐
│  findBestCustomPath() returns null                          │
│  (No path within 500m threshold)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Fallback: Direct Route                                     │
│                                                              │
│  1. Create straight line:                                   │
│     [userLocation, buildingLocation]                         │
│                                                              │
│  2. Add intermediate points for smoother line:             │
│     - Calculate number of points based on distance          │
│     - Interpolate between start and end                     │
│                                                              │
│  3. Return:                                                 │
│     {                                                        │
│       isDirectRoute: true,                                  │
│       message: "No custom path available"                   │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
```

**User sees:**
- Straight line on map
- Alert: "📍 Direct Route - 0.15 km • 2 min walk (No custom path available)"

---

## Key Algorithms

### Distance Calculation (Haversine Formula)
```javascript
// Calculates distance between two lat/lng points
// Accounts for Earth's curvature
// Returns distance in kilometers

function calculateDistance(point1, point2) {
  const R = 6371; // Earth radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) *
    Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}
```

### Best Path Selection
```javascript
// For each path:
//   1. Find closest waypoint to start
//   2. Find closest waypoint to end
//   3. Score = distance_to_start + distance_to_end
//   4. Pick path with lowest score
//   5. Only use if score <= 0.5 km (500m threshold)
```

### Route Building
```javascript
// 1. Get waypoints between start and end sequences
// 2. Sort by sequence number
// 3. Reverse if going backwards
// 4. Build coordinate array: [start, ...waypoints, end]
// 5. Calculate total distance by summing segment distances
```

---

## Database Query Example

When `getCustomPaths()` is called, Supabase executes:

```sql
SELECT 
  path_id,
  path_name,
  path_type,
  is_active,
  (
    SELECT json_agg(
      json_build_object(
        'waypoint_id', waypoint_id,
        'sequence', sequence,
        'latitude', latitude,
        'longitude', longitude,
        'is_accessible', is_accessible
      )
      ORDER BY sequence
    )
    FROM waypoints
    WHERE path_id = paths.path_id
  ) as waypoints
FROM paths
WHERE is_active = true;
```

This returns paths with nested waypoints, all ordered by sequence.

---

## Performance Considerations

- **Caching**: Paths are fetched once and reused
- **Threshold**: 500m limit prevents using paths that are too far
- **Filtering**: Only active, accessible waypoints are considered
- **Distance Calculation**: Haversine formula is efficient for small distances

---

## Future Enhancements

1. **Cross-Path Routing**: Use `path_connections` table to route between different paths
2. **Multiple Path Options**: Show alternative routes
3. **Path Preferences**: Prefer certain path types (stairs vs elevator)
4. **Real-time Updates**: Recalculate route if paths change
5. **Turn-by-Turn Directions**: Generate step-by-step instructions

