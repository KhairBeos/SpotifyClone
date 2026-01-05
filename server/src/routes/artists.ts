import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { artistIdFrom, artistNameFromId } from '../lib/ids';
import { spotifyGetArtist } from '../lib/spotify';

const router = Router();

router.get('/', async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { data, error } = await sb.from('artists').select('*').order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const mapped = await Promise.all(
    (data || []).map(async (a: any) => {
      let images = a.images ? JSON.parse(a.images) : null;
      if ((!images || images.length === 0) && a.spotify_id) {
        try {
          const sp = await spotifyGetArtist(a.spotify_id);
          images = sp?.images || null;
        } catch {}
      }
      return {
        id: artistIdFrom(a.name),
        name: a.name,
        spotifyId: a.spotify_id,
        images,
      };
    })
  );
  res.json(mapped);
});

router.get('/:id', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const name = artistNameFromId(req.params.id);
  const { data, error } = await sb.from('artists').select('*').eq('name', name).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Artist not found' });
  let images = data.images ? JSON.parse(data.images) : null;
  if ((!images || images.length === 0) && data.spotify_id) {
    try {
      const sp = await spotifyGetArtist(data.spotify_id);
      images = sp?.images || null;
    } catch {}
  }
  res.json({
    id: req.params.id,
    name: data.name,
    spotifyId: data.spotify_id,
    images,
  });
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
  res.json(
    (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      durationMs: t.duration_ms,
      album: t.album
        ? {
            id: t.album,
            name: t.album,
            images: t.spotify_image_url
              ? JSON.stringify([{ url: t.spotify_image_url, width: 640, height: 640 }])
              : null,
          }
        : null,
    }))
  );
});

export default router;
