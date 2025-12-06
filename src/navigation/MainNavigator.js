// src/navigation/MainNavigator.js - Main tab navigation
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Import screens
import MapScreen from '../screens/MapScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  const { isAdmin, logout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Chatbot') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#808080',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#4A90E2',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ 
          title: 'EVSU eMAP',
          headerTitle: 'Campus Map'
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ title: 'Search Campus' }}
      />
      <Tab.Screen 
        name="Chatbot" 
        component={ChatbotScreen}
        options={{ title: 'AI Assistant' }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{ title: 'My Favorites' }}
      />
      {isAdmin() && (
        <Tab.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ 
            title: 'Admin',
            headerRight: () => (
              <TouchableOpacity
                onPress={logout}
                style={{ marginRight: 16, padding: 4 }}
              >
                <Ionicons 
                  name="log-out-outline" 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default MainNavigator;

