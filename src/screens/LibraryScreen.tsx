import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { api, ServerArtist, ServerAlbum } from '../api/client';
import { useLibraryStore } from '../store/library';
import * as Haptics from 'expo-haptics';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [artists, setArtists] = useState<ServerArtist[] | null>(null);
  const [albums, setAlbums] = useState<ServerAlbum[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [artistFallbackArt, setArtistFallbackArt] = useState<Record<string, string>>({});
  const { favorites, playlists, hydrate, ensureDefaultPlaylist } = useLibraryStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([api.getArtists(), api.getAlbums()])
      .then(([as, al]) => {
        if (mounted) {
          setArtists(as);
          setAlbums(al);
        }
      })
      .catch(() => {
        if (mounted) {
          setArtists([] as ServerArtist[]);
          setAlbums([] as ServerAlbum[]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function parseArtwork(imagesJson?: string | Array<{ url: string }> | null): string | undefined {
    if (!imagesJson) return undefined;
    try {
      const arr = Array.isArray(imagesJson) ? imagesJson : (JSON.parse(imagesJson) as Array<{ url: string }>);
      return arr?.[1]?.url || arr?.[0]?.url;
    } catch {
      return undefined;
    }
  }

  useEffect(() => {
    if (!artists || artists.length === 0) return;
    let cancelled = false;
    const targets = artists.slice(0, 6).filter((a) => !parseArtwork(a.images));
    if (targets.length === 0) return;

    (async () => {
      const results = await Promise.all(
        targets.map(async (a) => {
          try {
            // Prefer artist images from detail endpoint (will include Spotify images if available)
            const detail = await api.getArtist(a.id);
            const artFromDetail = parseArtwork(detail.images as any);
            if (artFromDetail) return { id: a.id, art: artFromDetail };

            // Secondary fallback: use first track's cover if artist images truly missing
            const tracks = await api.getArtistTracks(a.id);
            const first = tracks?.[0];
            if (!first) return { id: a.id, art: undefined };
            const parsed = parseArtwork(first.album?.images);
            return { id: a.id, art: parsed || api.artworkUrl(first.id) };
          } catch {
            return { id: a.id, art: undefined };
          }
        })
      );
      if (cancelled) return;
      const updates: Record<string, string> = {};
      results.forEach(({ id, art }) => {
        if (art) updates[id] = art;
      });
      if (Object.keys(updates).length) {
        setArtistFallbackArt((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artists]);

  const handleArtistPress = (artist: ServerArtist) => {
    Haptics.selectionAsync();
    nav.navigate('Artist' as never, { id: artist.id, name: artist.name, images: artist.images } as never);
  };

  const handleAlbumPress = (album: ServerAlbum) => {
    Haptics.selectionAsync();
    nav.navigate('Album' as never, { id: album.id } as never);
  };

  const handleFavoritesPress = () => {
    Haptics.selectionAsync();
    nav.navigate('Playlist' as never, { id: 'liked', type: 'favorites', name: 'Liked Songs' } as never);
  };

  const handleMyPlaylistPress = async () => {
    Haptics.selectionAsync();
    const pid = await ensureDefaultPlaylist();
    nav.navigate('Playlist' as never, { id: pid, type: 'playlist', name: 'My Playlist' } as never);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

      {!loading && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Artists Section */}
          {artists && artists.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Artists</Text>
              <View style={styles.artistsGrid}>
                {artists.slice(0, 6).map((a) => {
                  const art = parseArtwork(a.images) || artistFallbackArt[a.id];
                  const initial = a.name?.[0]?.toUpperCase() || '';
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={styles.artistCard}
                      onPress={() => handleArtistPress(a)}
                      activeOpacity={0.7}
                    >
                      {art ? (
                        <Image source={{ uri: art }} style={styles.artistImage} />
                      ) : (
                        <View style={styles.artistPlaceholder}>
                          <Text style={styles.placeholderText}>{initial}</Text>
                        </View>
                      )}
                      <Text style={styles.artistName} numberOfLines={2}>
                        {a.name}
                      </Text>
                      <Text style={styles.cardLabel}>Artist</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Albums Section */}
          {albums && albums.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Albums</Text>
              <View style={styles.albumsGrid}>
                {albums.slice(0, 8).map((al) => (
                  <TouchableOpacity
                    key={al.id}
                    style={styles.albumCard}
                    onPress={() => handleAlbumPress(al)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: parseArtwork(al.images) || 'https://via.placeholder.com/140' }}
                      style={styles.albumImage}
                    />
                    <Text style={styles.albumName} numberOfLines={2}>
                      {al.name}
                    </Text>
                    <Text style={styles.cardLabel}>Album</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Playlists Section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Playlists</Text>
          <View style={styles.playlistsRow}>
            <TouchableOpacity style={styles.playlistCard} onPress={handleFavoritesPress} activeOpacity={0.8}>
              <View style={[styles.playlistThumb, { backgroundColor: '#1DB954' }]}>
                <Text style={styles.playlistEmoji}>❤</Text>
              </View>
              <Text style={styles.playlistName}>Liked Songs</Text>
              <Text style={styles.cardLabel}>{Object.keys(favorites).length} tracks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playlistCard} onPress={handleMyPlaylistPress} activeOpacity={0.8}>
              <View style={[styles.playlistThumb, { backgroundColor: '#4ECDC4' }]}>
                <Text style={styles.playlistEmoji}>🎵</Text>
              </View>
              <Text style={styles.playlistName}>My Playlist</Text>
              <Text style={styles.cardLabel}>
                {playlists.find((p) => p.id === 'default-playlist')?.tracks.length || 0} tracks
              </Text>
            </TouchableOpacity>
          </View>

          {!loading && (!artists || artists.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No artists yet</Text>
              <Text style={styles.emptySubtext}>Browse songs to add to your library</Text>
            </View>
          )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  artistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  artistCard: {
    width: '32%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  artistImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 6,
  },
  artistPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 24,
  },
  artistName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  albumCard: {
    width: '23.5%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  albumName: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardLabel: {
    color: '#A7A7A7',
    fontSize: 9,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#A7A7A7',
    fontSize: 12,
    marginTop: 4,
  },
  playlistsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  playlistCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
  },
  playlistThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playlistEmoji: {
    fontSize: 20,
    color: colors.text,
  },
  playlistName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
