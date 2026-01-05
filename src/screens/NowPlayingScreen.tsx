import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useLibraryStore } from '../store/library';

const screenWidth = Dimensions.get('window').width;

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    positionMillis,
    durationMillis,
    togglePlay,
    next,
    prev,
    isPlaying,
    seek,
    shuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
    queue,
    index,
  } = usePlayerStore();
  const nav = useNavigation();
  const [seeking, setSeeking] = useState<number | null>(null);
  const { isFavorite, toggleFavorite, hydrate } = useLibraryStore();

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  const progress = useMemo(() => {
    const pos = seeking ?? positionMillis;
    if (!durationMillis || durationMillis <= 0) return 0;
    return Math.min(1, Math.max(0, pos / durationMillis));
  }, [positionMillis, durationMillis, seeking]);

  const liked = currentTrack ? isFavorite(currentTrack.id) : false;

  const hasPrev = (index || 0) > 0;
  const hasNext = queue && index < queue.length - 1;

  const handlePrev = async () => {
    await Haptics.selectionAsync();
    if (positionMillis > 3000) {
      await seek(0);
    } else if (hasPrev) {
      await prev();
    }
  };

  const handleNext = async () => {
    if (!hasNext) return;
    await Haptics.selectionAsync();
    await next();
  };

  if (!currentTrack) {
    return (
      <View style={[styles.containerEmpty, { paddingTop: insets.top }]}>
        <Text style={styles.empty}>No track playing</Text>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Close Button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity
          disabled={!currentTrack}
          onPress={() => {
            if (currentTrack) toggleFavorite(currentTrack);
          }}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.primary : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        scrollEnabled={false}
      >
        {/* Album Artwork */}
        <View style={styles.artworkWrapper}>
          <View style={styles.artworkShadow}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
            ) : (
              <View style={styles.artwork} />
            )}
          </View>
        </View>

        {/* Track Info */}
        <View style={styles.infoSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              toggleFavorite(currentTrack);
            }}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.primary : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Progress Slider */}
        <View style={styles.sliderSection}>
          <Slider
            value={progress}
            minimumValue={0}
            maximumValue={1}
            step={0.001}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="#5c5c5c"
            thumbTintColor={colors.primary}
            onValueChange={(v) => setSeeking(v * (durationMillis || 0))}
            onSlidingComplete={async (v) => {
              setSeeking(null);
              await seek(v * (durationMillis || 0));
            }}
            style={{ width: '100%', height: 40 }}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(seeking ?? positionMillis)}</Text>
            <Text style={styles.time}>
              {formatTime(Math.max(0, (durationMillis || 0) - (seeking ?? positionMillis)))}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={[styles.smallBtn, shuffle && styles.activeBtn]}
            onPress={() => {
              Haptics.selectionAsync();
              toggleShuffle();
            }}
          >
            <Ionicons name="shuffle" size={22} color={shuffle ? colors.primary : '#A7A7A7'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, !hasPrev && styles.disabledBtn]}
            onPress={handlePrev}
            disabled={!hasPrev && positionMillis <= 3000}
          >
            <Ionicons
              name="play-skip-back-sharp"
              size={28}
              color={!hasPrev && positionMillis <= 3000 ? '#555' : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => {
              Haptics.selectionAsync();
              togglePlay();
            }}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, !hasNext && styles.disabledBtn]}
            onPress={handleNext}
            disabled={!hasNext}
          >
            <Ionicons name="play-skip-forward-sharp" size={28} color={!hasNext ? '#555' : colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, repeatMode !== 'off' && styles.activeBtn]}
            onPress={() => {
              Haptics.selectionAsync();
              cycleRepeatMode();
            }}
          >
            <View>
              <Ionicons name={'repeat'} size={22} color={repeatMode !== 'off' ? colors.primary : '#A7A7A7'} />
              {repeatMode === 'track' && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatBadgeText}>1</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.footerBtn}>
            <Ionicons name="share-social" size={20} color="#A7A7A7" />
            <Text style={styles.footerBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => nav.navigate('Queue' as never)}>
            <Ionicons name="list" size={20} color="#A7A7A7" />
            <Text style={styles.footerBtnText}>Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color="#A7A7A7" />
            <Text style={styles.footerBtnText}>More</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  containerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    flexDirection: 'column',
    gap: 12,
  },
  empty: {
    color: '#A7A7A7',
    fontSize: 16,
  },
  backBtn: {
    padding: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  artworkWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  artworkShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderRadius: 12,
  },
  artwork: {
    width: screenWidth - 32,
    height: screenWidth - 32,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  artist: {
    color: '#A7A7A7',
    fontSize: 14,
  },
  sliderSection: {
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  time: {
    color: '#A7A7A7',
    fontSize: 12,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  smallBtn: {
    padding: 8,
    borderRadius: 24,
  },
  activeBtn: {
    backgroundColor: '#1f1f1f',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  playBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  repeatBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  repeatBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    alignItems: 'center',
    gap: 6,
  },
  footerBtnText: {
    color: '#A7A7A7',
    fontSize: 12,
  },
});
