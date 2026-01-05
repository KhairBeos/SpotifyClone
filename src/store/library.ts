import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from './player';
import { nanoid } from 'nanoid/non-secure';

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
};

type LibraryState = {
  hydrated: boolean;
  favorites: Record<string, Track>;
  playlists: Playlist[];
  hydrate: () => Promise<void>;
  toggleFavorite: (track: Track) => Promise<void>;
  isFavorite: (id: string) => boolean;
  ensureDefaultPlaylist: () => Promise<string>;
  addToPlaylist: (track: Track, playlistId: string) => Promise<void>;
  removeFromPlaylist: (trackId: string, playlistId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  getPlaylist: (id: string) => Playlist | undefined;
};

const STORAGE_KEY = 'library_state_v1';

async function save(state: Pick<LibraryState, 'favorites' | 'playlists'>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites: state.favorites, playlists: state.playlists }));
  } catch {}
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  hydrated: false,
  favorites: {},
  playlists: [],

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { favorites?: Record<string, Track>; playlists?: Playlist[] };
        set({ favorites: parsed.favorites || {}, playlists: parsed.playlists || [], hydrated: true });
        return;
      }
    } catch {}
    set({ hydrated: true });
  },

  toggleFavorite: async (track: Track) => {
    const { favorites } = get();
    const next = { ...favorites };
    if (next[track.id]) {
      delete next[track.id];
    } else {
      next[track.id] = track;
    }
    set({ favorites: next });
    await save({ favorites: next, playlists: get().playlists });
  },

  isFavorite: (id: string) => {
    return Boolean(get().favorites[id]);
  },

  ensureDefaultPlaylist: async () => {
    const { playlists } = get();
    const existing = playlists.find((p) => p.id === 'default-playlist');
    if (existing) return existing.id;
    const next: Playlist = { id: 'default-playlist', name: 'My Playlist', tracks: [], createdAt: Date.now() };
    const updated = [...playlists, next];
    set({ playlists: updated });
    await save({ favorites: get().favorites, playlists: updated });
    return next.id;
  },

  addToPlaylist: async (track: Track, playlistId: string) => {
    const { playlists } = get();
    const updated = playlists.map((p) => {
      if (p.id !== playlistId) return p;
      const exists = p.tracks.some((t) => t.id === track.id);
      if (exists) return p;
      return { ...p, tracks: [...p.tracks, track] };
    });
    set({ playlists: updated });
    await save({ favorites: get().favorites, playlists: updated });
  },

  removeFromPlaylist: async (trackId: string, playlistId: string) => {
    const { playlists } = get();
    const updated = playlists.map((p) =>
      p.id === playlistId ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p
    );
    set({ playlists: updated });
    await save({ favorites: get().favorites, playlists: updated });
  },

  createPlaylist: async (name: string) => {
    const { playlists } = get();
    const fresh: Playlist = { id: nanoid(), name: name || 'New Playlist', tracks: [], createdAt: Date.now() };
    const updated = [...playlists, fresh];
    set({ playlists: updated });
    await save({ favorites: get().favorites, playlists: updated });
    return fresh;
  },

  getPlaylist: (id: string) => {
    return get().playlists.find((p) => p.id === id);
  },
}));
