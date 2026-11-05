import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props<T extends string> = {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
};

/** Scrollable pill tabs on the navy header. */
export function TopTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <View style={styles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((tab) => {
          const selected = tab === active;
          return (
            <Pressable key={tab} onPress={() => onChange(tab)} style={[styles.tab, selected && styles.tabActive]}>
              <Text style={[styles.label, selected && styles.labelActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.primary, paddingBottom: 10 },
  row: { paddingHorizontal: 10, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor: colors.accent },
  label: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 13 },
  labelActive: { color: colors.primaryDark, fontWeight: '800' },
});
