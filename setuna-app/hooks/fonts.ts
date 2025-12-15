// hooks/fonts.ts
import { useFonts } from 'expo-font';
import { IrishGrover_400Regular } from '@expo-google-fonts/irish-grover';

export function useCustomFonts() {
  return useFonts({
    IrishGrover: IrishGrover_400Regular,
  });
}
