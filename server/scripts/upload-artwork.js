#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { parseFile } = require('music-metadata');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
const BUCKET = process.env.SUPABASE_BUCKET;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getTracksToProcess() {
  const { data, error } = await supabase
    .from('tracks')
    .select('id, local_path, spotify_image_url, artwork_url')
    .is('local_path', null)
    .not('spotify_image_url', 'is', null);
}

(async function main() {
  try {
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, local_path, spotify_image_url, artwork_url')
      .neq('local_path', null)
      .is('artwork_url', null)
      .limit(1000);

    if (error) throw error;
    if (!tracks || !tracks.length) {
      console.log('No tracks to process.');
      return;
    }

    console.log(`Found ${tracks.length} tracks to check`);

    const queue = tracks.slice();
    let active = 0;

    async function worker() {
      while (queue.length) {
        if (active >= CONCURRENCY) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        const t = queue.shift();
        if (!t) break;
        active++;
        (async (track) => {
          try {
            if (track.spotify_image_url) {
              await supabase.from('tracks').update({ artwork_url: track.spotify_image_url }).eq('id', track.id);
              console.log(`Track ${track.id}: set artwork_url from spotify_image_url`);
              return;
            }

            const localPath = path.isAbsolute(track.local_path)
              ? track.local_path
              : path.join(MEDIA_DIR, track.local_path);
            if (!fs.existsSync(localPath)) {
              console.warn(`Track ${track.id}: local file not found: ${localPath}`);
              return;
            }
            const meta = await parseFile(localPath, { duration: false });
            const picture = meta.common.picture && meta.common.picture[0];
            if (!picture || !picture.data) {
              console.warn(`Track ${track.id}: no embedded picture`);
              return;
            }

            const ext = (picture.format || 'image/jpeg').split('/').pop();
            const fileName = `${track.id}.${ext}`;
            const filePath = `track-artwork/${fileName}`;
            const buffer = Buffer.isBuffer(picture.data) ? picture.data : Buffer.from(picture.data);

            // upload
            const { data: up, error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
              contentType: picture.format || 'image/jpeg',
              upsert: true,
            });
            if (upErr) {
              console.error(`Track ${track.id}: upload failed:`, upErr.message || upErr);
              return;
            }

            const { publicURL } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
            await supabase.from('tracks').update({ artwork_url: publicURL }).eq('id', track.id);
            console.log(`Track ${track.id}: uploaded artwork -> ${publicURL}`);
          } catch (e) {
            console.error(`Track ${t.id}: error`, e.message || e);
          } finally {
            active--;
          }
        })(t);
      }

      // wait for remaining tasks
      while (active > 0) await new Promise((r) => setTimeout(r, 200));
      console.log('Done processing tracks.');
    }

    await worker();
  } catch (e) {
    console.error('Fatal error', e.message || e);
    process.exit(1);
  }
})();
