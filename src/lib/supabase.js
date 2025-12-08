// src/lib/supabase.js - Supabase client configuration
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { USE_MOCK_DATA } from '../constants/config';

// Supabase configuration
// Optionally supply via env: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://audzjcrkclatnfadswpd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_o3JoV2XIbdq7y81nHLeKYg_F86mHZNK';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  // If mock data is forced, treat as not configured.
  if (USE_MOCK_DATA) return false;
  // Otherwise assume configured; connection errors will surface in logs.
  return true;
};

