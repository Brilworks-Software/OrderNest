import { Tabs } from 'expo-router';
import React from 'react';

import {Entypo, FontAwesome, Fontisto, MaterialIcons} from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1d304b',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#DFE0ED' },
        tabBarInactiveTintColor: '#abb5c3',
        tabBarActiveTintColor: '#104A9c',
        
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "home",
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={22} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Staff',
          tabBarIcon: ({ color }) => <MaterialIcons name="people" size={24} color={color}/>,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color}/>,
        }}
      />
      {/* <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color}/>,
        }}
      /> */}
    </Tabs>
  );
}