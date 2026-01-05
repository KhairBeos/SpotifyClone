import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import { spotifySearch, spotifyGetArtist } from '../lib/spotify';
import { getSupabase } from '../lib/supabase';
import { trackIdFrom } from '../lib/ids';

const router = Router();

function walk(dir: string, acc: string[] = []): string[] {
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    if (ent.isDirectory()) walk(path.join(dir, ent.name), acc);
    else if (/\.(mp3|m4a|flac|wav)$/i.test(ent.name)) acc.push(path.join(dir, ent.name));
  }
  return acc;
}

router.post('/scan', async (req, res) => {
  const root = (req.body?.root as string) || process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
  if (!fs.existsSync(root)) return res.status(400).json({ error: 'media_dir_missing', root });

  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'supabase_not_configured' });

  const files = walk(root);
  let created = 0;
  let updated = 0;
  const results: any[] = [];

  for (const file of files) {
    try {
      const meta = await parseFile(file);
      const common = meta.common;
      const title = common.title || path.basename(file);
      const artistName = (common.artists && common.artists[0]) || common.artist || 'Unknown Artist';
      const durationMs = Math.round((meta.format.duration || 0) * 1000);

      let albumName = 'Unknown Album';
      let albumImagesJson: string | undefined;
      let trackSpotifyId: string | undefined;
      let trackSpotifyUri: string | undefined;
      let previewUrl: string | undefined;
      let popularity: number | undefined;
      let trackNo = 0;
      let discNo = 0;
      let finalTitle = title;
      let finalArtistName = artistName;
      let finalDurationMs = durationMs;
      if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
        try {
          const q = `track:"${title}" artist:"${artistName}"`;
          const data = await spotifySearch(q, 'track', 1);
          const item = data?.tracks?.items?.[0];
          if (item) {
            // Use Spotify metadata for title, artist, and duration
            finalTitle = item.name || title;
            finalArtistName = item.artists?.[0]?.name || artistName;
            finalDurationMs = (item as any).duration_ms || durationMs;

            trackSpotifyId = item.id;
            trackSpotifyUri = (item as any).uri;
            previewUrl = (item as any).preview_url || undefined;
            popularity = (item as any).popularity;
            albumName = item.album?.name || albumName;
            if (item.album?.images) albumImagesJson = JSON.stringify(item.album.images);
            trackNo = (item as any).track_number || 0;
            discNo = (item as any).disc_number || 0;

            // Save artist info to artists table
            const artistSpotifyId = item.artists?.[0]?.id;
            if (artistSpotifyId) {
              try {
                const artistData = await spotifyGetArtist(artistSpotifyId);
                if (artistData) {
                  let artistImages: string | undefined;
                  if ((artistData as any).images && (artistData as any).images.length > 0) {
                    artistImages = JSON.stringify((artistData as any).images);
                  }
                  const { error: artistErr } = await sb.from('artists').upsert(
                    {
                      name: finalArtistName,
                      spotify_id: artistSpotifyId,
                      images: artistImages,
                    },
                    { onConflict: 'name' }
                  );
                  if (artistErr) console.error('Failed to upsert artist:', artistErr.message);
                }
              } catch (e) {
                console.error('Failed to get/save artist:', String(e));
              }
            }
          }
        } catch {}
      }

      const relPath = path.relative(root, file);
      const id = trackIdFrom(relPath);
      let exists = false;
      try {
        const { data: existingRow } = await sb.from('tracks').select('id').eq('id', id).maybeSingle();
        exists = !!existingRow;
      } catch {}

      let imageUrl: string | undefined;
      if (albumImagesJson) {
        try {
          const arr = JSON.parse(albumImagesJson) as Array<{ url: string; width: number; height: number }>;
          imageUrl = arr?.[0]?.url || arr?.[1]?.url || undefined;
        } catch {}
      }

      const row = {
        id,
        title: finalTitle,
        artists: [finalArtistName],
        album: albumName,
        duration_ms: finalDurationMs,
        local_path: relPath,
        cover_local_path: null as any,
        spotify_id: trackSpotifyId,
        spotify_uri: trackSpotifyUri,
        preview_url: previewUrl,
        popularity: popularity,
        spotify_album: albumName,
        spotify_image_url: imageUrl,
        track_number: trackNo,
        disc_number: discNo,
      };

      const { error: upsertErr } = await sb.from('tracks').upsert(row, { onConflict: 'id' });
      if (upsertErr) throw new Error(upsertErr.message);
      if (exists) updated++;
      else created++;
      results.push({ file: relPath, title: finalTitle, artist: finalArtistName, album: albumName });
    } catch (e) {
      results.push({ file, error: String(e) });
    }
  }

  res.json({ root, files: files.length, created, updated, items: results.slice(0, 50) });
});

export default router;
