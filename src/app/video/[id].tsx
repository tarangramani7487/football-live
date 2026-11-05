import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getVideo, type VideoClip } from '@/api/espn';
import { useFetch } from '@/hooks/useFetch';
import { timeAgo } from '@/components/NewsCard';
import { ErrorView, Loading } from '@/components/States';
import { colors } from '@/constants/theme';

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, retry } = useFetch(() => getVideo(id), [id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'Video not available'} onRetry={retry} />;
  return <Player clip={data} />;
}

function Player({ clip }: { clip: VideoClip }) {
  const player = useVideoPlayer(clip.url, (p) => p.play());
  const mins = clip.duration ? `${Math.floor(clip.duration / 60)}:${String(clip.duration % 60).padStart(2, '0')}` : undefined;

  return (
    <ScrollView style={{ backgroundColor: colors.card }}>
      <View style={styles.videoWrap}>
        <VideoView style={styles.video} player={player} fullscreenOptions={{ enable: true }} allowsPictureInPicture nativeControls />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{clip.title}</Text>
        <Text style={styles.meta}>{['ESPN', mins, timeAgo(clip.published)].filter(Boolean).join(' • ')}</Text>
        {!!clip.description && clip.description !== clip.title && <Text style={styles.desc}>{clip.description}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  videoWrap: { backgroundColor: '#000' },
  video: { width: '100%', aspectRatio: 16 / 9 },
  body: { padding: 16 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text, lineHeight: 25 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  desc: { fontSize: 15, color: colors.text, marginTop: 12, lineHeight: 22 },
});
