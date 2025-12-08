# Supabase Setup Guide for EVSU eMAP

## Overview

This guide will help you set up Supabase as your online database for the EVSU eMAP application.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `evsuemap` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., Southeast Asia)
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: (keep this secret!)

## Step 3: Create Database Tables

Go to **SQL Editor** in Supabase and run these SQL commands:

### Buildings Table

```sql
-- Create buildings table
CREATE TABLE buildings (
  building_id SERIAL PRIMARY KEY,
  building_name VARCHAR(255) NOT NULL,
  building_code VARCHAR(50) NOT NULL UNIQUE,
  latitude VARCHAR(50) NOT NULL,
  longitude VARCHAR(50) NOT NULL,
  floors INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX idx_buildings_code ON buildings(building_code);
CREATE INDEX idx_buildings_name ON buildings(building_name);

-- Enable Row Level Security
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read buildings
CREATE POLICY "Buildings are viewable by everyone"
  ON buildings FOR SELECT
  USING (true);

-- Create policy: Only authenticated admins can insert
CREATE POLICY "Only admins can insert buildings"
  ON buildings FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create policy: Only authenticated admins can update
CREATE POLICY "Only admins can update buildings"
  ON buildings FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create policy: Only authenticated admins can delete
CREATE POLICY "Only admins can delete buildings"
  ON buildings FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

### Users Table

```sql
-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
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

-- Indexes
CREATE INDEX users_email_idx ON public.users(email);
CREATE INDEX users_role_idx ON public.users(role);
```

### Paths Table

```sql
-- Create paths table
CREATE TABLE paths (
  path_id SERIAL PRIMARY KEY,
  path_name VARCHAR(255) NOT NULL,
  path_type VARCHAR(50) DEFAULT 'walkway',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE paths ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read active paths
CREATE POLICY "Paths are viewable by everyone"
  ON paths FOR SELECT
  USING (is_active = true);

-- Create policy: Only admins can manage paths
CREATE POLICY "Only admins can manage paths"
  ON paths FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

### Waypoints Table

```sql
-- Create waypoints table
CREATE TABLE waypoints (
  waypoint_id SERIAL PRIMARY KEY,
  path_id INTEGER REFERENCES paths(path_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  latitude VARCHAR(50) NOT NULL,
  longitude VARCHAR(50) NOT NULL,
  is_accessible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_waypoints_path ON waypoints(path_id);
CREATE INDEX idx_waypoints_sequence ON waypoints(path_id, sequence);

-- Enable Row Level Security
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read waypoints
CREATE POLICY "Waypoints are viewable by everyone"
  ON waypoints FOR SELECT
  USING (true);

-- Create policy: Only admins can manage waypoints
CREATE POLICY "Only admins can manage waypoints"
  ON waypoints FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

## Step 4: Set Up Authentication

### Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates if needed

### Create Admin User

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - **Email**: `admin@evsu.edu.ph`
   - **Password**: (create a strong password)
   - **Auto Confirm User**: ✅ (check this)
4. Click **Create user**

### Set User Role

Run this SQL to set the admin role:

```sql
-- Set admin role for your admin user
UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@evsu.edu.ph';
```

**Note**: The `handle_new_user()` trigger automatically creates a profile in `public.users` when a user signs up via Supabase Auth. The role defaults to `'user'` unless specified in the user metadata during creation.

## Step 5: Install Supabase Client

In your backend/API server, install Supabase:

```bash
npm install @supabase/supabase-js
```

## Step 6: Configure Backend API

Create a `.env` file in your backend:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 7: Update Mobile App Config

Update `src/constants/config.js`:

```javascript
export const API_URL = (typeof __DEV__ !== 'undefined' && __DEV__)
  ? 'http://192.168.1.8:3000/api'  // Your backend API
  : 'https://api.evsuemap.com/api'; // Production API

export const USE_MOCK_DATA = false; // Set to false to use Supabase
```

## Step 8: Backend API Implementation Example

### Example: Get Buildings (Node.js/Express)

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('building_name');

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/buildings (Admin only)
app.post('/api/buildings', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Building created successfully',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

## Step 9: Insert Initial Data

Run this SQL to insert sample buildings:

```sql
INSERT INTO buildings (building_name, building_code, latitude, longitude, floors, description)
VALUES
  ('Main Administration Building', 'ADMIN', '11.2443', '125.0023', 3, 'Main administrative offices and student services center.'),
  ('Library Building', 'LIB', '11.2450', '125.0030', 2, 'Central library with study areas and computer labs.'),
  ('Science Laboratory', 'SCI', '11.2435', '125.0015', 2, 'Science laboratories and research facilities.'),
  ('Engineering Building', 'ENG', '11.2460', '125.0040', 4, 'Engineering department with workshops and labs.'),
  ('Cafeteria', 'CAFE', '11.2440', '125.0025', 1, 'Student cafeteria and dining area.'),
  ('Gymnasium', 'GYM', '11.2470', '125.0035', 1, 'Sports and recreation facility.');
```

## Step 10: Test Connection

1. Test your API endpoints
2. Verify data appears in Supabase dashboard
3. Test authentication flow
4. Test admin operations

## Security Notes

- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ Use service_role key only on backend (never expose to client)
- ✅ Use anon key for client-side operations (with RLS policies)
- ✅ Always validate user roles on backend
- ✅ Use HTTPS in production

## Next Steps

1. Set up your backend API server
2. Implement all CRUD endpoints
3. Set up authentication middleware
4. Test thoroughly
5. Deploy to production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

