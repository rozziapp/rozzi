import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { useCustomFonts } from '@/hooks/fonts'; // Make sure the path is correct!

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useCustomFonts();

  // Wait until fonts are loaded
  if (!fontsLoaded) {
    return <Text style={{ marginTop: 50, textAlign: 'center' }}>Loading fonts...</Text>;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          display: 'none',
        },
        // Remove all animation effects for instant switching like Instagram
        animation: 'none',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

