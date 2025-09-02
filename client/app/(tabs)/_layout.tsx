import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarNotchBackground from '@/components/ui/TabBarNotchBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import CustomHeader from '@/components/CustomHeader';


export default function TabLayout() {
  const colorScheme = useColorScheme();

  function FloatingMiddleIcon() {
    return (
      <View style={fabStyles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity style={fabStyles.fabButton} activeOpacity={0.85} onPress={() => { /* TODO: Add action */ }}>
          <IconSymbol name="plus" size={36} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            header: () => <CustomHeader />, // header can now use context
            tabBarButton: HapticTab,
            tabBarBackground: TabBarNotchBackground,
            tabBarStyle: Platform.select({
              ios: {
                position: 'absolute',
              },
              default: {},
            }),
          
          }}>
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />, 
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: 'Profile',
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />, 
              }}
            />
        </Tabs>
        <FloatingMiddleIcon />
      </View>
  );
}

const fabStyles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 32,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 30,
  },
});
