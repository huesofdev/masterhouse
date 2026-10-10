import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ImageStyle, Text } from 'react-native';
import { Image } from 'expo-image';

interface ProductImageProps {
  url?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  iconSize?: number;
}

const C = {
  cardBorder: '#1E1E1E',
  card: '#111111',
};

export const ProductImage: React.FC<ProductImageProps> = ({ 
  url, 
  style, 
  containerStyle,
  iconSize = 24 
}) => {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return (
      <View style={[styles.placeholder, containerStyle, style as any]}>
        <Text style={{ fontSize: iconSize, opacity: 0.5 }}>📦</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: url }}
        style={[styles.image, style]}
        onError={() => {
          console.log('Failed to load image:', url);
          setHasError(true);
        }}
        contentFit="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: C.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
});
