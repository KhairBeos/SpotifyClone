import { Router } from 'express';
import { spotifySearch } from '../lib/spotify';

const router = Router();

router.get('/', async (req, res) => {
  const q = String(req.query.q || req.query.query || '').trim();
  if (!q) return res.json({ tracks: [], artists: [], albums: [] });
  if (q.length > 200) return res.status(400).json({ error: 'Query too long (max 200 characters)' });
  try {
    const data = await spotifySearch(q);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'spotify_search_failed', detail: String(e) });
  }
});

export default router;
