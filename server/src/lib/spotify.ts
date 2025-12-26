import axios from 'axios';

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 60_000) return cachedToken.access_token;

  const resp = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: clientId, password: clientSecret },
    }
  );
  const { access_token, expires_in } = resp.data;
  cachedToken = { access_token, expires_at: now + expires_in * 1000 };
  return access_token as string;
}

export async function spotifySearch(q: string, type: string = 'track,artist,album', limit = 10) {
  const token = await getAccessToken();
  if (!token) return { tracks: [], artists: [], albums: [] };
  const { data } = await axios.get('https://api.spotify.com/v1/search', {
    params: { q, type, limit },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function spotifyGetTrack(id: string) {
  const token = await getAccessToken();
  if (!token) return null;
  const { data } = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function spotifyGetArtist(id: string) {
  const token = await getAccessToken();
  if (!token) return null;
  const { data } = await axios.get(`https://api.spotify.com/v1/artists/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
