-- Enable PostGIS for location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (extends Supabase auth.users)
-- This stores additional user information beyond what's in auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data" ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own data (except role)
CREATE POLICY "Users can update own data" ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (OLD.role = NEW.role) -- Can't change own role
  );

-- Service role can manage all users
CREATE POLICY "Service role all users" ON public.users 
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically create user profile when auth user is created
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

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for users
CREATE INDEX users_email_idx ON public.users(email);
CREATE INDEX users_role_idx ON public.users(role);

-- User feedback storage
CREATE TABLE user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  feedback_type VARCHAR(50) CHECK (feedback_type IN ('bug', 'suggestion', 'complaint', 'compliment')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX user_feedback_user_idx ON user_feedback(user_id);
CREATE INDEX user_feedback_status_idx ON user_feedback(status);

-- Buildings table
CREATE TABLE buildings (
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

-- Auto-calculate geography point from lat/lng
CREATE OR REPLACE FUNCTION update_building_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER building_geom_trigger
BEFORE INSERT OR UPDATE ON buildings
FOR EACH ROW
EXECUTE FUNCTION update_building_geom();

-- Locations/Rooms within buildings
CREATE TABLE locations (
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
CREATE TABLE points_of_interest (
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

-- Routes between buildings
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_building_id UUID REFERENCES buildings(id),
  to_building_id UUID REFERENCES buildings(id),
  path_coordinates JSONB,
  distance_meters DECIMAL(10, 2),
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites (used by user_activity_summary view)
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, building_id)
);

-- Paths (admin-defined)
CREATE TABLE paths (
  path_id SERIAL PRIMARY KEY,
  path_name VARCHAR(255) NOT NULL,
  path_type VARCHAR(50) DEFAULT 'walkway',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waypoints for paths (ordered)
CREATE TABLE waypoints (
  waypoint_id SERIAL PRIMARY KEY,
  path_id INTEGER REFERENCES paths(path_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_accessible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

-- Policies: public read where appropriate; admin manage
CREATE POLICY "Public read favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY "Public read paths" ON paths FOR SELECT USING (is_active = true);
CREATE POLICY "Public read waypoints" ON waypoints FOR SELECT USING (true);

CREATE POLICY "Service role manage favorites" ON favorites FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role manage paths" ON paths FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role manage waypoints" ON waypoints FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX favorites_user_idx ON favorites(user_id);
CREATE INDEX favorites_building_idx ON favorites(building_id);
CREATE INDEX paths_active_idx ON paths(is_active);
CREATE INDEX waypoints_path_seq_idx ON waypoints(path_id, sequence);

-- Enable Row Level Security
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_of_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read buildings" ON buildings FOR SELECT USING (true);
CREATE POLICY "Public read locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Public read POI" ON points_of_interest FOR SELECT USING (true);
CREATE POLICY "Public read routes" ON routes FOR SELECT USING (true);

-- Admin write access (using service_role key bypasses RLS, but we'll add policies for future auth)
CREATE POLICY "Service role all buildings" ON buildings FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role all locations" ON locations FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role all POI" ON points_of_interest FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX buildings_geom_idx ON buildings USING GIST(geom);
CREATE INDEX buildings_category_idx ON buildings(category);
CREATE INDEX locations_building_id_idx ON locations(building_id);
CREATE INDEX poi_geom_idx ON points_of_interest USING GIST(geom);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Find nearby buildings function
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

-- Advanced SQL: View for building statistics by category
CREATE OR REPLACE VIEW building_statistics AS
SELECT
  category,
  COUNT(*) AS building_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 31557600) AS avg_age_years
FROM buildings
GROUP BY category;

-- Advanced SQL: View for user activity summary (favorites optional table)
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

-- Advanced SQL: Function using subqueries for building metrics
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

-- Transaction management example: create building with locations atomically
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
  -- Insert building
  INSERT INTO buildings (name, code, latitude, longitude, category)
  VALUES (p_name, p_code, p_latitude, p_longitude, p_category)
  RETURNING id INTO v_building_id;

  -- Insert child locations inside the same transaction
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
    -- Any error triggers rollback of the function transaction
    RAISE EXCEPTION 'Error creating building with locations: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- Note: Users are created automatically via Supabase Auth
-- To create an admin user manually:
-- 1. Create user in Supabase Auth dashboard
-- 2. Then run: UPDATE public.users SET role = 'admin' WHERE email = 'admin@evsu.edu.ph';

