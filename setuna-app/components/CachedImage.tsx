import React, { useEffect } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type CachedImageProps = {
  source: { uri: string } | number;
  style?: any;
  placeholder?: React.ReactNode;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
};

/**
 * A wrapper around expo-image that provides better caching and CORS handling
 * for external images like those from Unsplash
 */
export function CachedImage({ 
  source, 
  style, 
  placeholder, 
  contentFit = 'cover' 
}: CachedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [fallbackFailed, setFallbackFailed] = React.useState(false);

  // Default placeholder if none provided
  const defaultPlaceholder = (
    <View style={[styles.placeholder, style]}>
      <Ionicons name="person" size={50} color="#8b5cf6" />
    </View>
  );

  // Show placeholder if both ExpoImage and regular Image failed
  if ((hasError && fallbackFailed) || (hasError && !(typeof source === 'object' && source.uri))) {
    return placeholder || defaultPlaceholder;
  }
  
  // Use fallback to React Native Image if expo-image fails but fallback hasn't been tried yet
  if (hasError && !fallbackFailed && typeof source === 'object' && source.uri) {
    return (
      <Image 
        source={source} 
        style={style} 
        onError={() => {
          console.log('Regular Image also failed to load');
          setFallbackFailed(true);
        }} 
      />
    );
  }
  
  // Show placeholder during loading
  if (isLoading && placeholder) {
    return placeholder;
  } else if (isLoading && !placeholder) {
    return defaultPlaceholder;
  }

  // On web, use regular Image component to avoid CORS issues
  if (Platform.OS === 'web' && typeof source === 'object' && source.uri) {
    return (
      <Image
        source={source}
        style={style}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.log('Web Image loading error');
          setIsLoading(false);
          setHasError(true);
          setFallbackFailed(true); // Skip fallback attempt since we're already using Image
        }}
      />
    );
  }
  
  // Use expo-image with better error handling for native platforms
  return (
    <ExpoImage
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={300}
      onLoadStart={() => setIsLoading(true)}
      onLoad={() => setIsLoading(false)}
      onError={(error) => {
        console.log('Image loading error:', error);
        setIsLoading(false);
        setHasError(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
});