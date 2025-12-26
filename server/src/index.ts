import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getSupabase } from './lib/supabase';
import artistsRouter from './routes/artists';
import albumsRouter from './routes/albums';
import tracksRouter from './routes/tracks';
import ingestRouter from './routes/ingest';
import searchRouter from './routes/search';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');

app.get('/health', async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json({ ok: true, mediaDir: MEDIA_DIR, supabase: { configured: false, ok: false } });
  try {
    const { error } = await sb.from('tracks').select('id').limit(1);
    if (error) return res.json({ ok: true, mediaDir: MEDIA_DIR, supabase: { configured: true, ok: false, error: error.message } });
    res.json({ ok: true, mediaDir: MEDIA_DIR, supabase: { configured: true, ok: true } });
  } catch (e: any) {
    res.json({ ok: true, mediaDir: MEDIA_DIR, supabase: { configured: true, ok: false, error: String(e) } });
  }
});

app.use('/artists', artistsRouter);
app.use('/albums', albumsRouter);
app.use('/tracks', tracksRouter);
app.use('/ingest', ingestRouter);
app.use('/search', searchRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${PORT}`);
});
