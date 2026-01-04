import { API_URL } from './config';

export type ServerArtist = {
  id: string;
  name: string;
  images?: string | null; // JSON stringified array from Spotify
};

export type ServerTrack = {
  id: string;
  title: string;
  durationMs?: number | null;
  albumId?: string | null;
  artistId?: string | null;
  album?: { id: string; name: string; images?: string | null } | null;
  artist?: { id: string; name: string } | null;
};

export type ServerAlbum = {
  id: string;
  name: string;
  images?: string | null;
  artistId: string;
  artist?: { id: string; name: string } | null;
};

export const api = {
  async getTracks(limit = 200): Promise<ServerTrack[]> {
    const res = await fetch(`${API_URL}/tracks?limit=${limit}&order=title`);
    if (!res.ok) throw new Error('tracks_failed');
    return res.json();
  },
  async getArtists(): Promise<ServerArtist[]> {
    const res = await fetch(`${API_URL}/artists`);
    if (!res.ok) throw new Error('artists_failed');
    return res.json();
  },
  async getArtist(id: string): Promise<ServerArtist> {
    const res = await fetch(`${API_URL}/artists/${id}`);
    if (!res.ok) throw new Error('artist_failed');
    return res.json();
  },
  async getArtistTracks(id: string): Promise<ServerTrack[]> {
    const res = await fetch(`${API_URL}/artists/${id}/tracks`);
    if (!res.ok) throw new Error('artist_tracks_failed');
    return res.json();
  },
  async getAlbums(): Promise<ServerAlbum[]> {
    const res = await fetch(`${API_URL}/albums`);
    if (!res.ok) throw new Error('albums_failed');
    return res.json();
  },
  async getAlbum(id: string): Promise<ServerAlbum> {
    const res = await fetch(`${API_URL}/albums/${id}`);
    if (!res.ok) throw new Error('album_failed');
    return res.json();
  },
  async getAlbumTracks(id: string): Promise<ServerTrack[]> {
    const res = await fetch(`${API_URL}/albums/${id}/tracks`);
    if (!res.ok) throw new Error('album_tracks_failed');
    return res.json();
  },
  async getRecentTracks(limit = 20): Promise<ServerTrack[]> {
    const res = await fetch(`${API_URL}/tracks?limit=${limit}&order=recent`);
    if (!res.ok) throw new Error('tracks_failed');
    return res.json();
  },
  async search(q: string) {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('search_failed');
    return res.json();
  },
  streamUrl(trackId: string) {
    return `${API_URL}/tracks/${trackId}/stream`;
  },
  artworkUrl(trackId: string) {
    return `${API_URL}/tracks/${trackId}/artwork`;
  },
  health: async () => {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error('health_failed');
    return res.json();
  },
};
