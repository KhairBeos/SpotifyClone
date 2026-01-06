#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'music');
const BUCKET = process.env.SUPABASE_BUCKET_MUSIC || 'track-audio';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2', 10);

(async function main() {
  try {
    // Get all tracks with local_path
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, local_path, audio_url')
      .neq('local_path', null)
      .is('audio_url', null)
      .limit(1000);

    if (error) throw error;
    if (!tracks || !tracks.length) {
      console.log('No tracks to process.');
      return;
    }

    console.log(`Found ${tracks.length} tracks to upload`);

    const queue = tracks.slice();
    let active = 0;

    async function worker() {
      while (queue.length) {
        if (active >= CONCURRENCY) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        const track = queue.shift();
        if (!track) break;
        active++;

        (async (t) => {
          try {
            const localPath = path.isAbsolute(t.local_path) ? t.local_path : path.join(MEDIA_DIR, t.local_path);

            if (!fs.existsSync(localPath)) {
              console.warn(`Track ${t.id}: file not found: ${localPath}`);
              active--;
              return;
            }

            const fileBuffer = fs.readFileSync(localPath);
            const ext = path.extname(localPath).slice(1) || 'mp3';
            const fileName = `${t.id}.${ext}`;
            const filePath = `track-audio/${fileName}`;

            console.log(`Uploading ${t.id}... (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

            const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, fileBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

            if (upErr) {
              console.error(`Track ${t.id}: upload failed:`, upErr.message || upErr);
              active--;
              return;
            }

            const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
            const audioUrl = pubData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;

            await supabase.from('tracks').update({ audio_url: audioUrl }).eq('id', t.id);
            console.log(`✅ Track ${t.id}: ${audioUrl}`);
          } catch (e) {
            console.error(`Track ${t.id}: error`, e.message || e);
          } finally {
            active--;
          }
        })(track);
      }

      while (active > 0) await new Promise((r) => setTimeout(r, 500));
      console.log('\n✅ Done!');
    }

    await worker();
  } catch (e) {
    console.error('Fatal error', e.message || e);
    process.exit(1);
  }
})();
