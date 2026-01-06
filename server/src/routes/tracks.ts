import { Router } from 'express';
import fs from 'fs';
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
    album: t.album
      ? {
          id: t.album,
          name: t.album,
          images: t.spotify_image_url ? JSON.stringify([{ url: t.spotify_image_url, width: 640, height: 640 }]) : null,
        }
      : null,
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
    album: data.album
      ? {
          id: data.album,
          name: data.album,
          images: data.spotify_image_url
            ? JSON.stringify([{ url: data.spotify_image_url, width: 640, height: 640 }])
            : null,
        }
      : null,
    artist: data.artists && data.artists.length ? { id: data.artists[0], name: data.artists[0] } : null,
  });
});

router.get('/:id/stream', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { data, error } = await sb.from('tracks').select('audio_url, local_path').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });

  // Priority 1: audio_url (Supabase Storage - cloud)
  if (data.audio_url) {
    return res.redirect(302, data.audio_url);
  }

  // Fallback: local file (dev only)
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction || !data.local_path) {
    return res.status(404).json({ error: 'Audio not available' });
  }

  const abs = path.isAbsolute(data.local_path)
    ? data.local_path
    : path.join(process.env.MEDIA_DIR || path.join(process.cwd(), 'media'), data.local_path);
  try {
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File not found on disk' });
    const contentType = mime.lookup(abs) || 'audio/mpeg';
    streamFileWithRange(req, res, abs, String(contentType));
  } catch (e) {
    res.status(500).json({ error: 'stream_failed', detail: String(e) });
  }
});

router.get('/:id/artwork', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });

  const { data, error } = await sb
    .from('tracks')
    .select('artwork_url, spotify_image_url')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });

  // Priority 1: artwork_url (Supabase Storage - uploaded from script)
  if (data.artwork_url) {
    return res.redirect(302, data.artwork_url);
  }

  // Priority 2: spotify_image_url
  if (data.spotify_image_url) {
    return res.redirect(302, data.spotify_image_url);
  }

  return res.status(404).json({ error: 'No artwork available' });
});

router.patch('/:id', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });
  const { id } = req.params;
  const { title, artists, album, duration_ms } = req.body;
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (artists !== undefined) updates.artists = Array.isArray(artists) ? artists : [artists];
  if (album !== undefined) updates.album = album;
  if (duration_ms !== undefined) updates.duration_ms = duration_ms;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  const { data, error } = await sb.from('tracks').update(updates).eq('id', id).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Track not found' });
  res.json({
    id: data.id,
    title: data.title,
    durationMs: data.duration_ms,
    album: data.album ? { id: data.album, name: data.album } : null,
    artist: data.artists && data.artists.length ? { id: data.artists[0], name: data.artists[0] } : null,
  });
});

export default router;
