import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { api, ServerArtist } from '../api/client';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';

export default function ArtistsScreen() {
  const [artists, setArtists] = useState<ServerArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigation<any>();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getArtists()
      .then((list) => { if (mounted) setArtists(list); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function pickImage(images?: any) {
    if (!images) return undefined;
    try {
      if (typeof images === 'string') images = JSON.parse(images);
      if (!Array.isArray(images) || images.length === 0) return undefined;
      return images[1]?.url || images[0]?.url;
    } catch { return undefined; }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={artists}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => nav.navigate('Artist', { id: item.id, name: item.name, images: item.images })}>
            <Image source={{ uri: pickImage(item.images) }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => <View style={{ padding: 20 }}><Text style={{ color: '#A7A7A7' }}>{loading ? 'Loading…' : 'No artists'}</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, marginRight: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
