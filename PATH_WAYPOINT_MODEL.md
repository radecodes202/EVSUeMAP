# Path/Waypoint Data Model for Custom Walkways

## Overview

To allow admins to edit walkways and paths, we need to store custom path data in the database. This allows routing to use campus-specific walkways instead of relying solely on OpenStreetMap data.

## Data Models

### Path Model

A **Path** represents a walkway or route segment on campus.

```javascript
{
  path_id: Number,              // Unique identifier (primary key)
  path_name: String,            // Name of the path (e.g., "Main Walkway", "Library Path")
  path_type: String,            // Type: "walkway", "sidewalk", "path", "road"
  is_active: Boolean,           // Whether path is active/usable
  created_at: Date,             // Creation timestamp
  updated_at: Date              // Last update timestamp
}
```

### Waypoint Model

A **Waypoint** is a point along a path. Paths are made up of multiple waypoints in sequence.

```javascript
{
  waypoint_id: Number,          // Unique identifier (primary key)
  path_id: Number,              // Foreign key to path
  sequence: Number,             // Order of waypoint in path (0, 1, 2, ...)
  latitude: String,             // GPS latitude (e.g., "11.2443")
  longitude: String,            // GPS longitude (e.g., "125.0023")
  is_accessible: Boolean,       // Whether this point is accessible (e.g., not blocked)
  notes: String                 // Optional notes about this waypoint
}
```

### Path Connection Model (Optional)

**Path Connections** link paths together, allowing routing between different paths.

```javascript
{
  connection_id: Number,         // Unique identifier
  path_id_1: Number,            // First path
  path_id_2: Number,            // Second path
  connection_point_lat: String, // Where paths connect (latitude)
  connection_point_lon: String, // Where paths connect (longitude)
  connection_type: String       // "junction", "intersection", "bridge", etc.
}
```

## Example Data Structure

### Complete Path with Waypoints

```javascript
{
  path_id: 1,
  path_name: "Main Administration Walkway",
  path_type: "walkway",
  is_active: true,
  waypoints: [
    {
      waypoint_id: 1,
      path_id: 1,
      sequence: 0,
      latitude: "11.2440",
      longitude: "125.0020",
      is_accessible: true,
      notes: "Start of walkway near entrance"
    },
    {
      waypoint_id: 2,
      path_id: 1,
      sequence: 1,
      latitude: "11.2442",
      longitude: "125.0021",
      is_accessible: true,
      notes: null
    },
    {
      waypoint_id: 3,
      path_id: 1,
      sequence: 2,
      latitude: "11.2444",
      longitude: "125.0022",
      is_accessible: true,
      notes: "Near library building"
    },
    {
      waypoint_id: 4,
      path_id: 1,
      sequence: 3,
      latitude: "11.2446",
      longitude: "125.0023",
      is_accessible: true,
      notes: "End of walkway"
    }
  ]
}
```

## API Endpoints Needed

### Path Management

#### GET `/api/paths`
Get all paths with their waypoints.

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
          "is_accessible": true
        },
        // ... more waypoints
      ]
    }
  ]
}
```

#### POST `/api/paths`
Create a new path.

**Request:**
```json
{
  "path_name": "New Walkway",
  "path_type": "walkway",
  "is_active": true,
  "waypoints": [
    {
      "sequence": 0,
      "latitude": "11.2440",
      "longitude": "125.0020",
      "is_accessible": true
    },
    {
      "sequence": 1,
      "latitude": "11.2442",
      "longitude": "125.0021",
      "is_accessible": true
    }
  ]
}
```

#### PUT `/api/paths/:id`
Update a path and its waypoints.

#### DELETE `/api/paths/:id`
Delete a path and all its waypoints.

### Waypoint Management

#### POST `/api/paths/:pathId/waypoints`
Add a waypoint to a path.

#### PUT `/api/waypoints/:id`
Update a waypoint.

#### DELETE `/api/waypoints/:id`
Delete a waypoint.

## Routing Logic

When calculating a route:

1. **Try custom paths first**: Check if start/end points are near any custom paths
2. **Find path segments**: Find the best path segments to connect start to end
3. **Use OSRM as fallback**: If no custom paths available, use OSRM
4. **Final fallback**: Use straight line if all else fails

## Admin Interface Features

### Path Editor
- Visual map interface to draw paths
- Click to add waypoints
- Drag waypoints to adjust
- Delete waypoints
- Name and categorize paths
- Enable/disable paths

### Path List
- View all paths
- Filter by type
- See path statistics (length, waypoint count)
- Quick enable/disable toggle

### Path Visualization
- Show all paths on map
- Highlight selected path
- Show waypoints as markers
- Color-code by path type

