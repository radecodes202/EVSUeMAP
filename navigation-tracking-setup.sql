-- ============================================================================
-- NAVIGATION TRACKING SETUP FOR ADMIN STATISTICS
-- ============================================================================
-- This script creates a table and views for tracking user navigation events
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE NAVIGATION EVENTS TABLE
-- ============================================================================

-- Create navigation_events table to track when users navigate to buildings/rooms
CREATE TABLE IF NOT EXISTS public.navigation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('building', 'room')),
  entity_id UUID NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  room_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  action_type TEXT DEFAULT 'navigate' CHECK (action_type IN ('navigate', 'view', 'route_calculated')),
  route_calculated BOOLEAN DEFAULT false,
  user_location_lat DECIMAL(15, 12),
  user_location_lng DECIMAL(15, 12),
  distance_meters DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_navigation_events_user_id ON public.navigation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_navigation_events_entity_type ON public.navigation_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_navigation_events_entity_id ON public.navigation_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_navigation_events_building_id ON public.navigation_events(building_id);
CREATE INDEX IF NOT EXISTS idx_navigation_events_room_id ON public.navigation_events(room_id);
CREATE INDEX IF NOT EXISTS idx_navigation_events_created_at ON public.navigation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_navigation_events_action_type ON public.navigation_events(action_type);

-- Enable RLS
ALTER TABLE public.navigation_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own navigation events" ON public.navigation_events;
DROP POLICY IF EXISTS "Users can view own navigation events" ON public.navigation_events;
DROP POLICY IF EXISTS "Admins can view all navigation events" ON public.navigation_events;
DROP POLICY IF EXISTS "Public can insert navigation events" ON public.navigation_events;

-- Policy: Anyone can insert navigation events (for tracking)
CREATE POLICY "Public can insert navigation events"
  ON public.navigation_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own navigation events
CREATE POLICY "Users can view own navigation events"
  ON public.navigation_events
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Admins can view all navigation events (for statistics)
CREATE POLICY "Admins can view all navigation events"
  ON public.navigation_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 2: CREATE STATISTICS VIEWS
-- ============================================================================

-- View: Most navigated buildings
CREATE OR REPLACE VIEW most_navigated_buildings AS
SELECT 
  b.id,
  b.name,
  b.code,
  b.category,
  COUNT(ne.id) AS navigation_count,
  COUNT(DISTINCT ne.user_id) AS unique_users,
  COUNT(DISTINCT DATE(ne.created_at)) AS active_days,
  MAX(ne.created_at) AS last_navigated_at,
  AVG(ne.distance_meters) AS avg_distance_meters,
  COUNT(CASE WHEN ne.route_calculated = true THEN 1 END) AS routes_calculated
FROM buildings b
LEFT JOIN navigation_events ne ON b.id = ne.building_id AND ne.entity_type = 'building'
GROUP BY b.id, b.name, b.code, b.category
ORDER BY navigation_count DESC, b.name;

-- View: Most navigated rooms
CREATE OR REPLACE VIEW most_navigated_rooms AS
SELECT 
  l.id,
  l.name,
  l.room_number,
  l.type,
  l.floor,
  b.name AS building_name,
  b.code AS building_code,
  COUNT(ne.id) AS navigation_count,
  COUNT(DISTINCT ne.user_id) AS unique_users,
  COUNT(DISTINCT DATE(ne.created_at)) AS active_days,
  MAX(ne.created_at) AS last_navigated_at,
  AVG(ne.distance_meters) AS avg_distance_meters
FROM locations l
LEFT JOIN navigation_events ne ON l.id = ne.room_id AND ne.entity_type = 'room'
LEFT JOIN buildings b ON l.building_id = b.id
GROUP BY l.id, l.name, l.room_number, l.type, l.floor, b.name, b.code
ORDER BY navigation_count DESC, l.name;

-- View: Navigation activity by day
CREATE OR REPLACE VIEW daily_navigation_activity AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_navigations,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT entity_id) FILTER (WHERE entity_type = 'building') AS unique_buildings,
  COUNT(DISTINCT entity_id) FILTER (WHERE entity_type = 'room') AS unique_rooms,
  COUNT(CASE WHEN route_calculated = true THEN 1 END) AS routes_calculated
FROM navigation_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Navigation by building category
CREATE OR REPLACE VIEW navigation_by_building_category AS
SELECT 
  b.category,
  COUNT(ne.id) AS total_navigations,
  COUNT(DISTINCT ne.building_id) AS unique_buildings,
  COUNT(DISTINCT ne.user_id) AS unique_users,
  ROUND(AVG(ne.distance_meters), 2) AS avg_distance_meters,
  COUNT(CASE WHEN ne.route_calculated = true THEN 1 END) AS routes_calculated
FROM buildings b
LEFT JOIN navigation_events ne ON b.id = ne.building_id AND ne.entity_type = 'building'
GROUP BY b.category
ORDER BY total_navigations DESC;

-- View: Navigation by room type
CREATE OR REPLACE VIEW navigation_by_room_type AS
SELECT 
  l.type,
  COUNT(ne.id) AS total_navigations,
  COUNT(DISTINCT ne.room_id) AS unique_rooms,
  COUNT(DISTINCT ne.user_id) AS unique_users,
  ROUND(AVG(ne.distance_meters), 2) AS avg_distance_meters
FROM locations l
LEFT JOIN navigation_events ne ON l.id = ne.room_id AND ne.entity_type = 'room'
WHERE l.type IS NOT NULL
GROUP BY l.type
ORDER BY total_navigations DESC;

-- View: User navigation summary
CREATE OR REPLACE VIEW user_navigation_summary AS
SELECT 
  u.id AS user_id,
  u.email,
  u.role,
  COUNT(ne.id) AS total_navigations,
  COUNT(DISTINCT ne.building_id) AS unique_buildings_visited,
  COUNT(DISTINCT ne.room_id) AS unique_rooms_visited,
  COUNT(CASE WHEN ne.route_calculated = true THEN 1 END) AS routes_calculated,
  MAX(ne.created_at) AS last_navigation_at,
  u.created_at AS user_created_at
FROM public.users u
LEFT JOIN navigation_events ne ON u.id = ne.user_id
GROUP BY u.id, u.email, u.role, u.created_at
ORDER BY total_navigations DESC;

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Log a navigation event
CREATE OR REPLACE FUNCTION log_navigation_event(
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_building_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT 'navigate',
  p_route_calculated BOOLEAN DEFAULT false,
  p_user_location_lat DECIMAL DEFAULT NULL,
  p_user_location_lng DECIMAL DEFAULT NULL,
  p_distance_meters DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_event_id UUID;
BEGIN
  INSERT INTO navigation_events (
    user_id, user_email, entity_type, entity_id, building_id, room_id,
    action_type, route_calculated, user_location_lat, user_location_lng, distance_meters
  )
  VALUES (
    p_user_id, p_user_email, p_entity_type, p_entity_id, p_building_id, p_room_id,
    p_action_type, p_route_calculated, p_user_location_lat, p_user_location_lng, p_distance_meters
  )
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get top N most navigated buildings
CREATE OR REPLACE FUNCTION get_top_navigated_buildings(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  building_id UUID,
  building_name TEXT,
  building_code TEXT,
  category TEXT,
  navigation_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.code,
    b.category,
    COUNT(ne.id) AS navigation_count,
    COUNT(DISTINCT ne.user_id) AS unique_users
  FROM buildings b
  LEFT JOIN navigation_events ne ON b.id = ne.building_id AND ne.entity_type = 'building'
  GROUP BY b.id, b.name, b.code, b.category
  ORDER BY navigation_count DESC, b.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get top N most navigated rooms
CREATE OR REPLACE FUNCTION get_top_navigated_rooms(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  room_number TEXT,
  room_type TEXT,
  building_name TEXT,
  building_code TEXT,
  navigation_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.room_number,
    l.type,
    b.name,
    b.code,
    COUNT(ne.id) AS navigation_count,
    COUNT(DISTINCT ne.user_id) AS unique_users
  FROM locations l
  LEFT JOIN navigation_events ne ON l.id = ne.room_id AND ne.entity_type = 'room'
  LEFT JOIN buildings b ON l.building_id = b.id
  GROUP BY l.id, l.name, l.room_number, l.type, b.name, b.code
  ORDER BY navigation_count DESC, l.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get navigation statistics summary
CREATE OR REPLACE FUNCTION get_navigation_statistics()
RETURNS TABLE (
  total_navigations BIGINT,
  total_unique_users BIGINT,
  total_unique_buildings BIGINT,
  total_unique_rooms BIGINT,
  total_routes_calculated BIGINT,
  most_navigated_building_name TEXT,
  most_navigated_building_count BIGINT,
  most_navigated_room_name TEXT,
  most_navigated_room_count BIGINT,
  avg_distance_meters DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) AS total,
      COUNT(DISTINCT user_id) AS users,
      COUNT(DISTINCT building_id) FILTER (WHERE building_id IS NOT NULL) AS buildings,
      COUNT(DISTINCT room_id) FILTER (WHERE room_id IS NOT NULL) AS rooms,
      COUNT(CASE WHEN route_calculated = true THEN 1 END) AS routes,
      AVG(distance_meters) AS avg_dist
    FROM navigation_events
  ),
  top_building AS (
    SELECT b.name, COUNT(ne.id) AS count
    FROM buildings b
    LEFT JOIN navigation_events ne ON b.id = ne.building_id AND ne.entity_type = 'building'
    GROUP BY b.id, b.name
    ORDER BY count DESC
    LIMIT 1
  ),
  top_room AS (
    SELECT l.name, COUNT(ne.id) AS count
    FROM locations l
    LEFT JOIN navigation_events ne ON l.id = ne.room_id AND ne.entity_type = 'room'
    GROUP BY l.id, l.name
    ORDER BY count DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(s.total, 0),
    COALESCE(s.users, 0),
    COALESCE(s.buildings, 0),
    COALESCE(s.rooms, 0),
    COALESCE(s.routes, 0),
    COALESCE(tb.name, 'N/A'),
    COALESCE(tb.count, 0),
    COALESCE(tr.name, 'N/A'),
    COALESCE(tr.count, 0),
    COALESCE(ROUND(s.avg_dist, 2), 0)
  FROM stats s
  CROSS JOIN LATERAL (SELECT name, count FROM top_building) tb
  CROSS JOIN LATERAL (SELECT name, count FROM top_room) tr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================

-- Grant select on views to authenticated users
GRANT SELECT ON most_navigated_buildings TO authenticated;
GRANT SELECT ON most_navigated_rooms TO authenticated;
GRANT SELECT ON daily_navigation_activity TO authenticated;
GRANT SELECT ON navigation_by_building_category TO authenticated;
GRANT SELECT ON navigation_by_room_type TO authenticated;
GRANT SELECT ON user_navigation_summary TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION log_navigation_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_navigated_buildings(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_navigated_rooms(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_navigation_statistics() TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES FOR ADMIN PANEL
-- ============================================================================
-- 
-- 1. Get top 10 most navigated buildings:
--    SELECT * FROM get_top_navigated_buildings(10);
--
-- 2. Get top 10 most navigated rooms:
--    SELECT * FROM get_top_navigated_rooms(10);
--
-- 3. Get overall navigation statistics:
--    SELECT * FROM get_navigation_statistics();
--
-- 4. View all most navigated buildings:
--    SELECT * FROM most_navigated_buildings;
--
-- 5. View navigation by building category:
--    SELECT * FROM navigation_by_building_category;
--
-- 6. View daily navigation activity:
--    SELECT * FROM daily_navigation_activity LIMIT 30;
--
-- 7. View user navigation summary:
--    SELECT * FROM user_navigation_summary ORDER BY total_navigations DESC;
--
-- ============================================================================

