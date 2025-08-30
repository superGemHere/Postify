import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SlideInDrawerProps {
  visible: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}
const height = Dimensions.get('window').height;
export const SlideInDrawer = ({ visible, onClose, width = 220, children }: SlideInDrawerProps) => {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(width)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [visible, width, translateX]);

  if (!shouldRender) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { top: insets.top, height: height - insets.top },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.drawer,
          { width, transform: [{ translateX }], height: height - insets.top },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    height: height,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingHorizontal: 20,

   borderLeftWidth: .5,
   borderLeftColor: '#e6e5e5',
  },
});
