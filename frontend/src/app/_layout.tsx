import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { ToastProvider } from '../components/Motion';
import { LocalStoreProvider } from '../services/storage/LocalStore';
import { font } from '../theme';

export default function Layout() {
  // One font family for the whole app. Bundled with the app, so it works offline and in Expo Go.
  const [loaded, failed] = useFonts({
    [font.regular]: PlusJakartaSans_400Regular,
    [font.medium]: PlusJakartaSans_500Medium,
    [font.semibold]: PlusJakartaSans_600SemiBold,
    [font.bold]: PlusJakartaSans_700Bold,
  });
  if (!loaded && !failed) return null;
  return <LocalStoreProvider><ToastProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} /></ToastProvider></LocalStoreProvider>;
}
