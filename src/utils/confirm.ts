import { Alert, Platform } from 'react-native';

/**
 * Cross-platform delete/action confirmation.
 * - Native: uses Alert.alert (native dialog)
 * - Web: uses window.confirm (browser dialog) because Alert.alert
 *   button callbacks are silently dropped in React Native Web.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Delete',
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
}
