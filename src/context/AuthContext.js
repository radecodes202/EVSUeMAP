// src/context/AuthContext.js - Authentication Context
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuthData, saveAuthData, clearAuthData } from '../utils/authStorage';
import { supabase } from '../lib/supabase';
import { USE_MOCK_DATA } from '../constants/config';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const authData = await getAuthData();
      if (authData && authData.token) {
        setUser(authData.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Demo mode: Instant login when USE_MOCK_DATA is enabled
      if (USE_MOCK_DATA) {
        console.log('📦 Demo mode: Using mock authentication');
        const demoUser = {
          id: 1,
          email: email.trim() || 'demo@evsu.edu.ph',
          name: 'Demo User',
          role: 'admin',
        };
        const demoToken = 'demo_token_' + Date.now();
        const authData = { user: demoUser, token: demoToken };
        await saveAuthData(authData);
        setUser(demoUser);
        setIsAuthenticated(true);
        return { success: true };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Try to fetch user profile, but don't fail if table doesn't exist
      let profile = null;
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        // If table doesn't exist, use auth user data as fallback
        if (profileError.message && profileError.message.includes('schema cache')) {
          console.warn('Users table not found, using auth user data');
        } else {
          console.warn('Profile fetch error:', profileError.message);
        }
      } else {
        profile = profileData;
      }

      const authData = {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: profile?.name || data.user.user_metadata?.name || 'User',
          role: profile?.role || 'user',
        },
        token: data.session?.access_token,
      };

      await saveAuthData(authData);
      setUser(authData.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('📦 Demo mode: Using mock registration');
        const demoUser = {
          id: Date.now(),
          email: email.trim(),
          name: name.trim(),
          role: 'user',
        };
        const demoToken = 'demo_token_' + Date.now();
        const authData = { user: demoUser, token: demoToken };
        await saveAuthData(authData);
        setUser(demoUser);
        setIsAuthenticated(true);
        return { success: true };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'User creation failed. Please try again.' };
      }

      // Wait a moment for the database trigger to create the user profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to fetch the profile (created by trigger)
      let profile = null;
      let profileError = null;
      
      // Try fetching the profile with retries
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: profileData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileData && !fetchError) {
          profile = profileData;
          break;
        }
        
        profileError = fetchError;
        
        // If table doesn't exist, try to create the profile manually
        if (fetchError && fetchError.message && fetchError.message.includes('schema cache')) {
          console.warn('Table not found in schema cache, attempting manual profile creation...');
          
          // Try to insert the profile manually (may fail due to RLS, but worth trying)
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: name.trim(),
              role: 'user',
            });
          
          if (!insertError) {
            // If insert succeeded, fetch it
            const { data: newProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();
            profile = newProfile;
            break;
          }
        }
        
        // Wait before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // If we still don't have a profile, use defaults from auth user
      // The profile might be created later by the trigger
      const authData = {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: profile?.name || name.trim() || data.user.user_metadata?.name || 'User',
          role: profile?.role || 'user',
        },
        token: data.session?.access_token,
      };

      await saveAuthData(authData);
      setUser(authData.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed. Please try again.' };
    }
  };

  const loginAsGuest = async () => {
    try {
      console.log('👤 Logging in as guest');
      
      const guestUser = {
        id: 0,
        email: 'guest@evsu.edu.ph',
        name: 'Guest User',
        role: 'user', // Guest users are regular users, not admin
      };
      
      const guestToken = 'guest_token_' + Date.now();
      const authData = { user: guestUser, token: guestToken };
      
      await saveAuthData(authData);
      setUser(guestUser);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error('Guest login error:', error);
      return {
        success: false,
        error: 'Failed to login as guest',
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.isAdmin === true;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    loginAsGuest,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

