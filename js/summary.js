// özet
const STOP = new Set(('a an the and or but if then so of to in on at for with by from as is are was were be been being it its this that these those i you he she we they my your our their me him her us them do does did have has had will would can could should may might not no yes just very also than too there here what which who whom how when where why about into over after before up down out off more most some any each other such only own same ' +
  've veya ama fakat ile için bir bu şu o da de ki mi mı mu mü ne çok daha en gibi kadar sonra önce olarak olan var yok ben sen biz siz onlar şey her hem ya yani ise değil bunu şunu onu bunun üzerinde içinde').split(/\s+/));
// dersi 5 dakika kadar süren bölümlere ayırır, sınır hep bir satırın başı
function sumSections(segs) {
  const len = segs.reduce((a, s) => a + s.en.length, 0);
  const n = Math.min(10, Math.max(1, Math.ceil(len / 5000))), size = len / n;
  const out = []; let from = 0, acc = 0;
  segs.forEach((s, i) => {
    acc += s.en.length;
    if (out.length < n - 1 && acc >= size * (out.length + 1)) { out.push([from, i + 1]); from = i + 1; }
  });
  if (from < segs.length) out.push([from, segs.length]);
  return out;
}
// satırlar cümle değil (ses dosyasından gelenler 5 saniyelik parça), noktalamaya göre tam cümle yapar
function sentencesOf(segs, from, to) {
  const out = []; let cur = null;
  for (let i = from; i < to; i++) {
    for (const p of segs[i].en.split(/(?<=[.!?…])\s+/)) {
      if (!cur) cur = { s:'', i, star:false };
      cur.s += (cur.s ? ' ' : '') + p; cur.star ||= segs[i].star;
      if (/[.!?…]["'”’)]*$/.test(p)) { out.push(cur); cur = null; }
    }
    if (cur && cur.s.length > 250) { out.push(cur); cur = null; } // noktalama hiç yoksa sonsuz cümle olmasın
  }
  if (cur) out.push(cur);
  return out;
}
// modelsiz yöntem: her bölümden sık geçen kelimeleri en çok içeren cümleleri seçer, yıldızlılara ekstra puan verir
function extractiveSummary(segs, secs) {
  const toks = t => (t.toLowerCase().match(/[\p{L}][\p{L}'’-]{2,}/gu) || []).filter(w => !STOP.has(w));
  const freq = new Map();
  segs.forEach(s => toks(s.en).forEach(w => freq.set(w, (freq.get(w) || 0) + 1)));
  const max = Math.max(1, ...freq.values()), per = Math.max(2, Math.round(12 / secs.length)), picked = [];
  // birbirine çok benzeyen cümleden biri yeter
  const same = (a, b) => { let c = 0; for (const w of a) if (b.has(w)) c++; return c / Math.min(a.size, b.size) > .6; };
  secs.forEach(([a, b], g) => {
    const scored = sentencesOf(segs, a, b).map(x => {
      const w = toks(x.s); if (w.length < 5) return { ...x, sc:0 }; // "okay so" gibi dolgu cümleler
      let sc = w.reduce((a, y) => a + freq.get(y) / max, 0) / Math.pow(w.length, 0.7);
      if (x.star) sc *= 1.8;
      return { ...x, sc, set:new Set(w) };
    }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc);
    const mine = [];
    for (const x of scored) { if (mine.length >= per) break; if (!picked.some(y => same(x.set, y.set))) { mine.push(x); picked.push(x); } }
    mine.forEach(x => x.g = g);
  });
  return picked.sort((a, b) => a.g - b.g || a.i - b.i).map(x => ({ s:x.s, g:x.g, i:x.i }));
}
async function chromeTr(from, to, setMsg) {
  try {
    if ('Translator' in self && (await Translator.availability({ sourceLanguage:from, targetLanguage:to })) !== 'unavailable')
      return await Translator.create({ sourceLanguage:from, targetLanguage:to,
        monitor: m => m.addEventListener('downloadprogress', e => setMsg('Dil paketi iniyor %' + Math.round(e.loaded * 100))) });
  } catch {}
  return null;
}
// uzun metin google'a tek seferde gitmiyor, parça parça
async function longTr(text, from, to, tr) {
  if (tr) { try { return await tr.translate(text); } catch {} }
  const out = [];
  for (const p of text.match(/[^]{1,1500}(?:\s|$)/g) || [text]) out.push(await translate(p.trim(), to, from));
  return out.join(' ');
}
// Chrome'un kendi özetleyicisi. sadece ingilizce bildiği için başka dildeki ders önce ingilizceye çevriliyor,
// çıkan maddeler geri çevriliyor. olmazsa nedenini döndürür
async function chromeSummary(l, secs, setMsg) {
  if (!('Summarizer' in self)) return 'Chrome yapay zekâsı bu tarayıcıda yok';
  const src = l.src || 'en';
  const opts = { type:'key-points', format:'plain-text', length:secs.length > 3 ? 'short' : 'medium', outputLanguage:'en', expectedInputLanguages:['en'], expectedContextLanguages:['en'] };
  if ((await Summarizer.availability(opts)) === 'unavailable') return 'Chrome yapay zekâsı bu cihazda kullanılamıyor';
  const sm = await Summarizer.create({ ...opts, sharedContext:'Transcript of a university lecture.',
    monitor: m => m.addEventListener('downloadprogress', e => setMsg('Özet modeli iniyor: %' + Math.round(e.loaded * 100))) });
  try {
    const toEn = src === 'en' ? null : await chromeTr(src, 'en', setMsg), fromEn = src === 'en' ? null : await chromeTr('en', src, setMsg);
    const max = Math.min(12000, Math.floor((sm.inputQuota || 4000) * 3)), pts = [];
    for (const [g, [a, b]] of secs.entries()) {
      const part = l.segs.slice(a, b), step = (g + 1) + '/' + secs.length + '...';
      let en;
      if (src === 'en') en = part.map(s => s.en).join(' ');
      else if (l.lang === 'en' && part.every(s => s.tr)) en = part.map(s => s.tr).join(' '); // çevirisi zaten var
      else { setMsg('Çevriliyor ' + step); en = await longTr(part.map(s => s.en).join(' '), src, 'en', toEn); }
      setMsg('Özetleniyor ' + step);
      for (let i = 0; i < en.length; i += max) {
        const out = await sm.summarize(en.slice(i, i + max), { context:'Part ' + (g + 1) + ' of ' + secs.length + ' of the lecture.' });
        out.split('\n').map(x => x.replace(/^[\s*\-•]+/, '').trim()).filter(x => x.length > 3).forEach(x => pts.push({ en:x, s:x, g, i:a }));
      }
    }
    if (src !== 'en') { setMsg('Özet çevriliyor...'); for (const p of pts) p.s = await longTr(p.en, 'en', src, fromEn); }
    return pts;
  } finally { sm.destroy(); }
}
// art arda aynı bölümdeki maddeler bir grup. eski özetlerde bölüm yok, hepsi tek grup
function sumGroups(pts) {
  const out = [];
  for (const p of pts) { const last = out[out.length - 1]; if (last && last.g === p.g) last.pts.push(p); else out.push({ g:p.g, i:p.i, pts:[p] }); }
  return out;
}
function sumHead(gr, n) {
  if (n < 2 || gr.g == null) return '';
  const seg = L().segs[gr.i];
  return T('Bölüm ' + (gr.g + 1)) + (seg && seg.t != null ? ' · ' + fmt(seg.t) : '');
}
function renderSummary() {
  const sm = L().summary, el = $('sumBody');
  $('sumNote').disabled = !sm;
  $('sumEngine').hidden = !sm;
  $('sumDel').hidden = !sm;
  $('sumGo').textContent = sm ? 'Yeniden özetle' : 'Özet çıkar'; // basınca eskisi silinip baştan yapılıyor
  if (!sm) { el.innerHTML = '<div class="empty">Dersin transkriptinden önemli noktaları çıkarır. Önemli diye yıldızladığın cümleler daha çok öne çıkar. Önce biraz transkript olmalı.</div>'; return; }
  $('sumEngine').textContent = sm.by === 'chrome' ? 'Chrome yapay zekâsı' : 'Yerel yöntem';
  $('sumEngine').className = 'pill ' + (sm.by === 'chrome' ? 'ok' : 'warn');
  $('sumEngine').title = sm.why || '';
  const dir = L().lang === 'ur' ? 'rtl' : 'ltr', groups = sumGroups(sm.pts);
  el.innerHTML = (sm.why && sm.by !== 'chrome' ? '<div class="sumwhy">' + esc(sm.why) + '</div>' : '') + groups.map(gr => {
    const seg = L().segs[gr.i], head = sumHead(gr, groups.length);
    // bölüm saatine tıklayınca kaydın o yeri çalar
    return (head ? '<div class="sumsec">' + (seg && seg.t != null && seg.rec ? '<button class="sumt" data-i="' + gr.i + '">' + esc(head) + '</button>' : esc(head)) + '</div>' : '')
      + '<ul>' + gr.pts.map(p => '<li>' + esc(p.s) + (p.t ? '<span class="st" dir="' + dir + '">' + esc(p.t) + '</span>' : '') + '</li>').join('') + '</ul>';
  }).join('');
}
$('sumBody').addEventListener('click', e => { const b = e.target.closest('.sumt'); if (b && L().segs[+b.dataset.i]) playSeg(L().segs[+b.dataset.i]); });
let summing = false;
$('sumGo').onclick = async () => {
  const l = L();
  if (summing) return;
  if (l.segs.length < 3) { toast('Özet için biraz daha transkript lazım'); return; }
  summing = true; $('sumGo').disabled = true;
  const msg = t => { $('sumBody').innerHTML = '<div class="empty">' + esc(t) + '</div>'; };
  msg('Özet hazırlanıyor...');
  const secs = sumSections(l.segs);
  let pts = null, by = 'local', why = '';
  try {
    const r = await chromeSummary(l, secs, msg);
    if (typeof r === 'string') why = r; else if (r.length) { pts = r; by = 'chrome'; }
  } catch (e) { console.warn(e); why = 'Chrome yapay zekâsı hata verdi: ' + (e.message || e.name); }
  if (!pts) pts = extractiveSummary(l.segs, secs);
  l.summary = { pts:pts.map(p => ({ s:p.s, en:p.en, t:null, g:p.g, i:p.i })), by, why, at:Date.now() };
  save(); renderSummary();
  if (trOn) {
    const src = l.src || 'en';
    for (const p of l.summary.pts) {
      try { p.t = p.en && l.lang === 'en' ? p.en : await translate(p.en || p.s, l.lang, p.en ? 'en' : src); } catch {}
      if (L() === l) renderSummary();
    }
    save();
  }
  summing = false; $('sumGo').disabled = false;
};
$('sumDel').onclick = () => {
  if (summing || !L().summary || !confirm(T('Özet silinsin mi?'))) return;
  L().summary = null; save(); renderSummary();
};
$('sumNote').onclick = () => {
  const sm = L().summary; if (!sm) return;
  const groups = sumGroups(sm.pts);
  appendToNotes('<h3>Özet</h3>' + groups.map(gr => { const head = sumHead(gr, groups.length);
    return (head ? '<p><b>' + esc(head) + '</b></p>' : '') + '<ul>' + gr.pts.map(p => '<li>' + esc(p.s) + (p.t ? '<br><i>' + esc(p.t) + '</i>' : '') + '</li>').join('') + '</ul>'; }).join('') + '<div><br></div>');
  toast('Özet nota eklendi');
};
