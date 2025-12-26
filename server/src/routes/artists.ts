import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { artistIdFrom, artistNameFromId } from '../lib/ids';

const router = Router();

router.get('/', async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { data, error } = await sb.from('tracks').select('artists, spotify_image_url');
  if (error) return res.status(500).json({ error: error.message });
  const map = new Map<string, { id: string; name: string; images?: string | null }>();
  for (const t of data || []) {
    const artists = (t as any).artists as string[] | null;
    if (!artists || !artists.length) continue;
    const name = artists[0];
    const id = artistIdFrom(name);
    if (!map.has(id)) {
      const img = (t as any).spotify_image_url as string | null;
      map.set(id, { id, name, images: img ? JSON.stringify([{ url: img, width: 640, height: 640 }]) : null });
    }
  }
  res.json(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
});

router.get('/:id', async (req, res) => {
  const name = artistNameFromId(req.params.id);
  res.json({ id: req.params.id, name });
});

router.get('/:id/tracks', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const name = artistNameFromId(req.params.id);
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .contains('artists', [name])
    .order('album', { ascending: true })
    .order('track_number', { ascending: true })
    .order('title', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    durationMs: t.duration_ms,
    album: t.album ? { id: t.album, name: t.album, images: t.spotify_image_url ? JSON.stringify([{ url: t.spotify_image_url, width: 640, height: 640 }]) : null } : null,
  })));
});

export default router;
