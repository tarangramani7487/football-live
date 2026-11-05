// Privacy policy. On web this is served at /privacy (the URL to give the App Store / Play Console);
// in the app it opens as a normal screen via router.push('/privacy').
import { Stack } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

const APP_NAME = 'Football Live';
const CONTACT_EMAIL = 'tarangramani7487@gmail.com';
const LAST_UPDATED = 'November 4, 2026';

type Section = { title: string; body: (string | string[])[] };

const SECTIONS: Section[] = [
  {
    title: 'Overview',
    body: [
      `${APP_NAME} ("the app", "we", "us") shows football scores, fixtures, standings, news and videos. This policy explains what information the app uses and why. We do not require an account, and we do not ask for your name, email address, phone number, contacts, photos or precise location.`,
    ],
  },
  {
    title: 'Information stored on your device',
    body: [
      'Matches you follow for alerts (teams, kickoff time and last known score) are saved only on your device so the app can notify you about goals and results. This data is never uploaded to us, and it is removed when you unfollow a match, a couple of days after the match ends, or when you delete the app.',
    ],
  },
  {
    title: 'Information collected automatically',
    body: [
      'The mobile app uses Google Firebase services, which collect limited technical data:',
      [
        'Firebase Analytics: which screens are opened (for example "matches" or "league"), app version, device model, operating system, language, approximate country derived from IP address, and an app-instance identifier. We use this only to understand how the app is used and to improve it.',
        'Firebase Cloud Messaging: a push token that identifies your device installation, so we can send you match alerts and announcements.',
        'Firebase Remote Config: your app version, so we can tell you when an update is available.',
      ],
      'This data is processed by Google under the Firebase terms and Google Privacy Policy (https://policies.google.com/privacy). It is not used to identify you personally, and we do not sell it or use it for targeted advertising.',
    ],
  },
  {
    title: 'Notifications',
    body: [
      'The app asks for permission before sending notifications. You can turn notifications off at any time in your device settings. Background refresh is used only to check the scores of matches you follow.',
    ],
  },
  {
    title: 'Third-party content',
    body: [
      'Scores, news, videos and other content are loaded from public sources such as ESPN, news publishers\' RSS feeds, Wikipedia and Open-Meteo (match-day weather for the stadium\'s city). When the app requests this content, those services receive standard technical information such as your IP address. Opening an article or video may take you to the publisher\'s own website, which has its own privacy policy.',
    ],
  },
  {
    title: 'Children',
    body: [
      'The app is not directed at children under 13, and we do not knowingly collect personal information from children.',
    ],
  },
  {
    title: 'Data retention and your choices',
    body: [
      [
        'Disable notifications in your device settings to stop push messages.',
        'Delete the app to remove all locally stored data and its push token.',
        'Firebase Analytics data is kept for the period configured in Firebase (up to 14 months) and then deleted automatically.',
      ],
      `To ask about or request deletion of any data associated with your device, contact us at ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Security',
    body: ['All network requests made by the app use encrypted HTTPS connections.'],
  },
  {
    title: 'Changes to this policy',
    body: ['We may update this policy from time to time. Changes are posted on this page with a new "Last updated" date.'],
  },
  {
    title: 'Contact',
    body: [`Questions about this policy? Email ${CONTACT_EMAIL}.`],
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.h1} role="heading" aria-level={1}>
            Privacy Policy
          </Text>
          <Text style={styles.meta}>
            {APP_NAME} · Last updated {LAST_UPDATED}
          </Text>

          {SECTIONS.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.h2} role="heading" aria-level={2}>
                {s.title}
              </Text>
              {s.body.map((part, i) =>
                Array.isArray(part) ? (
                  <View key={i} style={styles.list}>
                    {part.map((item) => (
                      <View key={item} style={styles.listItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={[styles.p, styles.listText]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text key={i} style={styles.p}>
                    {part}
                  </Text>
                ),
              )}
            </View>
          ))}

          <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
            {CONTACT_EMAIL}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  h1: { fontSize: 28, fontWeight: '800', color: colors.primary },
  meta: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  section: { marginTop: 24 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 23, color: colors.text, marginBottom: 8 },
  list: { marginBottom: 8 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 15, lineHeight: 23, color: colors.accent, fontWeight: '800' },
  listText: { flex: 1 },
  link: { marginTop: 16, fontSize: 15, fontWeight: '700', color: colors.accent },
});
