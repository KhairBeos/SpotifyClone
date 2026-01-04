import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, FlatListProps } from 'react-native';
import { colors } from '../theme/colors';
import { TrackListItem } from '../components/TrackListItem';
import { BlurView } from 'expo-blur';
import { useRoute } from '@react-navigation/native';
import { api, ServerTrack } from '../api/client';
import { Track, usePlayerStore } from '../store/player';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<FlatListProps<Track>>;

export default function ArtistScreen() {
  const route = useRoute<any>();
  const { id: artistId, name: artistName, images } = route.params || {};
  const insets = useSafeAreaInsets();
  const { loadQueue, play } = usePlayerStore();
  const [artistImage, setArtistImage] = useState<string | undefined>(undefined);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const opacityStyle = useAnimatedStyle(() => {
    const opacity = Math.min(1, Math.max(0, scrollY.value / 140)) * 0.5;
    return { opacity };
  });

  function pickArtwork(imagesJson?: string | null): string | undefined {
    if (!imagesJson) return undefined;
    try {
      const arr = JSON.parse(imagesJson) as Array<{ url: string; width: number; height: number }>;
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      // pick medium or first
      return (arr.sort((a,b)=> (a.width||0)-(b.width||0))[Math.min(1, arr.length-1)]?.url) || arr[0].url;
    } catch { return undefined; }
  }

  useEffect(() => {
    let mounted = true;
    if (!artistId) return;
    setLoading(true);
    api.getArtistTracks(artistId)
      .then((items: ServerTrack[]) => {
        if (!mounted) return;
        const mapped: Track[] = items.map((t) => ({ id: t.id, title: t.title, artist: artistName || 'Unknown Artist', uri: api.streamUrl(t.id), artwork: pickArtwork(t.album?.images) || api.artworkUrl(t.id) }));
        setTracks(mapped);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [artistId, artistName]);

  const handlePlayAt = async (idx: number) => {
    await loadQueue(tracks, idx);
    await play();
  };

  useEffect(() => {
    function pick(img?: string | Array<{ url: string; width?: number; height?: number }> | null) {
      if (!img) return undefined;
      let arr: Array<{ url: string; width?: number; height?: number }> | undefined;
      if (typeof img === 'string') {
        try { arr = JSON.parse(img); } catch { return undefined; }
      } else if (Array.isArray(img)) {
        arr = img;
      }
      if (!arr || arr.length === 0) return undefined;
      const sorted = [...arr].sort((a, b) => (a.width || 0) - (b.width || 0));
      const candidate = sorted[Math.min(1, sorted.length - 1)]?.url || sorted[0]?.url;
      return candidate;
    }

    const fromParam = pick(images);
    if (fromParam) {
      setArtistImage(fromParam);
      return;
    }

    let cancelled = false;
    if (artistId) {
      api.getArtist(artistId)
        .then((a) => {
          if (cancelled) return;
          const picked = pick(a.images as any);
          if (picked) setArtistImage(picked);
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [artistId, images]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.topBar, opacityStyle]}> 
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.topTitle}>{artistName || 'Artist'}</Text>
      </Animated.View>
      <AnimatedFlatList
      style={styles.container}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }: { item: Track; index: number }) => (
        <TrackListItem track={item} customOnPress={() => handlePlayAt(index)} />
      )}
      ListHeaderComponent={() => (
        <View style={[styles.header, { paddingTop: 16 + (insets.top || 0) }]}> 
          {artistImage ? (
            <Image source={{ uri: artistImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{artistName?.[0]?.toUpperCase() || 'A'}</Text>
            </View>
          )}
          <Text style={styles.title}>{artistName || 'Artist'}</Text>
          <Text style={styles.sub}>{loading ? 'Loading tracks…' : `${tracks.length} tracks`}</Text>
        </View>
      )}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, zIndex: 10 },
  topTitle: { color: colors.text, fontWeight: '800' },
  avatar: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.surface, marginBottom: 12 },
  avatarPlaceholder: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#1f1f1f', marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: 48, fontWeight: '800' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: '#A7A7A7', marginTop: 4 },
});
