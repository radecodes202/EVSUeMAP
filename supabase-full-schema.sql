-- Supabase full schema for EVSU eMAP
-- Consolidated tables, policies, functions, indexes, and sample data.
-- Run in Supabase SQL Editor. Idempotent where practical.

-- =====================================
-- Extensions
-- =====================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================
-- Core Tables
-- =====================================
-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  geom GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations / Rooms within buildings
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  room_number TEXT,
  name TEXT NOT NULL,
  floor INTEGER,
  description TEXT,
  type TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points of Interest
CREATE TABLE IF NOT EXISTS points_of_interest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  geom GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes between buildings (JSON path)
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_building_id UUID REFERENCES buildings(id),
  to_building_id UUID REFERENCES buildings(id),
  path_coordinates JSONB,
  distance_meters DECIMAL(10, 2),
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites (for user_activity_summary view)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, building_id)
);

-- Paths (admin-defined paths)
CREATE TABLE IF NOT EXISTS paths (
  path_id SERIAL PRIMARY KEY,
  path_name VARCHAR(255) NOT NULL,
  path_type VARCHAR(50) DEFAULT 'walkway',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waypoints (ordered points per path)
CREATE TABLE IF NOT EXISTS waypoints (
  waypoint_id SERIAL PRIMARY KEY,
  path_id INTEGER REFERENCES paths(path_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_accessible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin panel users (if needed; prefer Supabase Auth in production)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  name TEXT,
  category TEXT NOT NULL, -- bug, feature, suggestion, complaint, compliment
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, in_progress, resolved, closed
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  admin_notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- Functions & Triggers
-- =====================================
-- Auto-set geography point for buildings
CREATE OR REPLACE FUNCTION update_building_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS building_geom_trigger ON buildings;
CREATE TRIGGER building_geom_trigger
BEFORE INSERT OR UPDATE ON buildings
FOR EACH ROW
EXECUTE FUNCTION update_building_geom();

-- Updated_at helper
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS buildings_updated_at ON buildings;
CREATE TRIGGER buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_feedback_updated_at ON user_feedback;
CREATE TRIGGER user_feedback_updated_at
BEFORE UPDATE ON user_feedback
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Nearby buildings function
CREATE OR REPLACE FUNCTION nearby_buildings(
  lat DECIMAL,
  lng DECIMAL,
  radius_meters DECIMAL DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  category TEXT,
  distance_meters DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.code,
    b.latitude,
    b.longitude,
    b.category,
    ST_Distance(
      b.geom,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM buildings b
  WHERE ST_DWithin(
    b.geom,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Subquery/statistics function
CREATE OR REPLACE FUNCTION get_building_with_location_stats(p_building_id UUID)
RETURNS TABLE (
  building_name TEXT,
  location_count BIGINT,
  total_capacity BIGINT,
  latest_update TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.name,
    (SELECT COUNT(*) FROM locations WHERE building_id = b.id) AS location_count,
    (SELECT COALESCE(SUM(capacity), 0) FROM locations WHERE building_id = b.id) AS total_capacity,
    (SELECT MAX(updated_at) FROM buildings WHERE id = b.id) AS latest_update
  FROM buildings b
  WHERE b.id = p_building_id;
END;
$$ LANGUAGE plpgsql;

-- Transaction example: create building with locations atomically
CREATE OR REPLACE FUNCTION create_building_with_locations(
  p_name TEXT,
  p_code TEXT,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_category TEXT,
  p_locations JSONB
)
RETURNS UUID AS $$
DECLARE
  v_building_id UUID;
BEGIN
  INSERT INTO buildings (name, code, latitude, longitude, category)
  VALUES (p_name, p_code, p_latitude, p_longitude, p_category)
  RETURNING id INTO v_building_id;

  IF p_locations IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(p_locations) - 1 LOOP
      INSERT INTO locations (building_id, name, floor, type, capacity)
      VALUES (
        v_building_id,
        (p_locations->i->>'name')::TEXT,
        COALESCE((p_locations->i->>'floor')::INTEGER, 1),
        COALESCE((p_locations->i->>'type')::TEXT, 'room'),
        COALESCE((p_locations->i->>'capacity')::INTEGER, 0)
      );
    END LOOP;
  END IF;

  RETURN v_building_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating building with locations: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Audit logging helper
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_user_email TEXT,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, user_email, action_type, entity_type, entity_id,
    old_values, new_values, description, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_user_email, p_action_type, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_description, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- RLS Enablement
-- =====================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_of_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- =====================================
-- Policies (public read, service role manage)
-- =====================================
-- Public read
CREATE POLICY IF NOT EXISTS "Public read users" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Public read buildings" ON buildings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read locations" ON locations FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read POI" ON points_of_interest FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read routes" ON routes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read paths" ON paths FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "Public read waypoints" ON waypoints FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read admin_users" ON admin_users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read audit_logs" ON audit_logs FOR SELECT USING (true);

-- User self-update (profile)
CREATE POLICY IF NOT EXISTS "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND (OLD.role = NEW.role));

-- Favorites owned by user
CREATE POLICY IF NOT EXISTS "Favorites owned by user" ON favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feedback: public can insert, user can read own, service role manage
CREATE POLICY IF NOT EXISTS "Public insert user_feedback" ON user_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public read own user_feedback" ON user_feedback
  FOR SELECT USING (user_id::text = auth.uid()::text OR user_email = auth.email());

-- Service role manage everything (write access)
CREATE POLICY IF NOT EXISTS "Service role all users" ON public.users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all buildings" ON buildings FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all locations" ON locations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all POI" ON points_of_interest FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all routes" ON routes FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all favorites" ON favorites FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all paths" ON paths FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all waypoints" ON waypoints FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all admin_users" ON admin_users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all audit_logs" ON audit_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY IF NOT EXISTS "Service role all user_feedback" ON user_feedback FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow writes for admin operations (idempotent; bypass if service role already bypasses)
CREATE POLICY IF NOT EXISTS "Allow insert buildings" ON buildings FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update buildings" ON buildings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow delete buildings" ON buildings FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow insert locations" ON locations FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update locations" ON locations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow delete locations" ON locations FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow insert POI" ON points_of_interest FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update POI" ON points_of_interest FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow delete POI" ON points_of_interest FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow insert routes" ON routes FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update routes" ON routes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow delete routes" ON routes FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow insert admin_users" ON admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update admin_users" ON admin_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow delete admin_users" ON admin_users FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow insert waypoints" ON waypoints FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow update waypoints" ON waypoints FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow delete waypoints" ON waypoints FOR DELETE USING (true);

-- =====================================
-- Indexes
-- =====================================
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);

CREATE INDEX IF NOT EXISTS buildings_geom_idx ON buildings USING GIST(geom);
CREATE INDEX IF NOT EXISTS buildings_category_idx ON buildings(category);
CREATE INDEX IF NOT EXISTS locations_building_id_idx ON locations(building_id);
CREATE INDEX IF NOT EXISTS poi_geom_idx ON points_of_interest USING GIST(geom);

CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_building_idx ON favorites(building_id);
CREATE INDEX IF NOT EXISTS paths_active_idx ON paths(is_active);
CREATE INDEX IF NOT EXISTS waypoints_path_seq_idx ON waypoints(path_id, sequence);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_idx ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_email_idx ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS user_feedback_category_idx ON user_feedback(category);
CREATE INDEX IF NOT EXISTS user_feedback_status_idx ON user_feedback(status);
CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS user_feedback_user_email_idx ON user_feedback(user_email);
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON admin_users(role);

-- =====================================
-- Views
-- =====================================
CREATE OR REPLACE VIEW building_statistics AS
SELECT
  category,
  COUNT(*) AS building_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 31557600) AS avg_age_years
FROM buildings
GROUP BY category;

CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  u.id,
  u.email,
  u.role,
  u.created_at AS account_created,
  COALESCE(f.favorite_count, 0) AS favorite_count
FROM public.users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS favorite_count
  FROM favorites
  GROUP BY user_id
) f ON f.user_id = u.id;

-- =====================================
-- Sample Data (optional)
-- =====================================
INSERT INTO buildings (name, code, latitude, longitude, category, description) VALUES
  ('Main Building', 'MB', 11.2588, 125.0070, 'administrative', 'Main administrative building'),
  ('College of Engineering', 'COE', 11.2590, 125.0075, 'academic', 'Engineering college'),
  ('University Library', 'LIB', 11.2585, 125.0068, 'facility', 'Main library'),
  ('Gymnasium', 'GYM', 11.2592, 125.0072, 'sports', 'Sports facility'),
  ('Science Building', 'SCI', 11.2586, 125.0073, 'academic', 'Science labs')
ON CONFLICT (code) DO NOTHING;

INSERT INTO points_of_interest (name, latitude, longitude, category, description) VALUES
  ('Main Parking', 11.2587, 125.0069, 'parking', 'Main parking area'),
  ('Cafeteria', 11.2589, 125.0071, 'food', 'Student cafeteria'),
  ('ATM Machine', 11.2588, 125.0070, 'service', 'ATM services')
ON CONFLICT DO NOTHING;

INSERT INTO admin_users (email, name, role)
VALUES ('admin@evsu.edu.ph', 'Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;


