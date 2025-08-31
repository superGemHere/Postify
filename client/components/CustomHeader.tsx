import React, { useState, JSX } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../store/authStore'
import { GradientTitle } from './GradientTitle'
import { SlideInDrawer } from './SlideInDrawer'
import { useRouter } from 'expo-router'

const CustomHeader = (): JSX.Element => {
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)
  const logout = useAuthStore((state) => state.logout)
  const router = useRouter()

  return (
    <View style={styles.headerContainer}>
      <GradientTitle text="Postify" />
      <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
        <Ionicons name="menu" size={28} color="#222" />
      </TouchableOpacity>
      <SlideInDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)}>
        <Text style={styles.drawerTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            logout()
            setDrawerVisible(false)
          }}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#222"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.drawerItemText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            setDrawerVisible(false)
            router.push('/screens/UploadSinglePhotoScreen')
          }}
        >
          <Ionicons name="image-outline" size={22} color="#222" style={{ marginRight: 8 }} />
          <Text style={styles.drawerItemText}>Upload Single Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            setDrawerVisible(false)
            router.push('/screens/UploadSinglePhotoScreen_fs')
          }}
        >
          <Ionicons name="image-outline" size={22} color="#222" style={{ marginRight: 8 }} />
          <Text style={styles.drawerItemText}>Upload Single Photo FS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            setDrawerVisible(false)
            router.push('/screens/UploadMultiplePhotosScreen')
          }}
        >
          <Ionicons name="images-outline" size={22} color="#222" style={{ marginRight: 8 }} />
          <Text style={styles.drawerItemText}>Upload Multiple Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            setDrawerVisible(false)
            router.push('/screens/UploadVideoScreen')
          }}
        >
          <Ionicons name="videocam-outline" size={22} color="#222" style={{ marginRight: 8 }} />
          <Text style={styles.drawerItemText}>Upload Video</Text>
        </TouchableOpacity>
      </SlideInDrawer>
    </View>
  )
}

export default CustomHeader

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 8,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  drawerItemText: {
    fontSize: 16,
  },
})