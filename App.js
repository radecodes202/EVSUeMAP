// App.js - EVSU eMAP Main Application
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <AuthNavigator />
      </AuthProvider>
    </>
  );
}