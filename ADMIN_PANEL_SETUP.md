# Admin Panel Setup Guide

## Overview

The admin panel is a separate React + Vite application for managing campus data. It connects directly to Supabase using the service_role key for full CRUD access.

## Project Structure

```
evsu-emap-admin/
├── .env                    # Supabase credentials
├── package.json
├── vite.config.js
└── src/
    ├── lib/
    │   └── supabase.js     # Supabase client
    ├── services/
    │   ├── buildingService.js
    │   └── locationService.js
    ├── hooks/
    │   └── useBuildings.js
    └── pages/
        └── BuildingsPage.jsx
```

## Setup Steps

### 1. Create Admin Panel Project

```bash
npm create vite@latest evsu-emap-admin -- --template react
cd evsu-emap-admin
npm install
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @tanstack/react-query
npm install react-hook-form yup @hookform/resolvers
npm install react-router-dom
npm install leaflet react-leaflet
```

### 3. Create Environment File

Create `.env` in `evsu-emap-admin/`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**Important**: Use the **service_role** key (not anon key) for admin panel!

### 4. Create Supabase Client

**File:** `src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const supabase = createClient(supabaseUrl, supabaseServiceKey)
```

### 5. Create Building Service

**File:** `src/services/buildingService.js`

```javascript
import { supabase } from '../lib/supabase'

export const buildingService = {
  async getAll() {
    const { data, error } = await supabase
      .from('buildings')
      .select('*, locations(count)')
      .order('name')
    
    if (error) throw error
    return data
  },

  async create(building) {
    const { data, error } = await supabase
      .from('buildings')
      .insert(building)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('buildings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async uploadImage(file, buildingId) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${buildingId}-${Date.now()}.${fileExt}`
    const filePath = `buildings/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('building-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('building-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }
}
```

### 6. Create React Query Hooks

**File:** `src/hooks/useBuildings.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { buildingService } from '../services/buildingService'

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: buildingService.getAll,
    staleTime: 5 * 60 * 1000
  })
}

export function useCreateBuilding() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: buildingService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
    }
  })
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }) => buildingService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
    }
  })
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: buildingService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
    }
  })
}
```

### 7. Set Up React Query Provider

**File:** `src/main.jsx` or `src/App.jsx`

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  )
}
```

## Features to Implement

### Buildings Management Page

- List all buildings in a grid/table
- Add new building (form with validation)
- Edit building (inline or modal)
- Delete building (with confirmation)
- Upload building images
- Filter by category
- Search functionality

### Map Integration

- Display buildings on Leaflet map
- Click to select/edit building
- Drag markers to update coordinates
- Draw paths/walkways

### Locations Management

- Manage rooms/locations within buildings
- Add/edit/delete locations
- Filter by building

## Security Notes

- ✅ **Never expose** service_role key to client-side code in production
- ✅ Consider adding authentication to admin panel
- ✅ Use environment variables for all secrets
- ✅ Add `.env` to `.gitignore`

## Next Steps

1. Create the admin panel project structure
2. Implement building CRUD interface
3. Add map integration
4. Implement image upload
5. Add authentication (optional but recommended)

