# Room Favorites Database Setup Guide

This guide explains how to set up the database for storing user room favorites in Supabase.

## Current Implementation

Currently, room favorites are stored locally using AsyncStorage. This guide shows how to optionally migrate to a cloud-based database for syncing favorites across devices.

## Database Schema

### Option 1: Separate Room Favorites Table (Recommended)

Create a dedicated table for room favorites:

```sql
-- Create room_favorites table
CREATE TABLE public.room_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id) -- Prevent duplicate favorites
);

-- Create index for faster queries
CREATE INDEX idx_room_favorites_user_id ON public.room_favorites(user_id);
CREATE INDEX idx_room_favorites_room_id ON public.room_favorites(room_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.room_favorites ENABLE ROW LEVEL SECURITY;

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
```

### Option 2: Combined Favorites Table

If you want to store both building and room favorites in one table:

```sql
-- Create a unified favorites table
CREATE TABLE public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('building', 'room')),
  item_id UUID NOT NULL, -- Can reference buildings.id or locations.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id) -- Prevent duplicate favorites
);

-- Create indexes
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_item ON public.favorites(item_type, item_id);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own favorites"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);
```

## Implementation Steps

### Step 1: Run the SQL Script

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Run the SQL script for your chosen option (Option 1 or Option 2)

### Step 2: Update the App Code (Optional - for cloud sync)

If you want to sync favorites to the cloud, you'll need to update the storage utilities:

1. Modify `src/utils/storage.js` to optionally sync with Supabase
2. Add functions to sync local favorites with database on login
3. Add functions to fetch favorites from database

### Step 3: Test the Setup

1. Verify the table was created: `SELECT * FROM room_favorites;`
2. Test RLS policies by trying to access another user's favorites
3. Test insert/delete operations

## Migration from Local Storage

If you want to migrate existing local favorites to the database:

```javascript
// Example migration function
const migrateFavoritesToDatabase = async () => {
  const localRoomFavorites = await getRoomFavorites();
  const { user } = useAuth();
  
  if (!user) return;
  
  for (const roomId of localRoomFavorites) {
    try {
      await supabase
        .from('room_favorites')
        .insert({
          user_id: user.id,
          room_id: roomId
        });
    } catch (error) {
      console.error('Error migrating favorite:', error);
    }
  }
};
```

## Notes

- **Current Implementation**: The app uses AsyncStorage for local-only storage
- **Cloud Sync**: To enable cloud sync, you'll need to modify the storage utilities
- **Privacy**: RLS policies ensure users can only see their own favorites
- **Performance**: Indexes ensure fast queries even with many favorites

## Troubleshooting

### Issue: "permission denied for table room_favorites"
- **Solution**: Check that RLS policies are correctly set up and user is authenticated

### Issue: "duplicate key value violates unique constraint"
- **Solution**: This is expected behavior - the UNIQUE constraint prevents duplicate favorites

### Issue: Favorites not syncing
- **Solution**: Ensure the app is calling the database functions and user is authenticated

