import { View, Text, StyleSheet } from 'react-native'
import React, { JSX } from 'react'
import { GradientTitle } from './GradientTitle'

const CustomHeader = (): JSX.Element => {
  return (
    <View style={styles.headerContainer}>
      <GradientTitle text="Postify" />
    </View>
  )
}

export default CustomHeader

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
})