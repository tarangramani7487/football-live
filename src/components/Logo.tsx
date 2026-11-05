import { Image } from 'expo-image';
import { StyleProp, View, ImageStyle } from 'react-native';
import { colors } from '@/constants/theme';

export function Logo({ uri, size = 24, round, style }: { uri?: string; size?: number; round?: boolean; style?: StyleProp<ImageStyle> }) {
  const shape = { width: size, height: size, borderRadius: round ? size / 2 : 0 };
  if (!uri) return <View style={[shape, { backgroundColor: colors.border, borderRadius: size / 2 }]} />;
  return <Image source={{ uri }} style={[shape, style]} contentFit="contain" transition={150} />;
}
