import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Phone, MessageSquare, Link as LinkIcon, Shield } from 'lucide-react-native';
import { Theme } from '../theme';

import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LiveCallScreen } from '../screens/LiveCallScreen';
import { SMSInboxScreen } from '../screens/SMSInboxScreen';
import { URLScannerScreen } from '../screens/URLScannerScreen';
import { ThreatVaultScreen } from '../screens/ThreatVaultScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Call: undefined;
  SMS: undefined;
  URLHost: undefined; // named URLHost because URL is a reserved object name sometimes
  Vault: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Theme.colors.background,
          borderTopColor: Theme.colors.border,
          elevation: 0,
        },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Call" 
        component={LiveCallScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Phone color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="SMS" 
        component={SMSInboxScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="URLHost" 
        component={URLScannerScreen}
        options={{
          tabBarLabel: 'URL Scan',
          tabBarIcon: ({ color, size }) => <LinkIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Vault" 
        component={ThreatVaultScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
