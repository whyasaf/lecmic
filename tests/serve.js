// uygulamayı vercel.json'daki başlıklarla (CSP dahil) sunan bağımlılıksız küçük sunucu.
// testler canlı sitedeki güvenlik kurallarıyla çalışsın diye
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname, PORT = +process.env.PORT || 4173;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon' };
const rules = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8')).headers
  // vercel.json'daki "/vendor/(.*)" gibi kaynaklar: (.*) her şey, diğer noktalar düz nokta
  .map(h => ({ re:new RegExp('^' + h.source.split('(.*)').map(x => x.replace(/[.]/g, '\\.')).join('.*') + '$'), headers:h.headers }));

http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(ROOT, normalize(path === '/' ? '/index.html' : path));
  const headers = {};
  for (const r of rules) if (r.re.test(path)) for (const h of r.headers) headers[h.key] = h.value;
  try {
    if (!file.startsWith(ROOT)) throw 0;
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type':TYPES[extname(file)] || 'application/octet-stream', ...headers }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type':'text/html; charset=utf-8', ...headers }).end(await readFile(join(ROOT, '404.html')).catch(() => 'yok'));
  }
}).listen(PORT, () => console.log('http://localhost:' + PORT));
