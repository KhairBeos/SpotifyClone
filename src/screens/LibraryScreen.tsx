import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { colors } from '../theme/colors';
import { LibraryHeader } from '../components/headers/LibraryHeader';
import { useNavigation } from '@react-navigation/native';
import { api, ServerArtist, ServerAlbum } from '../api/client';

export default function LibraryScreen() {
  const nav = useNavigation();
  const [artists, setArtists] = useState<ServerArtist[] | null>(null);
  const [albums, setAlbums] = useState<ServerAlbum[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([api.getArtists(), api.getAlbums()])
      .then(([as, al]) => { if (mounted) { setArtists(as); setAlbums(al); } })
      .catch(() => { if (mounted) setArtists([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LibraryHeader />
      <View style={styles.filters}>
        {['Playlists', 'Artists', 'Albums', 'Downloaded'].map((t) => (
          <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
        ))}
      </View>
      {loading && <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />}
      {!loading && artists && artists.length === 0 && (
        <Text style={{ color: '#A7A7A7', marginTop: 12 }}>No artists yet. Ingest your music to populate.</Text>
      )}
      {!loading && artists && artists.map((a) => (
        <TouchableOpacity key={a.id} style={styles.row} onPress={() => nav.navigate('Artist' as never, { id: a.id, name: a.name, images: a.images } as never)}>
          {(() => { try { if (a.images) { const arr = JSON.parse(a.images) as Array<{url:string}>; return <Image source={{ uri: arr?.[1]?.url || arr?.[0]?.url }} style={styles.thumb} /> } } catch {} return <View style={styles.thumb} /> })()}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{a.name}</Text>
            <Text style={styles.rowSub}>Artist</Text>
          </View>
        </TouchableOpacity>
      ))}
      {!loading && albums && albums.length > 0 && (
        <>
          <Text style={[styles.rowTitle, { marginTop: 12, marginBottom: 8 }]}>Albums</Text>
          <View style={styles.albumsGrid}>
            {albums.map((al) => (
              <TouchableOpacity key={al.id} style={styles.albumTile} onPress={() => nav.navigate('Album' as never, { id: al.id } as never)}>
                {(() => { try { if (al.images) { const arr = JSON.parse(al.images) as Array<{url:string}>; return <Image source={{ uri: arr?.[0]?.url || arr?.[1]?.url }} style={styles.albumImg} /> } } catch {} return <View style={styles.albumImg} /> })()}
                <Text style={styles.albumTitle} numberOfLines={1}>{al.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  filters: { flexDirection: 'row', marginBottom: 12 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  chipText: { color: colors.text, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  thumb: { width: 56, height: 56, backgroundColor: colors.surface, borderRadius: 4, marginRight: 12 },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowSub: { color: '#A7A7A7', marginTop: 2, fontSize: 12 },
});
