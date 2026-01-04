import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import * as Haptics from 'expo-haptics';
import { api, ServerTrack } from '../api/client';
import { TrackListItem } from '../components/TrackListItem';
import { usePlayerStore } from '../store/player';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { loadQueue, play } = usePlayerStore();
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Real-time search with debounce
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await api.search(query.trim());
        const items = (data?.tracks?.items || []).slice(0, 15);
        setSuggestions(items);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  function pickArtwork(imagesJson?: string | null): string | undefined {
    if (!imagesJson) return undefined;
    try {
      const arr = JSON.parse(imagesJson) as Array<{ url: string; width: number; height: number }>;
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      return arr?.[1]?.url || arr?.[0]?.url;
    } catch { return undefined; }
  }

  async function onTrackPress(t: any) {
    await Haptics.selectionAsync();
    if (t.preview_url) {
      const primaryArtist = t.artists?.[0]?.name || 'Unknown';
      const spotifyArtwork = t.album?.images?.[0]?.url as string | undefined;
      await loadQueue([{ id: t.id, title: t.name, artist: primaryArtist, uri: t.preview_url, artwork: spotifyArtwork }], 0);
      await play();
    } else {
      Alert.alert('Not Playable', 'No preview available for this track.');
    }
  }

  const hasSuggestions = query.trim().length > 0 && suggestions.length > 0;
  const showEmpty = query.trim().length > 0 && suggestions.length === 0 && !loading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Artists, songs, albums"
            placeholderTextColor="#888"
            style={styles.input}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions List */}
      <FlatList
        data={hasSuggestions ? suggestions : []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item: t }) => {
          const primaryArtist = t.artists?.[0]?.name || 'Unknown';
          const spotifyArtwork = t.album?.images?.[0]?.url as string | undefined;
          return (
            <TrackListItem
              key={t.id}
              track={{ id: t.id, title: t.name, artist: primaryArtist, uri: t.preview_url || '', artwork: spotifyArtwork }}
              customOnPress={() => onTrackPress(t)}
              disabled={!t.preview_url}
            />
          );
        }}
      />

      {/* Loading */}
      {loading && (
        <View style={styles.centerContent}>
          <Text style={styles.statusText}>Searching…</Text>
        </View>
      )}

      {/* Empty State */}
      {showEmpty && (
        <View style={styles.centerContent}>
          <Text style={styles.statusText}>No results found</Text>
        </View>
      )}

      {/* Default State: Browse All */}
      {!hasSuggestions && !loading && query.trim().length === 0 && (
        <ScrollView contentContainerStyle={styles.browseContent}>
          <Text style={styles.sectionTitle}>Browse All</Text>
          <View style={styles.browseGrid}>
            {[
              { name: '🎵 All Songs', color: '#FF6B6B' },
              { name: '🎤 Artists', color: '#4ECDC4' },
              { name: '💿 Albums', color: '#45B7D1' },
              { name: '🎼 Playlists', color: '#FFA07A' },
              { name: '🎙️ Podcasts', color: '#DDA0DD' },
              { name: '🎸 Rock', color: '#FF8C00' },
            ].map((item, idx) => (
              <View key={idx} style={[styles.browseCard, { backgroundColor: item.color }]}>
                <Text style={styles.browseText}>{item.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
  },
  header: { 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { 
    color: colors.text, 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 12 
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 16,
    color: '#888',
    marginLeft: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  statusText: {
    color: '#A7A7A7',
    fontSize: 14,
  },
  browseContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  browseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  browseCard: {
    width: '48%',
    paddingVertical: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browseText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
