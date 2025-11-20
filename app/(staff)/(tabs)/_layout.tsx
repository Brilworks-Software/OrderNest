import { Tabs } from 'expo-router';
import React from 'react';

import {Entypo, FontAwesome, Fontisto, MaterialIcons} from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // headerStyle: { backgroundColor: '#10b981' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold', color: "black" },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#DFE0ED' },
        tabBarInactiveTintColor: '#abb5c3',
        tabBarActiveTintColor: '#000',
        
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "home",
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={22} color={"#10b981"} />,
          headerShown: false,
        }}
      />
        <Tabs.Screen
          name="order"
          options={{
            title: 'Order',
            tabBarIcon: ({ color }) => <FontAwesome name="pencil-square-o" size={24} color={'#10b981'}/>,
            headerShown: false,
          }}
        />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={'#10b981'}/>,
          headerShown: false
        }}
      />
    </Tabs>
  );
}