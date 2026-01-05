export function artistIdFrom(name: string) {
  return 'art_' + Buffer.from(name, 'utf8').toString('base64url');
}
export function artistNameFromId(id: string) {
  return Buffer.from(id.replace(/^art_/, ''), 'base64url').toString('utf8');
}

export function albumIdFrom(artist: string, album: string) {
  const key = `${artist}|${album}`;
  return 'alb_' + Buffer.from(key, 'utf8').toString('base64url');
}
export function albumKeysFromId(id: string): { artist: string; album: string } {
  const s = Buffer.from(id.replace(/^alb_/, ''), 'base64url').toString('utf8');
  const [artist, album] = s.split('|');
  return { artist, album };
}

export function trackIdFrom(relPath: string) {
  return 'trk_' + Buffer.from(relPath, 'utf8').toString('base64url');
}
