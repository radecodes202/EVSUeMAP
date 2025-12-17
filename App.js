// App.js - EVSU eMAP Main Application
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { supabase } from './src/lib/supabase';

export default function App() {
  useEffect(() => {
    // Handle deep links (email confirmation, etc.)
    const handleDeepLink = async (url) => {
      if (!url) return;

      console.log('📧 Deep link received:', url);

      // Check if this is an auth callback (email confirmation)
      if (url.includes('/auth/callback') || url.includes('token=') || url.includes('type=')) {
        try {
          // Extract the URL hash/fragment
          const hash = url.split('#')[1] || url.split('?')[1];
          
          if (hash) {
            // Parse the hash to get access_token and other params
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            if (type === 'signup' || type === 'recovery') {
              // Set the session from the URL tokens
              if (accessToken && refreshToken) {
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (error) {
                  console.error('Error setting session:', error);
                } else {
                  console.log('✅ Email confirmed successfully!');
                }
              }
            }
          }
        } catch (error) {
          console.error('Error handling deep link:', error);
        }
      }
    };

    // Handle initial URL (app opened from link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <AuthNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}