import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Image } from 'react-native';
import { colors } from '../theme/colors';
import { TrackListItem } from '../components/TrackListItem';
import { BlurView } from 'expo-blur';
import { useRoute } from '@react-navigation/native';
import { api, ServerTrack } from '../api/client';
import { Track } from '../store/player';

export default function ArtistScreen() {
  const route = useRoute<any>();
  const { id: artistId, name: artistName, images } = route.params || {};
  const [artistImage, setArtistImage] = useState<string | undefined>(undefined);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacity = scrollY.interpolate({ inputRange: [0, 80, 140], outputRange: [0, 0.5, 1], extrapolate: 'clamp' });

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
        const mapped: Track[] = items.map((t) => ({ id: t.id, title: t.title, artist: artistName || 'Unknown Artist', uri: api.streamUrl(t.id), artwork: pickArtwork(t.album?.images) }));
        setTracks(mapped);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [artistId]);

  useEffect(() => {
    function pick(imagesJson?: string | null) {
      if (!imagesJson) return undefined;
      try {
        const arr = JSON.parse(imagesJson) as Array<{ url: string; width: number; height: number }>;
        return arr?.[1]?.url || arr?.[0]?.url;
      } catch { return undefined; }
    }
    const fromParam = pick(images);
    if (fromParam) setArtistImage(fromParam);
    else if (artistId) {
      api.getArtist(artistId).then((a) => setArtistImage(pick(a.images))).catch(() => {});
    }
  }, [artistId, images]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.topBar, { opacity }]}> 
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.topTitle}>{artistName || 'Artist'}</Text>
      </Animated.View>
      <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TrackListItem track={item as any} />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          {artistImage ? <Image source={{ uri: artistImage }} style={styles.avatar} /> : <View style={styles.avatar} />}
          <Text style={styles.title}>{artistName || 'Artist'}</Text>
          <Text style={styles.sub}>{loading ? 'Loading tracks…' : `${tracks.length} tracks`}</Text>
        </View>
      )}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
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
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: '#A7A7A7', marginTop: 4 },
});
