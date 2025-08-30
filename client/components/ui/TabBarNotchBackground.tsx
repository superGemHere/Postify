import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;
const NOTCH_RADIUS = 36;
const NOTCH_WIDTH = 90;
const NOTCH_DEPTH = 32;

export default function TabBarNotchBackground() {
  const notchCenter = width / 2;
  const notchStart = notchCenter - NOTCH_WIDTH / 2;
  const notchEnd = notchCenter + NOTCH_WIDTH / 2;

  const d = `M0 0 H${notchStart}
    C${notchStart + 10} 0, ${notchStart + 16} ${NOTCH_DEPTH}, ${notchCenter} ${NOTCH_DEPTH}
    C${notchEnd - 16} ${NOTCH_DEPTH}, ${notchEnd - 10} 0, ${notchEnd} 0
    H${width} V${TAB_BAR_HEIGHT} H0 Z`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={TAB_BAR_HEIGHT} style={{ position: 'absolute', bottom: 0 }}>
        <Path d={d} fill="#fff" stroke="#E0E0E0" strokeWidth={1} />
      </Svg>
    </View>
  );
}
