// özet
const STOP = new Set(('a an the and or but if then so of to in on at for with by from as is are was were be been being it its this that these those i you he she we they my your our their me him her us them do does did have has had will would can could should may might not no yes just very also than too there here what which who whom how when where why about into over after before up down out off more most some any each other such only own same ' +
  've veya ama fakat ile için bir bu şu o da de ki mi mı mu mü ne çok daha en gibi kadar sonra önce olarak olan var yok ben sen biz siz onlar şey her hem ya yani ise değil bunu şunu onu bunun üzerinde içinde').split(/\s+/));
// modelsiz yöntem: sık geçen kelimelere göre cümleleri puanlar, yıldızlılara ekstra puan verir
function extractiveSummary(segs) {
  const toks = t => (t.toLowerCase().match(/[\p{L}][\p{L}'’-]{2,}/gu) || []).filter(w => !STOP.has(w));
  const freq = new Map();
  segs.forEach(s => toks(s.en).forEach(w => freq.set(w, (freq.get(w) || 0) + 1)));
  const max = Math.max(1, ...freq.values());
  const scored = segs.map((s, i) => {
    const w = toks(s.en); if (w.length < 3) return { i, sc:0 };
    let sc = w.reduce((a, x) => a + freq.get(x) / max, 0) / Math.pow(w.length, 0.7);
    if (s.star) sc *= 1.8;
    return { i, sc };
  });
  const k = Math.max(3, Math.min(12, Math.round(segs.length * 0.18)));
  return scored.filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, k).sort((a, b) => a.i - b.i).map(x => segs[x.i].en);
}
// Chrome'un kendi özetleyicisi, varsa
async function chromeSummary(text, setMsg) {
  if (!('Summarizer' in self)) return null;
  const opts = { type:'key-points', format:'plain-text', length:'medium', outputLanguage:'en', expectedInputLanguages:['en'], expectedContextLanguages:['en'] };
  if ((await Summarizer.availability(opts)) === 'unavailable') return null;
  const sm = await Summarizer.create({ ...opts, sharedContext:'Transcript of a university lecture.',
    monitor: m => m.addEventListener('downloadprogress', e => setMsg('Özet modeli iniyor: %' + Math.round(e.loaded * 100))) });
  const max = Math.min(12000, Math.floor((sm.inputQuota || 4000) * 3));
  const chunks = []; for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
  const parts = [];
  for (const [i, c] of chunks.entries()) { setMsg('Özetleniyor ' + (i + 1) + '/' + chunks.length + '...'); parts.push(await sm.summarize(c)); }
  let out = parts.join('\n');
  if (parts.length > 1 && out.length < max) out = await sm.summarize(out);
  sm.destroy();
  return out.split('\n').map(x => x.replace(/^[\s*\-•]+/, '').trim()).filter(x => x.length > 3);
}
function renderSummary() {
  const sm = L().summary, el = $('sumBody');
  $('sumNote').disabled = !sm;
  $('sumEngine').hidden = !sm;
  if (!sm) { el.innerHTML = '<div class="empty">Dersin transkriptinden önemli noktaları çıkarır. Önemli diye yıldızladığın cümleler daha çok öne çıkar. Önce biraz transkript olmalı.</div>'; return; }
  $('sumEngine').textContent = sm.by === 'chrome' ? 'Chrome yapay zekâsı' : 'Yerel yöntem';
  $('sumEngine').className = 'pill ' + (sm.by === 'chrome' ? 'ok' : 'warn');
  el.innerHTML = '<ul>' + sm.pts.map(p => '<li>' + esc(p.s) + (p.t ? '<span class="st" dir="' + (L().lang === 'ur' ? 'rtl' : 'ltr') + '">' + esc(p.t) + '</span>' : '') + '</li>').join('') + '</ul>';
}
let summing = false;
$('sumGo').onclick = async () => {
  const l = L();
  if (summing) return;
  if (l.segs.length < 3) { toast('Özet için biraz daha transkript lazım'); return; }
  summing = true; $('sumGo').disabled = true;
  const msg = t => { $('sumBody').innerHTML = '<div class="empty">' + esc(t) + '</div>'; };
  msg('Özet hazırlanıyor...');
  let pts = null, by = 'local';
  if ((l.src || 'en') === 'en') { try { pts = await chromeSummary(l.segs.map(s => s.en).join(' '), msg); if (pts && pts.length) by = 'chrome'; else pts = null; } catch (e) { console.warn(e); pts = null; } }
  if (!pts) pts = extractiveSummary(l.segs);
  l.summary = { pts:pts.map(s => ({ s, t:null })), by, at:Date.now() };
  save(); renderSummary();
  if (trOn) {
    for (const p of l.summary.pts) { try { p.t = await translate(p.s, l.lang, l.src || 'en'); } catch {} if (L() === l) renderSummary(); }
    save();
  }
  summing = false; $('sumGo').disabled = false;
};
$('sumNote').onclick = () => {
  const sm = L().summary; if (!sm) return;
  appendToNotes('<h3>Özet</h3><ul>' + sm.pts.map(p => '<li>' + esc(p.s) + (p.t ? '<br><i>' + esc(p.t) + '</i>' : '') + '</li>').join('') + '</ul><div><br></div>');
  toast('Özet nota eklendi');
};
