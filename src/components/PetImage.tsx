import React, { useState } from 'react';
import { Image, View, Text, ImageStyle, ViewStyle, StyleProp } from 'react-native';

interface PetImageProps {
  uri: string;
  petName: string;
  style: StyleProp<ImageStyle>;
  /** Style for the fallback circle — should match dimensions/borderRadius of the image style */
  fallbackStyle?: StyleProp<ViewStyle>;
  fallbackFontSize?: number;
  fallbackBg?: string;
  fallbackColor?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

/**
 * Image component that shows the pet's first letter as a placeholder
 * when the image URI fails to load (e.g. local URIs from another device).
 */
export function PetImage({
  uri,
  petName,
  style,
  fallbackStyle,
  fallbackFontSize = 20,
  fallbackBg = '#E8E0F0',
  fallbackColor = '#7B4EC2',
  resizeMode,
}: PetImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const letter = petName ? petName.charAt(0).toUpperCase() : '?';
    return (
      <View
        style={[
          fallbackStyle ?? style,
          {
            backgroundColor: fallbackBg,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Text style={{ fontSize: fallbackFontSize, fontWeight: '700', color: fallbackColor }}>
          {letter}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
