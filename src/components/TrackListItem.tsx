import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';
import { Track, usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ActionSheet } from './ActionSheet';
import * as Haptics from 'expo-haptics';

type Props = {
  track: Track;
  index?: number;
  onPress?: () => void;
  customOnPress?: () => void | Promise<void>;
  disabled?: boolean;
};

export function TrackListItem({ track, index, onPress, customOnPress, disabled }: Props) {
  const { loadQueue, play } = usePlayerStore();
  const { toggleFavorite, isFavorite, ensureDefaultPlaylist, addToPlaylist, removeFromPlaylist, getPlaylist } =
    useLibraryStore();
  const [sheetVisible, setSheetVisible] = useState(false);
  const scale = useSharedValue(1);

  const handlePress = async () => {
    Haptics.selectionAsync();
    await loadQueue([track], 0);
    await play();
    onPress?.();
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const liked = isFavorite(track.id);

  const defaultPlaylist = getPlaylist('default-playlist');
  const isInPlaylist = defaultPlaylist?.tracks.some((t) => t.id === track.id) ?? false;

  const actions = useMemo(
    () => [
      {
        key: 'like',
        content: (
          <Text style={{ color: colors.text }}>{liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</Text>
        ),
        onPress: () => toggleFavorite(track),
      },
      {
        key: 'add',
        content: (
          <Text style={{ color: colors.text }}>{isInPlaylist ? 'Remove from My Playlist' : 'Add to My Playlist'}</Text>
        ),
        onPress: async () => {
          const pid = await ensureDefaultPlaylist();
          if (isInPlaylist) {
            await removeFromPlaylist(track.id, pid);
          } else {
            await addToPlaylist(track, pid);
          }
        },
      },
      { key: 'share', content: <Text style={{ color: colors.text }}>Share</Text> },
    ],
    [liked, isInPlaylist, track, toggleFavorite, ensureDefaultPlaylist, addToPlaylist, removeFromPlaylist]
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.row, disabled ? { opacity: 0.5 } : null]}
        onPressIn={() => {
          if (!disabled) scale.value = withTiming(0.98, { duration: 80 });
        }}
        onPressOut={() => {
          if (!disabled) scale.value = withTiming(1, { duration: 80 });
        }}
        onPress={disabled ? undefined : customOnPress ? customOnPress : handlePress}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Animated.View style={[styles.animWrap, animStyle]}>
          {track.artwork ? (
            <Image source={{ uri: track.artwork }} style={styles.thumb} />
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
          <Ionicons name="ellipsis-vertical" size={18} color="#A7A7A7" onPress={() => setSheetVisible(true)} />
        </Animated.View>
      </TouchableOpacity>
      <ActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        actions={actions.map((a) => ({
          ...a,
          onPress: () => {
            Haptics.selectionAsync();
            a.onPress?.();
          },
        }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 8 },
  animWrap: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 48, height: 48, backgroundColor: colors.surface, borderRadius: 4, marginRight: 12 },
  title: { color: colors.text, fontWeight: '600' },
  sub: { color: '#A7A7A7', marginTop: 2, fontSize: 12 },
});
