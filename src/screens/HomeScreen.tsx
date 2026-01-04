import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { usePlayerStore } from '../store/player';
import { TrackListItem } from '../components/TrackListItem';
import { api, ServerTrack } from '../api/client';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { loadQueue, play } = usePlayerStore();
  const [recent, setRecent] = useState<ServerTrack[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getRecentTracks(12)
      .then((items) => setRecent(items))
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePlayTrack = async (track: ServerTrack, startIndex: number) => {
    await Haptics.selectionAsync();
    const queue = (recent || []).map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist?.name || 'Unknown Artist',
      uri: api.streamUrl(t.id),
      artwork: pickArtworkOrFallback(t),
    }));
    await loadQueue(queue, startIndex);
    await play();
  };

  function tryParseArtwork(imagesJson?: string | null): string | undefined {
    if (!imagesJson) return undefined;
    try {
      const arr = JSON.parse(imagesJson) as Array<{url:string;width:number;height:number}>;
      return arr?.[1]?.url || arr?.[0]?.url;
    } catch { return undefined; }
  }

  function pickArtworkOrFallback(t: ServerTrack) {
    return tryParseArtwork(t.album?.images) || api.artworkUrl(t.id);
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Good to see you</Text>
      
      <Text style={styles.sectionTitle}>Recently Played</Text>
      {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}
      {!loading && recent && recent.length > 0 && (
        <FlatList
          data={recent}
          scrollEnabled={false}
          renderItem={({ item: t, index }) => {
            const artwork = tryParseArtwork(t.album?.images);
            return (
              <TrackListItem 
                key={t.id}
                track={{ 
                  id: t.id, 
                  title: t.title, 
                  artist: t.artist?.name || 'Unknown Artist', 
                  uri: api.streamUrl(t.id), 
                  artwork: artwork || api.artworkUrl(t.id),
                }}
                customOnPress={() => handlePlayTrack(t, index)}
              />
            );
          }}
          keyExtractor={(item) => item.id}
        />
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Made For You</Text>
      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: '#FF6B6B' }]}>
          <Text style={styles.cardText}>Discover Weekly</Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#4ECDC4' }]}>
          <Text style={styles.cardText}>Release Radar</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: '#45B7D1' }]}>
          <Text style={styles.cardText}>New Music Daily</Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#FFA07A' }]}>
          <Text style={styles.cardText}>Top Hits</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Featured Playlists</Text>
      <View style={styles.playlistCard}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>🎵 All Genres</Text>
      </View>
      <View style={styles.playlistCard}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>🎼 Trending Now</Text>
      </View>
    </ScrollView>
  );

}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  content: { 
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 120,
  },
  title: { 
    color: colors.text, 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 20 
  },
  sectionTitle: { 
    color: colors.text, 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 10,
    marginTop: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  card: { 
    flex: 1,
    height: 100,
    backgroundColor: colors.surface, 
    borderRadius: 8, 
    justifyContent: 'flex-end',
    padding: 12,
  },
  cardText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  playlistCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
});
