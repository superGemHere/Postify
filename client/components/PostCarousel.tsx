import React, { JSX, useState } from "react";
import { Dimensions, Image, View, StyleSheet } from "react-native";
import Carousel from "react-native-reanimated-carousel";

export default function PostCarousel({ images }: { images: string[] }): JSX.Element {
   const [activeIdx, setActiveIdx] = useState(0);
   return (
      <View>
         <Carousel
            width={Dimensions.get('window').width - 24}
            height={320}
            data={images}
            renderItem={({ item }) => (
               <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
            )}
            style={{ borderRadius: 8, marginBottom: 8 }}
            loop={false}
            onSnapToItem={setActiveIdx}
         />
         {images.length > 1 && (
            <View style={styles.carouselDotsRow}>
               {images.map((_, idx) => (
                  <View
                     key={idx}
                     style={[styles.carouselDot, activeIdx === idx && styles.carouselDotActive]}
                  />
               ))}
            </View>
         )}
      </View>
   );
}

const styles = StyleSheet.create({
   image: {
		width: '100%',
		height: 320,
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: '#ddd',
	},
   carouselDotsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
	},
	carouselDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#ccc',
		marginHorizontal: 2,
	},
	carouselDotActive: {
		backgroundColor: '#007bff',
		width: 10,
		height: 10,
	}
});