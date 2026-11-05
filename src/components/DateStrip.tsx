import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { colors } from '@/constants/theme';

const DAYS_BACK = 7;
const DAYS_AHEAD = 14;
const ITEM_WIDTH = 58;

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "Today", "Yesterday", "Tomorrow" or e.g. "Monday, 2 Nov". */
export function dayLabel(date: Date) {
  const diff = Math.round((new Date(date.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function label(d: Date) {
  const today = new Date();
  const diff = Math.round((new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yday';
  if (diff === 1) return 'Tmrw';
  return d.toLocaleDateString([], { weekday: 'short' });
}

export function DateStrip({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const scroll = useRef<ScrollViewInstance>(null);
  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: DAYS_BACK + DAYS_AHEAD + 1 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i - DAYS_BACK);
      return d;
    });
  }, []);

  useEffect(() => {
    // Centre "Today" on first render.
    const t = setTimeout(
      () =>
        scroll.current?.scrollTo({
          x: Math.max(0, (DAYS_BACK - 2.5) * ITEM_WIDTH),
          animated: false,
        }),
      0,
    );
    return () => clearTimeout(t);
  }, []);

  // The wrapper keeps the strip's height: on web a horizontal ScrollView next to a flex:1 list gets squashed to 0.
  return (
    <View style={styles.bar}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6 }}>
        {days.map((d) => {
          const selected = sameDay(d, value);
          return (
            <Pressable key={d.toDateString()} onPress={() => onChange(d)} style={[styles.item, selected && styles.selected]}>
              <Text style={[styles.day, selected && styles.selectedText]}>{label(d)}</Text>
              <Text style={[styles.date, selected && styles.selectedText]}>
                {d.getDate()} {d.toLocaleDateString([], { month: 'short' })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    flexShrink: 0,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 6,
    borderRadius: 8,
  },
  selected: { backgroundColor: colors.primary },
  day: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  date: { fontSize: 12, color: colors.text, marginTop: 2 },
  selectedText: { color: colors.white },
});
