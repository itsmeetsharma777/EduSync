import assert from 'node:assert/strict';
import test from 'node:test';
import { parseYouTubeUrl } from './youtube.js';

const id = 'dQw4w9WgXcQ';

test('accepts supported YouTube URL formats and canonicalizes them', () => {
  for (const value of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
  ]) {
    assert.deepEqual(parseYouTubeUrl(value), { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` });
  }
});

test('rejects unsafe, unsupported, and malformed video URLs', () => {
  for (const value of ['http://youtube.com/watch?v=dQw4w9WgXcQ', 'https://example.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'https://youtu.be/not-an-id']) {
    assert.equal(parseYouTubeUrl(value), null);
  }
});
