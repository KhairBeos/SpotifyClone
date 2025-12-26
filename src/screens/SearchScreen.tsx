import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { SearchHeader } from '../components/headers/SearchHeader';
import * as Haptics from 'expo-haptics';
import { api, ServerTrack } from '../api/client';
import { TrackListItem } from '../components/TrackListItem';
import { usePlayerStore } from '../store/player';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { loadQueue, play } = usePlayerStore();
  const [localRecent, setLocalRecent] = useState<ServerTrack[]>([]);

  useEffect(() => {
    api.getRecentTracks(200).then(setLocalRecent).catch(() => {});
  }, []);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.search(query.trim());
      const items = (data?.tracks?.items || []).slice(0, 20);
      setResults(items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SearchHeader />
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Songs, artists, albums"
            placeholderTextColor="#999"
            style={styles.input}
            onSubmitEditing={runSearch}
          />
          <TouchableOpacity onPress={runSearch} style={styles.searchBtn}><Text style={{ color: colors.background }}>Go</Text></TouchableOpacity>
        </View>
        {loading && <Text style={{ color: '#A7A7A7' }}>Searching…</Text>}
      </View>
      <View style={styles.rowBetween}>
        {['Music', 'Podcasts', 'Audiobooks'].map((t) => (
          <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
        ))}
      </View>
      <Text style={styles.sectionTitle}>Recent searches</Text>
      {[1,2,3].map((i) => (
        <View key={i} style={styles.recentRow}>
          <View style={styles.recentThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.recentTitle}>Recent {i}</Text>
            <Text style={styles.recentSub}>Artist • Song</Text>
          </View>
        </View>
      ))}
      {results.map((t) => {
        const primaryArtist = t.artists?.[0]?.name || 'Unknown';
        const preview = t.preview_url as string | null;
        const spotifyArtwork = t.album?.images?.[0]?.url as string | undefined;
        function norm(s?: string) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
        function pickArtwork(imagesJson?: string | null): string | undefined {
          if (!imagesJson) return undefined;
          try {
            const arr = JSON.parse(imagesJson) as Array<{ url: string; width: number; height: number }>;
            if (!Array.isArray(arr) || arr.length === 0) return undefined;
            return (arr.sort((a,b)=> (a.width||0)-(b.width||0))[Math.min(1, arr.length-1)]?.url) || arr[0].url;
          } catch { return undefined; }
        }

        let trackForPlay: { id: string; title: string; artist: string; uri: string; artwork?: string } | null = null;
        if (preview) {
          trackForPlay = { id: `sp_${t.id}`, title: t.name, artist: primaryArtist, uri: preview, artwork: spotifyArtwork };
        } else {
          const local = localRecent.find(r => norm(r.title) === norm(t.name) && norm(r.artist?.name) === norm(primaryArtist));
          if (local) {
            trackForPlay = { id: local.id, title: local.title, artist: local.artist?.name || 'Unknown', uri: api.streamUrl(local.id), artwork: pickArtwork(local.album?.images) };
          }
        }

        const onPress = trackForPlay
          ? async () => { await loadQueue([trackForPlay!], 0); await play(); }
          : () => { Alert.alert('Not Playable', 'No preview available and not found in your library.'); };

        return (
          <TrackListItem
            key={t.id}
            track={{ id: trackForPlay?.id || `sp_${t.id}`, title: t.name, artist: primaryArtist, uri: trackForPlay?.uri || '', artwork: trackForPlay?.artwork || spotifyArtwork }}
            customOnPress={onPress}
            disabled={!trackForPlay}
          />
        );
      })}
      <View style={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={[styles.tile, { backgroundColor: i % 2 === 0 ? '#1E3264' : '#1E6A5B' }]} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 16 },
  searchRow: { flexDirection: 'row' },
  input: { flex: 1, height: 40, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, color: colors.text, marginRight: 8 },
  searchBtn: { height: 40, backgroundColor: colors.text, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', height: 100, borderRadius: 8, marginBottom: 12, marginHorizontal: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  chipText: { color: colors.text, fontSize: 12 },
  sectionTitle: { color: colors.text, fontWeight: '700', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  recentThumb: { width: 48, height: 48, backgroundColor: colors.surface, borderRadius: 4, marginRight: 12 },
  recentTitle: { color: colors.text, fontWeight: '600' },
  recentSub: { color: '#A7A7A7', fontSize: 12, marginTop: 2 },
});
