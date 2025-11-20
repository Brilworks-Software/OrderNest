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
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={22} color={"#ff4444"} />,
          headerShown: false,
        }}
      />
        <Tabs.Screen
          name="menuItems"
          options={{
            title: 'Menu Items',
            tabBarIcon: ({ color }) => <MaterialIcons name="food-bank" size={24} color={'#ff4444'}/>,
            headerShown: false
          }}
        />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={'#ff4444'}/>,
          headerShown:false,
        }}
      />
    </Tabs>
  );
}