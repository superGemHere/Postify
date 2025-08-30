import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useStatusBarHeight() {
  const insets = useSafeAreaInsets();
  return insets.top;
}
