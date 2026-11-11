// videoyu kare kare çeker ve ffmpeg ile MP4 yapar. bilgisayardaki Chrome'u kullanır, tarayıcı indirmez.
//   node render.mjs                     dikey ve yatay, Türkçe
//   node render.mjs --lang en --size v  sadece dikey, İngilizce
//   node render.mjs --stills 1,4.5,9    sadece o saniyelerin PNG'leri (hızlı önizleme)
//   node render.mjs --from 6 --to 13    bir aralık
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LANG = arg('lang', 'tr'), SIZE = arg('size', 'both'), FPS = +arg('fps', 60);
const STILLS = arg('stills', '') ? arg('stills').split(',').map(Number) : null;
const SIZES = { v:[1080, 1920], h:[1920, 1080] };
const ROOT = new URL('..', import.meta.url).pathname, OUT = join(ROOT, 'video/out');

// küçük sunucu: yazı tipleri ../vendor/fonts'tan gelsin diye file:// yerine
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png' };
const srv = http.createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { const b = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type':TYPES[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = srv.address().port;

await mkdir(OUT, { recursive:true });
const browser = await chromium.launch({ channel:'chrome' });
for (const key of SIZE === 'both' ? ['v', 'h'] : [SIZE]) {
  const [w, h] = SIZES[key];
  const page = await browser.newPage({ viewport:{ width:w, height:h }, deviceScaleFactor:1 });
  page.on('pageerror', e => console.error('sayfa hatası:', e.message));
  await page.goto(`http://localhost:${port}/video/index.html?render&w=${w}&h=${h}&lang=${LANG}`);
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DURATION);
  const name = `lecmic-${LANG}-${key === 'v' ? '9x16' : '16x9'}`;
  if (STILLS) {
    for (const t of STILLS) {
      await page.evaluate(t => window.seek(t), t);
      await writeFile(join(OUT, `${name}-${t}s.png`), await page.screenshot({ type:'png' }));
    }
    console.log(name, 'önizlemeler hazır');
    await page.close(); continue;
  }
  const from = +arg('from', 0), to = Math.min(+arg('to', dur), dur), frames = Math.round((to - from) * FPS);
  const file = join(OUT, name + (arg('from') || arg('to') ? `-${from}-${to}` : '') + '.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', file], { stdio:['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.seek(t), from + i / FPS);
    const png = await page.screenshot({ type:'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % FPS === 0) process.stdout.write(`\r${name}: ${Math.round(i / frames * 100)}%  `);
  }
  ff.stdin.end(); await done;
  console.log(`\r${name}: bitti, ${frames} kare, ${((Date.now() - t0) / 1000).toFixed(0)} sn → ${file}`);
  await page.close();
}
await browser.close(); srv.close();
