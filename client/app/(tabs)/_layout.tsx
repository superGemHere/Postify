import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, TouchableOpacity, View, StyleSheet, Animated, Text } from 'react-native';
import { router } from 'expo-router';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarNotchBackground from '@/components/ui/TabBarNotchBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import CustomHeader from '@/components/CustomHeader';

interface MenuItem {
  icon: string;
  label: string;
  color: string;
  route: string;
}

const menuItems: MenuItem[] = [
  { icon: 'camera', label: 'Photo', color: '#FF6B6B', route: '/screens/UploadSinglePhotoScreen_fs' },
  { icon: 'videocam', label: 'Video', color: '#4ECDC4', route: '/screens/UploadVideoScreen' },
  { icon: 'library.books', label: 'Text', color: '#45B7D1', route: '/screens/UploadTextScreen' },
  { icon: 'photo.stack', label: 'Photos', color: '#96CEB4', route: '/screens/UploadMultiplePhotosScreen' },
];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    console.log('Toggle menu pressed! Current state:', isMenuOpen);
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemPress = (route: string) => {
    console.log('Menu item pressed:', route);
    setIsMenuOpen(false);
    router.push(route as any);
  };

  function FloatingMiddleIcon() {
    return (
      <View style={fabStyles.fabContainer}>
        {/* Backdrop - BEHIND everything */}
        {isMenuOpen && (
          <TouchableOpacity
            style={fabStyles.backdrop}
            activeOpacity={1}
            onPress={toggleMenu}
          />
        )}

        {/* Menu Items - ABOVE backdrop */}
        {isMenuOpen && (
          <View style={fabStyles.menuContainer} pointerEvents="box-none">
            {menuItems.map((item, index) => (
              <View
                key={index}
                style={fabStyles.menuItem}
                pointerEvents="auto"
              >
                <TouchableOpacity
                  style={[fabStyles.menuButton, { backgroundColor: item.color }]}
                  onPress={() => handleMenuItemPress(item.route)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name={item.icon as any} size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={fabStyles.menuLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Main FAB Button - ABOVE everything */}
        <TouchableOpacity 
          style={fabStyles.fabButton} 
          activeOpacity={0.85} 
          onPress={toggleMenu}
        >
          <IconSymbol name={isMenuOpen ? "xmark" : "plus"} size={36} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            header: () => <CustomHeader />,
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
    bottom: -24,
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 80,
    zIndex: 1003, // Highest z-index
  },
  menuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1002, // Above backdrop, below FAB
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    zIndex: 1002,
  },
  menuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  menuLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1001, // Lowest z-index
  },
});
