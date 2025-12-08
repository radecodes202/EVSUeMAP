# EVSU eMAP

Campus navigation app with Supabase backend, admin-defined paths, feedback/help, and offline-friendly mock data fallback.

## Features
- Auth: Supabase email/password, roles (admin/user/guest), guest mode.
- Map: Buildings, admin paths/waypoints overlay, custom-path routing with OSRM fallback, map type toggle (standard/satellite/hybrid/terrain), campus bounds guard.
- Search & Favorites: Filter by category, search by name/code/description, save favorites.
- Feedback: In-app feedback form to `user_feedback` table.
- Help/About: Built-in help guide and about screen.
- Admin data: Uses Supabase `buildings`, `paths`, `waypoints`, `locations`, etc.

## Prerequisites
- Node 18+
- Expo CLI (use local CLI: `npx expo start`)
- Supabase project with tables/policies from `database-setup.sql`

## Setup
1) Install deps:
```bash
npm install
```

2) Configure Supabase (client-side; anon key only):
- Create `.env` or `.env.local` with:
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

3) Configure map/API behavior in `src/constants/config.js`:
- `USE_MOCK_DATA = false` to use Supabase.
- Update `API_URL` if you still use any legacy API (mostly removed).

4) Run the app:
```bash
npx expo start
```

## Database Schema (key tables)
- `public.users`: profile/role (extends Supabase auth.users)
- `buildings`: point data (lat/lng, category)
- `locations`: rooms within buildings
- `paths`: admin-defined paths
- `waypoints`: ordered points for each path
- `user_feedback`: feedback submissions

## Routing logic
1. Try admin-defined paths (closest endpoints within ~0.5 km total).
2. If none, call OSRM public service; fallback to straight line if that fails.

## Map overlays
- Buildings render as small rectangles (approx footprint) plus markers.
- Admin paths render as dashed polylines.
- Map type toggle in-map controls.

## Feedback & Help
- Feedback screen writes to `user_feedback`.
- Help screen includes quick user guide and FAQ.

## Environment notes
- Supabase client comes from `src/lib/supabase.js` and reads env vars above.
- Mock data is used only if `USE_MOCK_DATA` is true.

## Troubleshooting
- If mock data shows up, verify Supabase URL/key and network reachability.
- If OSRM calls fail, routing falls back to admin paths or straight-line.
- For dependency mismatches, use `npx expo install <pkg>@<version>` (e.g., picker).