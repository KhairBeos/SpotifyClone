import { Router } from 'express';
import path from 'path';
import mime from 'mime-types';
import { streamFileWithRange } from '../middleware/rangeStream';
import { getSupabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 200);
  const order = String(req.query.order || 'recent');
  const orderCol = order === 'title' ? 'title' : 'created_at';
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .order(orderCol, { ascending: order === 'title' })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  const mapped = (data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    durationMs: t.duration_ms,
    albumId: null,
    artistId: null,
    album: t.album ? { id: t.album, name: t.album, images: t.spotify_image_url ? JSON.stringify([{ url: t.spotify_image_url, width: 640, height: 640 }]) : null } : null,
    artist: t.artists && t.artists.length ? { id: t.artists[0], name: t.artists[0] } : null,
  }));
  res.json(mapped);
});

router.get('/:id', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { data, error } = await sb.from('tracks').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: data.id,
    title: data.title,
    durationMs: data.duration_ms,
    album: data.album ? { id: data.album, name: data.album, images: data.spotify_image_url ? JSON.stringify([{ url: data.spotify_image_url, width: 640, height: 640 }]) : null } : null,
    artist: data.artists && data.artists.length ? { id: data.artists[0], name: data.artists[0] } : null,
  });
});

router.get('/:id/stream', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { data, error } = await sb.from('tracks').select('local_path').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data || !data.local_path) return res.status(404).json({ error: 'Not found' });
  const abs = path.isAbsolute(data.local_path) ? data.local_path : path.join(process.env.MEDIA_DIR || path.join(process.cwd(), 'media'), data.local_path);
  const contentType = mime.lookup(abs) || 'audio/mpeg';
  streamFileWithRange(req, res, abs, String(contentType));
});

export default router;
