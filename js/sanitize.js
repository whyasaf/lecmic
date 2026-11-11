// @ts-check
// dışarıdan gelen veriyi temizleme. saf fonksiyonlar: ekrana dokunmaz, sadece girdi alıp temiz çıktı verir,
// bu yüzden tests/unit altında tarayıcısız test edilir. kullandıkları: DOMPurify (vendor), esc, SRC, LANGS (core.js), T (i18n.js)

// dışarıdan gelen HTML (notlar, yapıştırılan içerik, Word belgesi, yedek) temizlenir:
// betik, olay özniteliği, javascript: bağlantısı kalmaz. notlarda resim de olmaz, yer kaplamasın
const NOTE_TAGS = ['p', 'div', 'br', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'mark', 'font', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'input', 'a', 'code', 'pre'];
function cleanHTML(html, doc) {
  html = String(html || '');
  if (typeof DOMPurify === 'undefined') return esc(new DOMParser().parseFromString(html, 'text/html').body.textContent || '');
  if (doc) return DOMPurify.sanitize(html, { FORBID_TAGS:['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe'] });
  const frag = DOMPurify.sanitize(html, { ALLOWED_TAGS:NOTE_TAGS, ALLOWED_ATTR:['style', 'type', 'checked', 'href', 'dir', 'color'], RETURN_DOM_FRAGMENT:true });
  // notlardaki tek giriş kutusu yapılacaklar kutusu
  frag.querySelectorAll('input').forEach(x => { if (x.type !== 'checkbox') x.remove(); });
  frag.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  const d = document.createElement('div'); d.append(frag); return d.innerHTML;
}

// yedekten gelen veri olduğu gibi alınmaz. başkasının paylaştığı bir yedek de olabilir:
// kimlikler, dil kodları ve alan türleri kontrol edilir, notlar temizlenir, ses sadece dosyanın içinden (data:) alınır
const ID_RE = /^[a-z0-9]{1,40}$/i;
// test() yazı olmayanı yazıya çevirir: undefined "undefined" olur ve kurala uyar. önce türüne bakılmalı
const validId = v => typeof v === 'string' && ID_RE.test(v);
const str = (v, d = '') => typeof v === 'string' ? v : d;
const num = v => typeof v === 'number' && isFinite(v) ? v : null;
const arr = v => Array.isArray(v) ? v : [];
const isData = v => typeof v === 'string' && /^data:[\w.+-]+\/[\w.+-]+(;[\w=.+-]+)*;base64,/.test(v);
function cleanLesson(l) {
  if (!l || typeof l !== 'object' || !validId(l.id)) return null;
  const src = SRC[l.src] ? l.src : 'en', lang = LANGS[l.lang] && l.lang !== src ? l.lang : src === 'tr' ? 'en' : 'tr';
  const out = {
    id:l.id, title:str(l.title, T('Kurtarılan kayıt')).slice(0, 200), created:num(l.created) || Date.now(), src, lang,
    segs:arr(l.segs).filter(s => s && typeof s.en === 'string').map(s => ({ en:s.en, tr:typeof s.tr === 'string' ? s.tr : null, t:num(s.t), rec:validId(s.rec) ? s.rec : undefined, star:!!s.star })),
    notes:cleanHTML(l.notes),
    vocab:arr(l.vocab).filter(v => v && typeof v.w === 'string').map(v => ({ w:v.w, m:str(v.m), ex:str(v.ex), box:Math.min(4, Math.max(0, num(v.box) || 0)), due:num(v.due) || undefined })),
    recs:arr(l.recs).filter(r => r && validId(r.id)).map(r => ({ id:r.id, dur:num(r.dur) || 0, mime:/^[\w.+-]+\/[\w.+-]+$/.test(r.mime) ? r.mime : 'audio/mpeg', name:typeof r.name === 'string' ? r.name.slice(0, 120) : undefined, ext:/^\.\w{1,5}$/.test(r.ext) ? r.ext : undefined }))
  };
  if (validId(l.folder)) out.folder = l.folder;
  if (l.kind === 'doc' && l.doc && ['pdf', 'docx', 'img'].includes(l.doc.type)) {
    out.kind = 'doc'; out.doc = { name:str(l.doc.name).slice(0, 200), type:l.doc.type, scale:num(l.doc.scale) || undefined };
    // fotoğraf belgesi: sayfa sayısı ve her sayfanın boyu (iki pozitif sayı)
    if (l.doc.type === 'img') {
      const dims = arr(l.doc.dims).slice(0, MAX_PAGES).filter(d => Array.isArray(d) && d.length === 2 && d.every(x => num(x) > 0 && x < 20000)).map(d => [num(d[0]), num(d[1])]);
      out.doc.dims = dims; out.doc.pages = Math.max(1, Math.min(MAX_PAGES, dims.length || num(l.doc.pages) || 1));
    }
    out.marks = arr(l.marks).filter(m => m && validId(m.id)).map(m => ({ id:m.id, p:num(m.p) || 0, s:num(m.s) || 0, e:num(m.e) || 0, r:arr(m.r).filter(x => Array.isArray(x) && x.length === 2 && x.every(n => typeof n === 'number')), t:str(m.t), tr:str(m.tr), c:MARK_COLORS.includes(m.c) ? m.c : 'y' }));
  }
  if (l.summary && Array.isArray(l.summary.pts)) out.summary = { pts:l.summary.pts.filter(p => p && typeof p.s === 'string').map(p => ({ s:p.s, en:str(p.en), t:typeof p.t === 'string' ? p.t : null, g:num(p.g) || 0, i:num(p.i) || 0 })), by:l.summary.by === 'chrome' ? 'chrome' : 'local', why:str(l.summary.why), at:num(l.summary.at) || Date.now() };
  return out;
}
const MARK_COLORS = ['y', 'g', 'p'];
const MAX_PAGES = 300;
// yedeğin tamamı: temiz dersler, temiz klasörler ve sadece kalan kayıtlara ait, dosyanın içindeki (data:) sesler.
// yedek değilse null
function cleanBackup(j) {
  if (!j || typeof j !== 'object' || j.app !== 'ders-asistani' || !j.db || !Array.isArray(j.db.lessons)) return null;
  const src = j.audio && typeof j.audio === 'object' ? j.audio : {}, audio = {};
  const lessons = j.db.lessons.map(cleanLesson).filter(Boolean);
  for (const l of lessons) {
    for (const r of l.recs) { const k = l.id + ':' + r.id; if (isData(src[k])) audio[k] = src[k]; }
    // sesi yedekte olmayan kayıt listede kalmasın
    l.recs = l.recs.filter(r => audio[l.id + ':' + r.id]);
    if (l.doc) for (let i = 0; i < (l.doc.type === 'img' ? l.doc.pages : 1); i++) { const dk = l.id + ':doc' + (i ? '.' + i : ''); if (isData(src[dk])) audio[dk] = src[dk]; }
  }
  const folders = arr(j.db.folders).filter(f => f && validId(f.id)).map(f => ({ id:f.id, title:str(f.title, T('Adsız ders')).slice(0, 200), created:num(f.created) || Date.now(), open:!!f.open }));
  return { lessons, folders, audio };
}
