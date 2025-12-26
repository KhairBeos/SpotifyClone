import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { usePlayerStore } from '../store/player';
import { TrackListItem } from '../components/TrackListItem';
import { api, ServerTrack } from '../api/client';

export default function HomeScreen() {
  const { queue } = usePlayerStore();
  const [recent, setRecent] = useState<ServerTrack[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getRecentTracks(12)
      .then((items) => setRecent(items))
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Recently added</Text>
      {loading && <ActivityIndicator color={colors.text} style={{ marginBottom: 12 }} />}
      {!loading && recent && recent.map((t) => {
        let artwork: string | undefined;
        try {
          if (t.album?.images) {
            const arr = JSON.parse(t.album.images) as Array<{url:string;width:number;height:number}>;
            artwork = arr?.[1]?.url || arr?.[0]?.url;
          }
        } catch {}
        return (
          <TrackListItem key={t.id} track={{ id: t.id, title: t.title, artist: t.artist?.name || 'Unknown Artist', uri: api.streamUrl(t.id), artwork }} />
        );
      })}

      <Text style={[styles.subtitle, { marginTop: 16 }]}>Made For You</Text>
      <View style={styles.card} />
      <View style={styles.card} />
      <View style={styles.card} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 12 },
  subtitle: { color: '#A7A7A7', fontSize: 16, marginBottom: 8 },
  card: { height: 120, backgroundColor: colors.surface, borderRadius: 8, marginBottom: 12 },
});
