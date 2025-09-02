import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

import { useAuthStore } from '../store/authStore';
import AuthScreen from './screens/Auth';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Instagram: require('../assets/fonts/Instagram-Bold.otf'),
    Dynalight: require('../assets/fonts/Dynalight-Regular.ttf'),
  });
  const user = useAuthStore((state) => state.user);
  useEffect(() => {
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && data.session.user) {
        useAuthStore.setState({
          user: { id: data.session.user.id, email: data.session.user.email ?? '' },
          token: data.session.access_token,
        });
      }
    };
    if (!user) restoreSession();
  }, [user]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen 
          name="screens/UploadSinglePhotoScreen_fs" 
          options={{ 
            title: 'Upload Photo',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="screens/UploadMultiplePhotosScreen" 
          options={{ 
            title: 'Upload Photos',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="screens/UploadVideoScreen" 
          options={{ 
            title: 'Upload Video',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="screens/UploadTextScreen" 
          options={{ 
            title: 'Create Text Post',
            presentation: 'modal' 
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
