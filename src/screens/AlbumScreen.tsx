import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Image, FlatListProps } from 'react-native';
import { colors } from '../theme/colors';
import { TrackListItem } from '../components/TrackListItem';
import { BlurView } from 'expo-blur';
import { useRoute } from '@react-navigation/native';
import { api, ServerAlbum, ServerTrack } from '../api/client';
import { Track } from '../store/player';

export default function AlbumScreen() {
  const route = useRoute<any>();
  const { id: albumId } = route.params || {};
  const [album, setAlbum] = useState<ServerAlbum | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
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
        const mapped: Track[] = tr.map((t) => ({ id: t.id, title: t.title, artist: alb.artist?.name || 'Unknown Artist', uri: api.streamUrl(t.id) }));
        setTracks(mapped);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [albumId]);

  const albumTitle = album?.name || 'Album';

  const AnimatedFlatList = useMemo(() => {
    return Animated.createAnimatedComponent(FlatList) as React.ComponentType<FlatListProps<Track>>;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.topBar, { opacity }]}> 
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.topTitle}>{albumTitle}</Text>
      </Animated.View>
      <AnimatedFlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: { item: Track }) => <TrackListItem track={item} />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          {album?.images ? (
            (() => { try { const arr = JSON.parse(album.images) as Array<{url:string;width:number;height:number}>; return <Image source={{ uri: arr?.[0]?.url || arr?.[1]?.url }} style={styles.cover} /> } catch { return <View style={styles.cover} /> } })()
          ) : (
            <View style={styles.cover} />
          )}
          <Text style={styles.title}>{albumTitle}</Text>
          <Text style={styles.sub}>{album?.artist?.name || 'Artist'}</Text>
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
  cover: { width: 200, height: 200, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: '#A7A7A7', marginTop: 4 },
});
