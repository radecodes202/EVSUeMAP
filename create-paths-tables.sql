-- Create paths and waypoints tables for EVSUeMAP
-- Run this in your Supabase SQL Editor

-- Paths (admin-defined paths)
CREATE TABLE IF NOT EXISTS paths (
  path_id SERIAL PRIMARY KEY,
  path_name VARCHAR(255) NOT NULL,
  path_type VARCHAR(50) DEFAULT 'walkway',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waypoints for paths (ordered)
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

-- Enable Row Level Security
ALTER TABLE paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

-- Policies: public read where appropriate
CREATE POLICY IF NOT EXISTS "Public read paths" ON paths 
  FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Public read waypoints" ON waypoints 
  FOR SELECT USING (true);

-- Allow authenticated admins to manage paths
CREATE POLICY IF NOT EXISTS "Admins can manage paths" ON paths 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow authenticated admins to manage waypoints
CREATE POLICY IF NOT EXISTS "Admins can manage waypoints" ON waypoints 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS paths_active_idx ON paths(is_active);
CREATE INDEX IF NOT EXISTS waypoints_path_idx ON waypoints(path_id);
CREATE INDEX IF NOT EXISTS waypoints_path_seq_idx ON waypoints(path_id, sequence);

