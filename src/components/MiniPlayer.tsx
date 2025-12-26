import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player';
import { useNavigation } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function MiniPlayer() {
  const navigation = useNavigation();
  const { currentTrack, isPlaying, togglePlay, positionMillis, durationMillis } = usePlayerStore();

  const progress = durationMillis > 0 ? Math.min(1, Math.max(0, positionMillis / durationMillis)) : 0;

  if (!currentTrack) return null;

  const translateY = useSharedValue(0);
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // allow slight upward drag for feedback
      const y = Math.min(0, Math.max(-80, e.translationY));
      translateY.value = y;
    })
    .onEnd((e) => {
      const shouldOpen = e.translationY < -40;
      if (shouldOpen) {
        runOnJS(navigation.navigate)('NowPlaying' as never);
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, animStyle]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('NowPlaying' as never)}
          activeOpacity={0.9}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        >
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); togglePlay(); }} style={styles.button}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={colors.text} />
        </TouchableOpacity>
        </TouchableOpacity>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFg, { width: `${progress * 100}%` }]} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  info: { flex: 1, marginRight: 8 },
  title: { color: colors.text, fontWeight: '600' },
  artist: { color: '#A7A7A7', marginTop: 2, fontSize: 12 },
  button: { padding: 8 },
  progressBarBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: '#333' },
  progressBarFg: { height: 2, backgroundColor: colors.primary },
});
