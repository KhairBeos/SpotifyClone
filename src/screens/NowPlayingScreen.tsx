import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { colors } from '../theme/colors';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player';
import { useNavigation } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlayingScreen() {
  const { currentTrack, positionMillis, durationMillis, togglePlay, next, prev, isPlaying, seek, shuffle, repeatMode, toggleShuffle, cycleRepeatMode } = usePlayerStore();
  const nav = useNavigation();
  const [seeking, setSeeking] = useState<number | null>(null);

  const progress = useMemo(() => {
    const pos = seeking ?? positionMillis;
    if (!durationMillis || durationMillis <= 0) return 0;
    return Math.min(1, Math.max(0, pos / durationMillis));
  }, [positionMillis, durationMillis, seeking]);

  if (!currentTrack) {
    return (
      <View style={styles.containerEmpty}>
        <Text style={styles.empty}>No track selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentTrack.artwork ? (
        <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
      ) : (
        <View style={styles.artwork} />
      )}

      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <Ionicons name="heart-outline" color={colors.text} size={22} />
      </View>

      <View style={styles.sliderWrap}>
        <Slider
          value={progress}
          minimumValue={0}
          maximumValue={1}
          step={0.001}
          minimumTrackTintColor={colors.text}
          maximumTrackTintColor="#5c5c5c"
          thumbTintColor={colors.text}
          onValueChange={(v) => setSeeking(v * (durationMillis || 0))}
          onSlidingComplete={async (v) => {
            setSeeking(null);
            await seek(v * (durationMillis || 0));
          }}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(seeking ?? positionMillis)}</Text>
          <Text style={styles.time}>{formatTime(Math.max(0, (durationMillis || 0) - (seeking ?? positionMillis)))}</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={toggleShuffle}>
          <Ionicons name="shuffle" size={20} color={shuffle ? colors.text : '#A7A7A7'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={prev}>
          <Ionicons name="play-skip-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={colors.surface} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={next}>
          <Ionicons name="play-skip-forward" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={cycleRepeatMode}>
          <Ionicons name={repeatMode === 'track' ? 'repeat-once' : 'repeat'} size={20} color={repeatMode !== 'off' ? colors.text : '#A7A7A7'} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomRow}>
        <Ionicons name="speaker" size={18} color="#A7A7A7" />
        <Text style={styles.device}>This device</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => nav.navigate('Queue' as never)}>
          <Ionicons name="list" size={20} color="#A7A7A7" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  containerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  empty: { color: '#A7A7A7' },
  artwork: {
    width: screenWidth - 32,
    height: screenWidth - 32,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  artist: { color: '#A7A7A7', marginTop: 4 },
  sliderWrap: { marginTop: 12 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { color: '#A7A7A7', fontSize: 12 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  ctrlBtn: { padding: 8 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  device: { color: '#A7A7A7', marginLeft: 8 },
});
