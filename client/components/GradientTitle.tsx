import React, { JSX, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { ThemedText } from '@/components/ThemedText';

interface GradientTitleProps {
  text: string;
  xAlignment?: 'left' | 'center' | 'right';
  addContainerStyles?: object;
  addTextStyles?: object;
}

export function GradientTitle({ text, xAlignment = 'left', addContainerStyles, addTextStyles }: GradientTitleProps): JSX.Element {

  const alignItemsMap: Record<'left' | 'center' | 'right', 'flex-start' | 'center' | 'flex-end'> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };
  const alignItemsValue = alignItemsMap[xAlignment];

  const [textWidth, setTextWidth] = useState<number>(0);

  return (
    <View style={[styles.gradientTitleContainer, { alignItems: alignItemsValue }, addContainerStyles]}>
      <MaskedView
        maskElement={
          <Text
            style={[styles.gradientTitleText, { color: '#000' }, addTextStyles]}
            onLayout={e => setTextWidth(e.nativeEvent.layout.width)}
          >
            {text}
          </Text>
        }
      >
        <LinearGradient
          colors={["#ff6a00", "#ee0979"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 40, width: textWidth || 150, alignSelf: 'center' }}
        />
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientTitleContainer: {
    alignItems: 'flex-start',
    paddingTop: 15,
    paddingHorizontal: 5,
  },
  gradientTitleText: {
    fontSize: 32,
    fontFamily: 'Instagram',
    lineHeight: 40,
    letterSpacing: 1,
  },
});
