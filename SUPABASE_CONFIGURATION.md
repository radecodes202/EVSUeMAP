# Supabase Configuration Guide

## Quick Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: `evsuemap` (or your choice)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

### 2. Get Your Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (for mobile app)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (for admin - keep secret!)

### 3. Set Up Database

1. Go to **SQL Editor** in Supabase dashboard
2. Open the `database-setup.sql` file from this project
3. Copy and paste the entire SQL script
4. Click **Run** to execute
5. Verify tables were created in **Table Editor**

### 4. Configure Mobile App

1. Open `src/lib/supabase.js`
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

3. Save the file

### 5. Test Connection

1. Run the app: `npm start`
2. Check console logs for:
   - `✅ Buildings fetched: X` (if Supabase is working)
   - `📦 Using mock data` (if Supabase not configured)

## Environment Variables (Optional)

For better security, you can use environment variables:

1. Create `.env` file in project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Update `src/lib/supabase.js`:
```javascript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
```

3. Add to `.gitignore`:
```
.env
.env.local
```

## Verification Checklist

- [ ] Supabase project created
- [ ] Database tables created (run `database-setup.sql`)
- [ ] Sample data inserted
- [ ] Mobile app credentials configured
- [ ] App successfully fetches buildings from Supabase
- [ ] Real-time updates working (test by updating a building in Supabase dashboard)

## Troubleshooting

### "Invalid API key" error
- Check that you copied the full anon key
- Verify the key is from Settings → API → anon public
- Restart Expo dev server after changing credentials

### "Row Level Security" error
- Verify RLS policies were created (check in Supabase dashboard → Authentication → Policies)
- Make sure you ran the complete `database-setup.sql` script

### App still using mock data
- Check `USE_MOCK_DATA` in `src/constants/config.js` (should be `false`)
- Verify Supabase credentials are correct
- Check console logs for error messages

### Real-time not working
- Verify subscription is set up correctly
- Check Supabase dashboard → Database → Replication is enabled
- Ensure you're using the anon key (not service_role key) in mobile app

## Next Steps

1. **Admin Panel Setup**: See `ADMIN_PANEL_SETUP.md` (to be created)
2. **Storage Setup**: Create storage bucket for building images
3. **Authentication**: Set up user authentication if needed
4. **Deployment**: Deploy to production

## Security Notes

- ✅ **Never commit** `.env` files or credentials to git
- ✅ Use **anon key** in mobile app (read-only with RLS)
- ✅ Use **service_role key** only in admin panel (server-side)
- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ Public read access, admin write access via policies

