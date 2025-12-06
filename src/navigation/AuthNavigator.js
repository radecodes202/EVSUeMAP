// src/navigation/AuthNavigator.js - Navigation wrapper with authentication
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';
import LoginScreen from '../screens/LoginScreen';
import MainNavigator from './MainNavigator';
import AboutScreen from '../screens/AboutScreen';
import LoadingView from '../components/LoadingView';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingView message="Checking authentication..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen 
              name="About" 
              component={AboutScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: '#fff',
                headerTitle: 'About',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AuthNavigator;
