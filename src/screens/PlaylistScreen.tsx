import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, FlatListProps } from 'react-native';
import { colors } from '../theme/colors';
import { TrackListItem } from '../components/TrackListItem';
import { BlurView } from 'expo-blur';
import { api, ServerTrack } from '../api/client';
import { Track, usePlayerStore } from '../store/player';
import { useRoute } from '@react-navigation/native';
import { useLibraryStore } from '../store/library';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<FlatListProps<Track>>;

export default function PlaylistScreen() {
  const route = useRoute<any>();
  const { id, name, type } = route.params || {};
  const { favorites, playlists, hydrate, getPlaylist } = useLibraryStore();
  const { loadQueue, play } = usePlayerStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacity = scrollY.interpolate({ inputRange: [0, 80, 140], outputRange: [0, 0.5, 1], extrapolate: 'clamp' });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handlePlayTrack = async (index: number) => {
    await Haptics.selectionAsync();
    await loadQueue(tracks, index);
    await play();
  };

  useEffect(() => {
    let mounted = true;
    if (type === 'favorites') {
      const arr = Object.values(favorites);
      if (mounted) setTracks(arr);
      return () => { mounted = false; };
    }

    if (id) {
      const pl = getPlaylist(id);
      if (pl && mounted) setTracks(pl.tracks);
      return () => { mounted = false; };
    }

    api.getRecentTracks(200)
      .then((items: ServerTrack[]) => {
        if (!mounted) return;
        const mapped: Track[] = items.map((t) => {
          let artwork: string | undefined;
          try {
            if (t.album?.images) {
              const arr = JSON.parse(t.album.images) as Array<{url:string;width:number;height:number}>;
              artwork = arr?.[1]?.url || arr?.[0]?.url;
            }
          } catch {}
          return { id: t.id, title: t.title, artist: t.artist?.name || 'Unknown Artist', uri: api.streamUrl(t.id), artwork: artwork || api.artworkUrl(t.id) };
        });
        setTracks(mapped);
      });
    return () => { mounted = false; };
  }, [type, id, favorites, playlists]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.topBar, { opacity }]}> 
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.topTitle}>{type === 'favorites' ? 'Liked Songs' : name || 'Playlist'}</Text>
      </Animated.View>
      <AnimatedFlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => <TrackListItem track={item as any} customOnPress={() => handlePlayTrack(index)} />}
      ListHeaderComponent={() => (
        <View style={[styles.header, { paddingTop: 32 + (insets.top || 0) }]}>
          <View style={[styles.coverRound, { backgroundColor: type === 'favorites' ? '#1DB954' : '#4ECDC4' }] }>
            <Ionicons name={type === 'favorites' ? 'heart' : 'musical-notes'} size={56} color={colors.text} />
          </View>
          <Text style={styles.title}>{type === 'favorites' ? 'Liked Songs' : name || 'Playlist'}</Text>
          <Text style={styles.sub}>{tracks.length} songs</Text>
        </View>
      )}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 180 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, zIndex: 10 },
  topTitle: { color: colors.text, fontWeight: '800' },
  coverRound: { width: 200, height: 200, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: '#A7A7A7', marginTop: 4 },
});
