import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({ message, icon = 'football-outline' }: { message: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 200 },
  text: { color: colors.textMuted, marginTop: 10, textAlign: 'center', fontSize: 15 },
  button: { marginTop: 14, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  buttonText: { color: colors.white, fontWeight: '600' },
});
