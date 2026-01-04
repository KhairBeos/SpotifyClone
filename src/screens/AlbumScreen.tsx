import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Image, FlatListProps } from 'react-native';
import { colors } from '../theme/colors';
import { TrackListItem } from '../components/TrackListItem';
import { BlurView } from 'expo-blur';
import { useRoute } from '@react-navigation/native';
import { api, ServerAlbum, ServerTrack } from '../api/client';
import { Track, usePlayerStore } from '../store/player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AlbumScreen() {
  const route = useRoute<any>();
  const { id: albumId } = route.params || {};
  const { loadQueue, play } = usePlayerStore();
  const [album, setAlbum] = useState<ServerAlbum | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacity = scrollY.interpolate({ inputRange: [0, 80, 140], outputRange: [0, 0.5, 1], extrapolate: 'clamp' });

  useEffect(() => {
    let mounted = true;
    if (!albumId) return;
    (async () => {
      try {
        const alb = await api.getAlbum(albumId);
        const tr = await api.getAlbumTracks(albumId);
        if (!mounted) return;
        setAlbum(alb);
        const mapped: Track[] = tr.map((t) => ({ id: t.id, title: t.title, artist: alb.artist?.name || 'Unknown Artist', uri: api.streamUrl(t.id), artwork: pickArtwork(alb?.images) || api.artworkUrl(t.id) }));
        setTracks(mapped);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [albumId]);

  const albumTitle = album?.name || 'Album';

  function pickArtwork(imagesJson?: string | null) {
    if (!imagesJson) return undefined;
    try {
      const arr = JSON.parse(imagesJson) as Array<{url:string;width?:number;height?:number}>;
      if (!arr || arr.length === 0) return undefined;
      return arr[0]?.url || arr[1]?.url;
    } catch {
      return undefined;
    }
  }

  const AnimatedFlatList = useMemo(() => {
    return Animated.createAnimatedComponent(FlatList) as React.ComponentType<FlatListProps<Track>>;
  }, []);

  const handlePlayAt = async (idx: number) => {
    await loadQueue(tracks, idx);
    await play();
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.topBar, { opacity, paddingTop: insets.top, height: 56 + insets.top }]}> 
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.topTitle}>{albumTitle}</Text>
      </Animated.View>
      <AnimatedFlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }: { item: Track; index: number }) => (
        <TrackListItem track={item} customOnPress={() => handlePlayAt(index)} />
      )}
      ListHeaderComponent={() => (
        <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
          {album?.images ? (
            (() => { 
              try { 
                const arr = JSON.parse(album.images) as Array<{url:string;width:number;height:number}>; 
                const uri = arr?.[0]?.url || arr?.[1]?.url;
                const fallback = tracks[0]?.id ? api.artworkUrl(tracks[0].id) : undefined;
                return uri ? <Image source={{ uri }} style={styles.cover} /> : (fallback ? <Image source={{ uri: fallback }} style={styles.cover} /> : <View style={styles.cover} />); 
              } catch { 
                const fallback = tracks[0]?.id ? api.artworkUrl(tracks[0].id) : undefined;
                return fallback ? <Image source={{ uri: fallback }} style={styles.cover} /> : <View style={styles.cover} />; 
              } 
            })()
          ) : (
            (() => {
              const fallback = tracks[0]?.id ? api.artworkUrl(tracks[0].id) : undefined;
              return fallback ? <Image source={{ uri: fallback }} style={styles.cover} /> : <View style={styles.cover} />;
            })()
          )}
          <Text style={styles.title}>{albumTitle}</Text>
          <Text style={styles.sub}>{album?.artist?.name || 'Artist'}</Text>
        </View>
      )}
      ListFooterComponent={() => <View style={{ height: 140 }} />}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, zIndex: 10 },
  topTitle: { color: colors.text, fontWeight: '800' },
  cover: { width: 200, height: 200, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: '#A7A7A7', marginTop: 4 },
});
