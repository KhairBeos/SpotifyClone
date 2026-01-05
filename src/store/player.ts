import { create } from 'zustand';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability, Event, RepeatMode } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Track = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  artwork?: string;
};

type PlayerState = {
  queue: Track[];
  baseQueue: Track[];
  index: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  shuffle: boolean;
  repeatMode: 'off' | 'queue' | 'track';
  init: () => Promise<void>;
  loadQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (millis: number) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  playAt: (index: number) => Promise<void>;
  removeAt: (index: number) => void;
  enqueueNext: (track: Track) => void;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
};

let initialized = false;
async function ensureSetup() {
  if (initialized) return;
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
  });
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 1,
  });
  initialized = true;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  baseQueue: [],
  index: 0,
  currentTrack: null,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  shuffle: false,
  repeatMode: 'off',

  init: async () => {
    try {
      await ensureSetup();
      const raw = await AsyncStorage.getItem('player_state');
      if (!raw) return;
      const { queue, index } = JSON.parse(raw) as { queue: Track[]; index: number };
      if (queue && queue.length) {
        await get().loadQueue(queue, Math.min(index, queue.length - 1));
      }
    } catch {}
  },

  loadQueue: async (tracks, startIndex = 0) => {
    await ensureSetup();

    set({
      queue: tracks,
      baseQueue: tracks.slice(),
      index: startIndex,
      currentTrack: tracks[startIndex] ?? null,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
    });

    const track = tracks[startIndex];
    if (!track) return;
    await TrackPlayer.reset();
    await TrackPlayer.add(
      tracks.map((t, i) => ({ id: String(i), url: t.uri, title: t.title, artist: t.artist, artwork: t.artwork }))
    );
    await TrackPlayer.skip(startIndex);
    const sub1 = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
      set({ positionMillis: Math.round(e.position * 1000), durationMillis: Math.round((e.duration ?? 0) * 1000) });
    });
    const sub2 = TrackPlayer.addEventListener(Event.PlaybackState, async () => {
      const state = await TrackPlayer.getPlaybackState();
      set({ isPlaying: state.state === 'playing' || (state as any) === 3 });
    });
    // We don't keep refs to remove; RNTP cleans listeners per reset, and app lifetime is fine here.
    try {
      await AsyncStorage.setItem('player_state', JSON.stringify({ queue: tracks, index: startIndex }));
    } catch {}
  },

  play: async () => {
    const st = get();
    if (!st.currentTrack) return;
    await TrackPlayer.play();
    try {
      const st = get();
      await AsyncStorage.setItem('player_state', JSON.stringify({ queue: st.queue, index: st.index }));
    } catch {}
  },

  pause: async () => {
    await TrackPlayer.pause();
  },

  togglePlay: async () => {
    const st = get();
    if (!st.currentTrack) return;
    const state = await TrackPlayer.getPlaybackState();
    const isPlaying = (state as any).state ? (state as any).state === 'playing' : (state as any) === 3;
    if (isPlaying) await TrackPlayer.pause();
    else await TrackPlayer.play();
  },

  seek: async (millis: number) => {
    await TrackPlayer.seekTo(millis / 1000);
  },

  next: async () => {
    const { queue, index } = get();
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) return;
    await TrackPlayer.skip(nextIndex);
    set({ index: nextIndex, currentTrack: queue[nextIndex] });
    await TrackPlayer.play();
    try {
      const st = get();
      await AsyncStorage.setItem('player_state', JSON.stringify({ queue: st.queue, index: st.index }));
    } catch {}
  },

  prev: async () => {
    const { queue, index } = get();
    const prevIndex = index - 1;
    if (prevIndex < 0) return;
    await TrackPlayer.skip(prevIndex);
    set({ index: prevIndex, currentTrack: queue[prevIndex] });
    await TrackPlayer.play();
    try {
      const st = get();
      await AsyncStorage.setItem('player_state', JSON.stringify({ queue: st.queue, index: st.index }));
    } catch {}
  },
  playAt: async (idx: number) => {
    const { queue } = get();
    if (idx < 0 || idx >= queue.length) return;
    await TrackPlayer.skip(idx);
    set({ index: idx, currentTrack: queue[idx] });
    await TrackPlayer.play();
    try {
      const st = get();
      await AsyncStorage.setItem('player_state', JSON.stringify({ queue: st.queue, index: st.index }));
    } catch {}
  },
  removeAt: (idx: number) => {
    const { queue, index } = get();
    if (idx < 0 || idx >= queue.length) return;
    const newQueue = queue.slice();
    newQueue.splice(idx, 1);
    let newIndex = index;
    if (idx < index) newIndex = Math.max(0, index - 1);
    if (newIndex >= newQueue.length) newIndex = Math.max(0, newQueue.length - 1);
    set({ queue: newQueue, index: newIndex, currentTrack: newQueue[newIndex] ?? null });
  },
  enqueueNext: (track: Track) => {
    const { queue, index } = get();
    const newQueue = queue.slice();
    newQueue.splice(index + 1, 0, track);
    set({ queue: newQueue });
  },

  toggleShuffle: async () => {
    const { shuffle, queue, baseQueue, index, loadQueue } = get();
    const current = queue[index];
    if (!current) {
      set({ shuffle: !shuffle });
      return;
    }
    if (!shuffle) {
      const rest = queue.filter((_, i) => i !== index);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const newQueue = [current, ...rest];
      await loadQueue(newQueue, 0);
      set({ shuffle: true });
    } else {
      const targetIndex = Math.max(
        0,
        baseQueue.findIndex((t) => t.id === current.id)
      );
      await loadQueue(baseQueue.slice(), targetIndex >= 0 ? targetIndex : 0);
      set({ shuffle: false });
    }
  },
  cycleRepeatMode: async () => {
    const m = get().repeatMode;
    const next = m === 'off' ? 'queue' : m === 'queue' ? 'track' : 'off';
    set({ repeatMode: next });
    await TrackPlayer.setRepeatMode(
      next === 'off' ? RepeatMode.Off : next === 'queue' ? RepeatMode.Queue : RepeatMode.Track
    );
  },
}));
