import React, { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { ThemedText } from '@/components/ThemedText';

export function GradientTitle({ text }: { text: string }): JSX.Element {
  return (
    <View style={styles.gradientTitleContainer}>
      <MaskedView
        maskElement={
          <Text
            style={[styles.gradientTitleText, { color: '#000' }]}
          >
            {text}
          </Text>
        }
      >
        <LinearGradient
          colors={["#ff6a00", "#ee0979"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 40, width: 150 }}
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
