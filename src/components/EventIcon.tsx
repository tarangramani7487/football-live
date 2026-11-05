import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type EventKind = 'goal' | 'own-goal' | 'penalty' | 'yellow' | 'red' | 'second-yellow' | 'sub' | 'sub-in' | 'sub-out' | 'whistle';

/** Maps an ESPN play/key-event type (e.g. "goal", "yellow-card", "substitution") to an icon kind. */
export function eventKind(type?: string, text?: string): EventKind | null {
  if (!type) return null;
  if (type.includes('own-goal') || /own goal/i.test(text ?? '')) return 'own-goal';
  if (type.includes('penalty') && type.includes('goal')) return 'penalty';
  if (type.includes('goal') && !type.includes('kick')) return 'goal';
  if (type.includes('red-card')) return /second yellow/i.test(text ?? '') ? 'second-yellow' : 'red';
  if (type.includes('yellow-card')) return 'yellow';
  if (type.includes('substitution')) return 'sub';
  if (/kickoff|halftime|end-|start-2nd|full-time/.test(type)) return 'whistle';
  return null;
}

const YELLOW = '#FACC15';
const RED = '#DC2626';

function Card({ color, size }: { color: string; size: number }) {
  return <View style={{ width: size * 0.62, height: size * 0.86, borderRadius: 2, backgroundColor: color, transform: [{ rotate: '8deg' }] }} />;
}

/** Icon for a match event. Cards are drawn shapes so they match real cards. `color` overrides the neutral goal colour (e.g. on dark headers). */
export function EventIcon({ kind, size = 16, color }: { kind: EventKind; size?: number; color?: string }) {
  switch (kind) {
    case 'goal':
      return <MaterialCommunityIcons name="soccer" size={size} color={color ?? colors.text} />;
    case 'penalty':
      return <MaterialCommunityIcons name="soccer" size={size} color={colors.win} />;
    case 'own-goal':
      return <MaterialCommunityIcons name="soccer" size={size} color={RED} />;
    case 'yellow':
      return <Card color={YELLOW} size={size} />;
    case 'red':
      return <Card color={RED} size={size} />;
    case 'second-yellow':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: 0 }}>
            <Card color={YELLOW} size={size} />
          </View>
          <View style={{ position: 'absolute', left: size * 0.3 }}>
            <Card color={RED} size={size} />
          </View>
        </View>
      );
    case 'sub':
      return <MaterialCommunityIcons name="swap-vertical" size={size} color={colors.primary} />;
    case 'sub-in':
      return <MaterialCommunityIcons name="arrow-up-bold" size={size} color={colors.win} />;
    case 'sub-out':
      return <MaterialCommunityIcons name="arrow-down-bold" size={size} color={RED} />;
    case 'whistle':
      return <MaterialCommunityIcons name="whistle" size={size} color={colors.textMuted} />;
  }
}

/** Small red dot used to mark live matches. */
export function LiveDot({ size = 8, color = colors.live }: { size?: number; color?: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}
