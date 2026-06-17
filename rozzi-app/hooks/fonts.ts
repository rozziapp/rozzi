// hooks/fonts.ts
import { useFonts } from 'expo-font';
import { IrishGrover_400Regular } from '@expo-google-fonts/irish-grover';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';

export function useCustomFonts() {
  return useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    IrishGrover: IrishGrover_400Regular,
    Outfit: Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Outfit-ExtraBold': Outfit_800ExtraBold,
  });
}
