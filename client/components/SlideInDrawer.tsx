import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SlideInDrawerProps {
  visible: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

const { height: screenHeight } = Dimensions.get('window');

export const SlideInDrawer = ({ visible, onClose, width = 230, children }: SlideInDrawerProps) => {
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
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.drawer,
            { 
              width, 
              transform: [{ translateX }], 
              height: screenHeight,
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 50,
            },
          ]}
          pointerEvents="auto"
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    justifyContent: 'space-between',
    borderLeftWidth: 0.5,
    borderLeftColor: '#e6e5e5',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
