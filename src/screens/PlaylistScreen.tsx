import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { TrackListItem } from '../components/TrackListItem';
import { BlurView } from 'expo-blur';
import { api, ServerTrack } from '../api/client';
import { Track } from '../store/player';

export default function PlaylistScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacity = scrollY.interpolate({ inputRange: [0, 80, 140], outputRange: [0, 0.5, 1], extrapolate: 'clamp' });

  useEffect(() => {
    let mounted = true;
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
          return { id: t.id, title: t.title, artist: t.artist?.name || 'Unknown Artist', uri: api.streamUrl(t.id), artwork };
        });
        setTracks(mapped);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.topBar, { opacity }]}> 
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.topTitle}>All Songs</Text>
      </Animated.View>
      <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TrackListItem track={item as any} />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <View style={styles.coverRound} />
          <Text style={styles.title}>All Songs</Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, zIndex: 10 },
  topTitle: { color: colors.text, fontWeight: '800' },
  coverRound: { width: 160, height: 160, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: '#A7A7A7', marginTop: 4 },
});
