# Path Connections - Cross-Path Routing Guide

## Overview

Path connections allow routing between **different paths**. Without connections, routing only works when start and end are on the **same path**. With connections, you can route across multiple paths!

## How It Works

### Graph-Based Routing

The system builds a **graph** where:
- **Nodes** = Waypoints (from all paths)
- **Edges** = 
  - Path segments (between consecutive waypoints on same path)
  - Connections (between different paths via `path_connections` table)

Then uses **Dijkstra's algorithm** to find the shortest path through the graph.

---

## Database Setup

### Path Connections Table

Already created in `supabase-fresh-setup.sql`:

```sql
CREATE TABLE path_connections (
  connection_id SERIAL PRIMARY KEY,
  from_path_id INTEGER NOT NULL REFERENCES paths(path_id),
  from_waypoint_id INTEGER NOT NULL REFERENCES waypoints(waypoint_id),
  to_path_id INTEGER NOT NULL REFERENCES paths(path_id),
  to_waypoint_id INTEGER NOT NULL REFERENCES waypoints(waypoint_id),
  connection_type VARCHAR(50) DEFAULT 'walkway',
  is_bidirectional BOOLEAN DEFAULT true,
  distance_meters DECIMAL(10, 2),
  is_accessible BOOLEAN DEFAULT true,
  notes TEXT
);
```

---

## Creating Path Connections

### Example Scenario

You have two paths:
- **Path A**: "Main Walkway" (waypoints 1-10)
- **Path B**: "Library Path" (waypoints 1-8)

They connect at:
- Path A waypoint 7 → Path B waypoint 1

### SQL to Create Connection

```sql
INSERT INTO path_connections (
  from_path_id,
  from_waypoint_id,
  to_path_id,
  to_waypoint_id,
  connection_type,
  is_bidirectional,
  distance_meters,
  is_accessible
) VALUES (
  1,                    -- Path A ID
  7,                    -- Path A waypoint 7 ID
  2,                    -- Path B ID
  1,                    -- Path B waypoint 1 ID
  'walkway',            -- Connection type
  true,                 -- Bidirectional (can go both ways)
  5.0,                  -- Distance in meters
  true                  -- Accessible
);
```

### Finding Waypoint IDs

To find waypoint IDs:

```sql
-- List all waypoints with their IDs
SELECT 
  w.waypoint_id,
  w.sequence,
  p.path_name,
  w.latitude,
  w.longitude
FROM waypoints w
JOIN paths p ON w.path_id = p.path_id
ORDER BY p.path_name, w.sequence;
```

---

## Connection Types

| Type | Use Case |
|------|----------|
| `walkway` | Standard path connection |
| `stairs` | Stairway between levels |
| `elevator` | Elevator connection |
| `bridge` | Bridge between buildings |
| `tunnel` | Underground tunnel |

---

## Bidirectional vs One-Way

### Bidirectional (`is_bidirectional = true`)
- Connection works both ways
- Can go from Path A → Path B AND Path B → Path A
- Most common for walkways

### One-Way (`is_bidirectional = false`)
- Only works one direction
- Useful for stairs (up only) or restricted access
- Only creates edge in one direction

---

## Example: Multi-Path Route

### Setup
```
Path 1: "Main Walkway"
  Waypoint 1 (11.2440, 125.0020)
  Waypoint 2 (11.2442, 125.0022)
  ...
  Waypoint 7 (11.2448, 125.0028) ← Connection point

Path 2: "Library Path"
  Waypoint 1 (11.2448, 125.0028) ← Connection point
  Waypoint 2 (11.2450, 125.0030)
  ...
  Waypoint 5 (11.2454, 125.0034) ← Destination near here
```

### Connection
```sql
-- Connect Path 1 waypoint 7 to Path 2 waypoint 1
INSERT INTO path_connections (...) VALUES (1, 7, 2, 1, ...);
```

### Routing Result
```
User at: Path 1 waypoint 2
Destination: Path 2 waypoint 5

Route:
  Path 1 waypoint 2
  → Path 1 waypoint 3
  → Path 1 waypoint 4
  → Path 1 waypoint 5
  → Path 1 waypoint 6
  → Path 1 waypoint 7
  → [CONNECTION] → Path 2 waypoint 1
  → Path 2 waypoint 2
  → Path 2 waypoint 3
  → Path 2 waypoint 4
  → Path 2 waypoint 5
  → Destination
```

**Display**: "📍 Multi-Path Route - Main Walkway → Library Path"

---

## Admin Panel Integration

When creating/editing paths in your admin panel:

1. **Show waypoints** on the map
2. **Allow selecting** two waypoints from different paths
3. **Create connection** between them
4. **Set connection type** (walkway, stairs, etc.)
5. **Set bidirectional** flag
6. **Save** to database

---

## Testing Connections

### 1. Create Test Paths
```sql
-- Path 1
INSERT INTO paths (path_name) VALUES ('Test Path A') RETURNING path_id;
-- Note the path_id, then add waypoints...

-- Path 2
INSERT INTO paths (path_name) VALUES ('Test Path B') RETURNING path_id;
-- Note the path_id, then add waypoints...
```

### 2. Create Connection
```sql
INSERT INTO path_connections (
  from_path_id, from_waypoint_id,
  to_path_id, to_waypoint_id,
  is_bidirectional
) VALUES (1, 5, 2, 1, true);
```

### 3. Test Routing
- Start at a point near Path A
- Destination near Path B
- Route should go: Path A → Connection → Path B

---

## Troubleshooting

### Route Not Using Connections
- **Check**: Are connections `is_accessible = true`?
- **Check**: Are waypoints `is_accessible = true`?
- **Check**: Are paths `is_active = true`?
- **Check**: Are start/end within 500m of waypoints?

### "No path found" Error
- Connections might not be accessible
- Start/end too far from any waypoints (>500m combined)
- No valid path through graph

### Route Takes Wrong Path
- Check connection distances (`distance_meters`)
- Verify bidirectional settings
- Ensure waypoints are in correct order

---

## Performance Notes

- Graph building: O(P × W) where P = paths, W = waypoints per path
- Dijkstra's algorithm: O(V²) where V = total waypoints
- For typical campus (< 100 waypoints): Very fast (< 100ms)

---

## Code Implementation

### Files Modified

1. **`src/services/mapService.js`**
   - Added `getPathConnections()` method
   - Fetches connections from Supabase

2. **`src/utils/routing.js`**
   - Added `buildPathGraph()` - Builds graph from paths + connections
   - Added `findShortestPath()` - Dijkstra's algorithm
   - Added `buildMultiPathRoute()` - Reconstructs route from path
   - Updated `findBestCustomPath()` - Uses graph routing when connections exist
   - Updated `calculateRoute()` - Fetches connections

### How It Works

1. **Fetch Data**: Get paths + waypoints + connections
2. **Build Graph**: Create nodes (waypoints) and edges (segments + connections)
3. **Find Nearest**: Find closest waypoints to start/end
4. **Dijkstra**: Find shortest path through graph
5. **Build Route**: Convert waypoint path to coordinates
6. **Display**: Show route on map

---

## Future Enhancements

1. **Connection Visualization**: Show connections on map
2. **Connection Preferences**: Prefer certain types (elevator vs stairs)
3. **Connection Costs**: Different weights for different types
4. **Multiple Routes**: Show alternative routes
5. **Connection Editor**: Visual editor in admin panel

---

## Summary

✅ **Path connections enable cross-path routing**
✅ **Uses Dijkstra's algorithm for shortest path**
✅ **Automatically falls back to single-path routing if no connections**
✅ **Supports bidirectional and one-way connections**
✅ **Works with all connection types (walkway, stairs, elevator, etc.)**

Your routing system now supports complex multi-path routes! 🎉

