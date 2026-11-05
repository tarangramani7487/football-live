import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/constants/theme';
import { openStore, useAppUpdate } from '@/firebase/appUpdate';

/** Store-update popup. Forced updates can't be closed (Android back button does nothing). */
export function UpdateModal() {
  const { update, later } = useAppUpdate();
  if (!update) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={update.force ? () => {} : later}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/header-logo.png')} style={styles.logo} contentFit="contain" />
          </View>
          <Text style={styles.title}>{update.force ? 'Update required' : 'Update available'}</Text>
          {!!update.latest && update.latest !== '0.0.0' && <Text style={styles.version}>Version {update.latest}</Text>}
          <Text style={styles.message}>{update.message}</Text>

          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]} onPress={openStore} accessibilityRole="button">
            <Text style={styles.primaryText}>Update now</Text>
          </Pressable>
          {!update.force && (
            <Pressable style={styles.secondary} onPress={later} accessibilityRole="button">
              <Text style={styles.secondaryText}>Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,23,50,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, alignItems: 'center' },
  logoWrap: { width: 84, height: 84, borderRadius: 20, backgroundColor: '#061732', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logo: { width: 56, height: 34 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  version: { fontSize: 13, fontWeight: '600', color: colors.accent, marginTop: 4 },
  message: { fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 20 },
  primary: { alignSelf: 'stretch', backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  secondary: { alignSelf: 'stretch', paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
});
