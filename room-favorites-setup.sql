-- ============================================================================
-- ROOM FAVORITES DATABASE SETUP
-- ============================================================================
-- This script creates the database schema for storing user room favorites
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Option 1: Separate Room Favorites Table (Recommended)
-- ============================================================================

-- Create room_favorites table
CREATE TABLE IF NOT EXISTS public.room_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id) -- Prevent duplicate favorites
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_room_favorites_user_id 
  ON public.room_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_room_favorites_room_id 
  ON public.room_favorites(room_id);
CREATE INDEX IF NOT EXISTS idx_room_favorites_created_at 
  ON public.room_favorites(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.room_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view their own room favorites" ON public.room_favorites;
DROP POLICY IF EXISTS "Users can insert their own room favorites" ON public.room_favorites;
DROP POLICY IF EXISTS "Users can delete their own room favorites" ON public.room_favorites;

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

-- ============================================================================
-- HELPER FUNCTIONS (Optional)
-- ============================================================================

-- Function to get user's favorite rooms with room details
CREATE OR REPLACE FUNCTION get_user_favorite_rooms(user_uuid UUID)
RETURNS TABLE (
  favorite_id UUID,
  room_id UUID,
  room_name TEXT,
  room_number TEXT,
  building_name TEXT,
  building_code TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.id as favorite_id,
    l.id as room_id,
    l.name as room_name,
    l.room_number,
    b.name as building_name,
    b.code as building_code,
    rf.created_at
  FROM public.room_favorites rf
  JOIN public.locations l ON rf.room_id = l.id
  JOIN public.buildings b ON l.building_id = b.id
  WHERE rf.user_id = user_uuid
  ORDER BY rf.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a room is favorited by user
CREATE OR REPLACE FUNCTION is_room_favorited(user_uuid UUID, room_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.room_favorites 
    WHERE user_id = user_uuid AND room_id = room_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This setup uses Row Level Security (RLS) to ensure users can only
--    access their own favorites
-- 2. The UNIQUE constraint prevents duplicate favorites
-- 3. Foreign key constraints ensure data integrity
-- 4. Indexes improve query performance
-- 5. The helper functions can be used by the app to query favorites
-- ============================================================================

