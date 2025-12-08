# User Management Guide for EVSU eMAP

## Overview

User management in EVSU eMAP uses Supabase's built-in authentication system combined with a custom `public.users` table for additional user information.

## Database Structure

### Supabase Auth Users (`auth.users`)
Supabase automatically manages this table. It contains:
- `id` (UUID) - Primary key
- `email` - User email
- `encrypted_password` - Hashed password
- `created_at` - Account creation time
- `email_confirmed_at` - Email verification time
- `raw_user_meta_data` - Additional metadata (JSONB)

### Public Users Table (`public.users`)
This extends `auth.users` with app-specific data:
- `id` (UUID) - References `auth.users(id)`
- `email` - User email (for easy queries)
- `name` - User's full name
- `role` - User role: `'user'`, `'admin'`, or `'guest'`
- `is_active` - Whether account is active
- `created_at` - Profile creation time
- `updated_at` - Last update time

## User Roles

1. **`user`** (default) - Regular authenticated user
   - Can view buildings, search, use map
   - Can save favorites
   - Cannot manage data

2. **`admin`** - Administrator
   - All user permissions
   - Can create/edit/delete buildings
   - Can manage paths/walkways
   - Can manage other users (via admin panel)

3. **`guest`** - Guest user (temporary)
   - Can view buildings, search, use map
   - Cannot save favorites (optional restriction)
   - No admin access

## Creating Users

### Method 1: Via Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email**: `user@evsu.edu.ph`
   - **Password**: (create strong password)
   - **Auto Confirm User**: ✅ (check to skip email verification)
   - **User Metadata** (optional):
     ```json
     {
       "name": "User Name",
       "role": "user"
     }
     ```
4. Click **Create user**

The `public.users` table will automatically be populated via the trigger.

### Method 2: Via Supabase Auth API (Programmatic)

```javascript
// In your backend/admin panel
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@evsu.edu.ph',
  password: 'secure_password',
  email_confirm: true,
  user_metadata: {
    name: 'User Name',
    role: 'user'
  }
});
```

### Method 3: User Self-Registration (Future Feature)

Users can sign up themselves if you enable email signup in Supabase:
1. Go to **Authentication** → **Providers** → **Email**
2. Enable **Enable email signup**
3. Users can then register via your app

## Setting Admin Role

To make a user an admin:

```sql
-- In Supabase SQL Editor
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@evsu.edu.ph';
```

Or via Supabase client (admin panel):

```javascript
const { error } = await supabase
  .from('users')
  .update({ role: 'admin' })
  .eq('email', 'admin@evsu.edu.ph');
```

## User Management API Endpoints (For Admin Panel)

### Get All Users

```javascript
// GET /api/users (Admin only)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .order('created_at', { ascending: false });
```

### Get User by ID

```javascript
// GET /api/users/:id
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### Update User

```javascript
// PUT /api/users/:id (Admin only)
const { data, error } = await supabase
  .from('users')
  .update({
    name: 'Updated Name',
    role: 'admin',
    is_active: true
  })
  .eq('id', userId)
  .select()
  .single();
```

### Delete User

```javascript
// DELETE /api/users/:id (Admin only)
// This will cascade delete from auth.users too
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId);
```

### Reset User Password

```javascript
// Via Supabase Admin API
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: 'user@evsu.edu.ph'
});
```

## Authentication Flow

### Mobile App Login

1. User enters email/password
2. App calls Supabase Auth:
   ```javascript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: email,
     password: password
   });
   ```
3. On success, fetch user profile:
   ```javascript
   const { data: userProfile } = await supabase
     .from('users')
     .select('*')
     .eq('id', data.user.id)
     .single();
   ```
4. Store session and user data
5. Check role for admin access

### Guest Login

Guest users don't use Supabase Auth. They're created locally:
```javascript
const guestUser = {
  id: 'guest_' + Date.now(),
  email: 'guest@evsu.edu.ph',
  name: 'Guest User',
  role: 'guest'
};
```

## Row Level Security (RLS) Policies

### Users Table Policies

1. **Users can view own data**: Users can only see their own profile
2. **Users can update own data**: Users can update their name, but not role
3. **Service role all users**: Admin panel (using service_role key) can manage all users

### Example: Check if User is Admin

```javascript
// In your app
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('id', userId)
  .single();

const isAdmin = user?.role === 'admin';
```

## Admin Panel User Management

The admin panel should include:

1. **User List Page**
   - Table/grid of all users
   - Filter by role, active status
   - Search by email/name

2. **User Details Page**
   - View user information
   - Edit user details
   - Change user role
   - Activate/deactivate account
   - Reset password

3. **Create User Page**
   - Form to create new user
   - Set initial role
   - Send invitation email (optional)

## Sample Queries

### Get all admins
```sql
SELECT * FROM public.users WHERE role = 'admin';
```

### Get active users
```sql
SELECT * FROM public.users WHERE is_active = true;
```

### Get users created in last 30 days
```sql
SELECT * FROM public.users 
WHERE created_at > NOW() - INTERVAL '30 days';
```

### Count users by role
```sql
SELECT role, COUNT(*) as count 
FROM public.users 
GROUP BY role;
```

## Security Notes

- ✅ **Never expose** service_role key to client
- ✅ Use **anon key** in mobile app (with RLS)
- ✅ Users can only see/edit their own data (RLS enforced)
- ✅ Only admins can change roles (enforce in admin panel)
- ✅ Passwords are never stored in `public.users` (handled by Supabase Auth)

## Integration with Mobile App

Update `src/context/AuthContext.js` to use Supabase Auth:

```javascript
import { supabase } from '../lib/supabase';

const login = async (email, password) => {
  // Sign in with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  // Store session
  await saveAuthData({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || 'User',
      role: profile?.role || 'user'
    },
    token: data.session.access_token
  });

  return { success: true };
};
```

## Next Steps

1. Run the updated `database-setup.sql` in Supabase
2. Create your first admin user via Supabase dashboard
3. Update mobile app AuthContext to use Supabase Auth
4. Build admin panel user management interface
5. Test user creation, login, and role management

