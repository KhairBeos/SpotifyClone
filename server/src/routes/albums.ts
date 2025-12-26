import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { albumIdFrom, albumKeysFromId } from '../lib/ids';

const router = Router();

router.get('/', async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { data, error } = await sb.from('tracks').select('album, artists, spotify_image_url');
  if (error) return res.status(500).json({ error: error.message });
  const map = new Map<string, { id: string; name: string; artist?: { id: string; name: string } | null; images?: string | null }>();
  for (const t of data || []) {
    const album = (t as any).album as string | null;
    const artists = (t as any).artists as string[] | null;
    if (!album || !artists || !artists.length) continue;
    const artistName = artists[0];
    const id = albumIdFrom(artistName, album);
    if (!map.has(id)) {
      const img = (t as any).spotify_image_url as string | null;
      map.set(id, {
        id,
        name: album,
        artist: { id: artistName, name: artistName },
        images: img ? JSON.stringify([{ url: img, width: 640, height: 640 }]) : null,
      });
    }
  }
  res.json(Array.from(map.values()));
});

router.get('/:id', async (req, res) => {
  const { artist, album } = albumKeysFromId(req.params.id);
  res.json({ id: req.params.id, name: album, artist: { id: artist, name: artist } });
});

router.get('/:id/tracks', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { artist, album } = albumKeysFromId(req.params.id);
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .eq('album', album)
    .contains('artists', [artist])
    .order('track_number', { ascending: true })
    .order('title', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map((t: any) => ({ id: t.id, title: t.title, durationMs: t.duration_ms })));
});

export default router;
