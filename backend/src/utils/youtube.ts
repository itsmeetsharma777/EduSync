const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract an embeddable video id from a supported public YouTube URL. */
export function parseYouTubeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null;
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(embed|shorts)\//.test(url.pathname)) id = url.pathname.split('/')[2] ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` } : null;
}
