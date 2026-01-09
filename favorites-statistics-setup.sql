-- ============================================================================
-- FAVORITES STATISTICS SETUP FOR ADMIN PANEL
-- ============================================================================
-- This script creates views and functions for admin statistics on favorites
-- Run this in your Supabase SQL Editor after setting up favorites tables
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ROOM_FAVORITES TABLE EXISTS
-- ============================================================================

-- Create room_favorites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.room_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_room_favorites_user_id ON public.room_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_room_favorites_room_id ON public.room_favorites(room_id);
CREATE INDEX IF NOT EXISTS idx_room_favorites_created_at ON public.room_favorites(created_at DESC);

-- Enable RLS if not already enabled
ALTER TABLE public.room_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view their own room favorites" ON public.room_favorites;
DROP POLICY IF EXISTS "Users can insert their own room favorites" ON public.room_favorites;
DROP POLICY IF EXISTS "Users can delete their own room favorites" ON public.room_favorites;
DROP POLICY IF EXISTS "Admins can view all room favorites" ON public.room_favorites;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view their own room favorites"
  ON public.room_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert their own room favorites"
  ON public.room_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own room favorites"
  ON public.room_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all room favorites (for statistics)
CREATE POLICY "Admins can view all room favorites"
  ON public.room_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 2: UPDATE FAVORITES TABLE POLICIES FOR ADMIN ACCESS
-- ============================================================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all favorites" ON public.favorites;

-- Policy: Admins can view all building favorites (for statistics)
CREATE POLICY "Admins can view all favorites"
  ON public.favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 3: CREATE STATISTICS VIEWS
-- ============================================================================

-- View: Most favorited buildings with details
CREATE OR REPLACE VIEW most_favorited_buildings AS
SELECT 
  b.id,
  b.name,
  b.code,
  b.category,
  COUNT(f.id) AS favorite_count,
  COUNT(DISTINCT f.user_id) AS unique_users,
  MAX(f.created_at) AS last_favorited_at
FROM buildings b
LEFT JOIN favorites f ON b.id = f.building_id
GROUP BY b.id, b.name, b.code, b.category
ORDER BY favorite_count DESC, b.name;

-- View: Most favorited rooms with details
CREATE OR REPLACE VIEW most_favorited_rooms AS
SELECT 
  l.id,
  l.name,
  l.room_number,
  l.type,
  l.floor,
  b.name AS building_name,
  b.code AS building_code,
  COUNT(rf.id) AS favorite_count,
  COUNT(DISTINCT rf.user_id) AS unique_users,
  MAX(rf.created_at) AS last_favorited_at
FROM locations l
LEFT JOIN room_favorites rf ON l.id = rf.room_id
LEFT JOIN buildings b ON l.building_id = b.id
GROUP BY l.id, l.name, l.room_number, l.type, l.floor, b.name, b.code
ORDER BY favorite_count DESC, l.name;

-- View: Favorites by category (buildings)
CREATE OR REPLACE VIEW favorites_by_building_category AS
SELECT 
  b.category,
  COUNT(f.id) AS total_favorites,
  COUNT(DISTINCT f.building_id) AS unique_buildings,
  COUNT(DISTINCT f.user_id) AS unique_users,
  ROUND(AVG(favorite_counts.count), 2) AS avg_favorites_per_building
FROM buildings b
LEFT JOIN favorites f ON b.id = f.building_id
LEFT JOIN (
  SELECT building_id, COUNT(*) AS count
  FROM favorites
  GROUP BY building_id
) favorite_counts ON b.id = favorite_counts.building_id
GROUP BY b.category
ORDER BY total_favorites DESC;

-- View: Favorites by room type
CREATE OR REPLACE VIEW favorites_by_room_type AS
SELECT 
  l.type,
  COUNT(rf.id) AS total_favorites,
  COUNT(DISTINCT rf.room_id) AS unique_rooms,
  COUNT(DISTINCT rf.user_id) AS unique_users,
  ROUND(AVG(room_favorite_counts.count), 2) AS avg_favorites_per_room
FROM locations l
LEFT JOIN room_favorites rf ON l.id = rf.room_id
LEFT JOIN (
  SELECT room_id, COUNT(*) AS count
  FROM room_favorites
  GROUP BY room_id
) room_favorite_counts ON l.id = room_favorite_counts.room_id
WHERE l.type IS NOT NULL
GROUP BY l.type
ORDER BY total_favorites DESC;

-- View: User favorites summary
CREATE OR REPLACE VIEW user_favorites_summary AS
SELECT 
  u.id AS user_id,
  u.email,
  u.role,
  COALESCE(building_favs.count, 0) AS building_favorites_count,
  COALESCE(room_favs.count, 0) AS room_favorites_count,
  COALESCE(building_favs.count, 0) + COALESCE(room_favs.count, 0) AS total_favorites_count,
  u.created_at AS user_created_at
FROM public.users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS count
  FROM favorites
  GROUP BY user_id
) building_favs ON u.id = building_favs.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS count
  FROM room_favorites
  GROUP BY user_id
) room_favs ON u.id = room_favs.user_id
ORDER BY total_favorites_count DESC;

-- View: Daily favorites activity
CREATE OR REPLACE VIEW daily_favorites_activity AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS favorites_added,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(DISTINCT building_id) FILTER (WHERE building_id IS NOT NULL) AS unique_buildings,
  COUNT(DISTINCT room_id) FILTER (WHERE room_id IS NOT NULL) AS unique_rooms
FROM (
  SELECT created_at, user_id, building_id, NULL::UUID AS room_id
  FROM favorites
  UNION ALL
  SELECT created_at, user_id, NULL::UUID AS building_id, room_id
  FROM room_favorites
) combined_favorites
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS FOR STATISTICS
-- ============================================================================

-- Function: Get top N most favorited buildings
CREATE OR REPLACE FUNCTION get_top_favorited_buildings(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  building_id UUID,
  building_name TEXT,
  building_code TEXT,
  category TEXT,
  favorite_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.code,
    b.category,
    COUNT(f.id) AS favorite_count,
    COUNT(DISTINCT f.user_id) AS unique_users
  FROM buildings b
  LEFT JOIN favorites f ON b.id = f.building_id
  GROUP BY b.id, b.name, b.code, b.category
  ORDER BY favorite_count DESC, b.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get top N most favorited rooms
CREATE OR REPLACE FUNCTION get_top_favorited_rooms(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  room_number TEXT,
  room_type TEXT,
  building_name TEXT,
  building_code TEXT,
  favorite_count BIGINT,
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
    COUNT(rf.id) AS favorite_count,
    COUNT(DISTINCT rf.user_id) AS unique_users
  FROM locations l
  LEFT JOIN room_favorites rf ON l.id = rf.room_id
  LEFT JOIN buildings b ON l.building_id = b.id
  GROUP BY l.id, l.name, l.room_number, l.type, b.name, b.code
  ORDER BY favorite_count DESC, l.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get favorites statistics summary
CREATE OR REPLACE FUNCTION get_favorites_statistics()
RETURNS TABLE (
  total_building_favorites BIGINT,
  total_room_favorites BIGINT,
  total_unique_users BIGINT,
  total_unique_buildings BIGINT,
  total_unique_rooms BIGINT,
  most_favorited_building_name TEXT,
  most_favorited_building_count BIGINT,
  most_favorited_room_name TEXT,
  most_favorited_room_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH building_stats AS (
    SELECT 
      COUNT(*) AS total,
      COUNT(DISTINCT user_id) AS users,
      COUNT(DISTINCT building_id) AS buildings
    FROM favorites
  ),
  room_stats AS (
    SELECT 
      COUNT(*) AS total,
      COUNT(DISTINCT user_id) AS users,
      COUNT(DISTINCT room_id) AS rooms
    FROM room_favorites
  ),
  top_building AS (
    SELECT b.name, COUNT(f.id) AS count
    FROM buildings b
    LEFT JOIN favorites f ON b.id = f.building_id
    GROUP BY b.id, b.name
    ORDER BY count DESC
    LIMIT 1
  ),
  top_room AS (
    SELECT l.name, COUNT(rf.id) AS count
    FROM locations l
    LEFT JOIN room_favorites rf ON l.id = rf.room_id
    GROUP BY l.id, l.name
    ORDER BY count DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(bs.total, 0),
    COALESCE(rs.total, 0),
    GREATEST(COALESCE(bs.users, 0), COALESCE(rs.users, 0)),
    COALESCE(bs.buildings, 0),
    COALESCE(rs.rooms, 0),
    COALESCE(tb.name, 'N/A'),
    COALESCE(tb.count, 0),
    COALESCE(tr.name, 'N/A'),
    COALESCE(tr.count, 0)
  FROM building_stats bs
  CROSS JOIN room_stats rs
  CROSS JOIN LATERAL (SELECT name, count FROM top_building) tb
  CROSS JOIN LATERAL (SELECT name, count FROM top_room) tr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

-- Grant select on views to authenticated users (admins will use these)
GRANT SELECT ON most_favorited_buildings TO authenticated;
GRANT SELECT ON most_favorited_rooms TO authenticated;
GRANT SELECT ON favorites_by_building_category TO authenticated;
GRANT SELECT ON favorites_by_room_type TO authenticated;
GRANT SELECT ON user_favorites_summary TO authenticated;
GRANT SELECT ON daily_favorites_activity TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_top_favorited_buildings(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_favorited_rooms(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_favorites_statistics() TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES FOR ADMIN PANEL
-- ============================================================================
-- 
-- 1. Get top 10 most favorited buildings:
--    SELECT * FROM get_top_favorited_buildings(10);
--
-- 2. Get top 10 most favorited rooms:
--    SELECT * FROM get_top_favorited_rooms(10);
--
-- 3. Get overall statistics:
--    SELECT * FROM get_favorites_statistics();
--
-- 4. View all most favorited buildings:
--    SELECT * FROM most_favorited_buildings;
--
-- 5. View favorites by building category:
--    SELECT * FROM favorites_by_building_category;
--
-- 6. View daily favorites activity:
--    SELECT * FROM daily_favorites_activity LIMIT 30;
--
-- 7. View user favorites summary:
--    SELECT * FROM user_favorites_summary ORDER BY total_favorites_count DESC;
--
-- ============================================================================

