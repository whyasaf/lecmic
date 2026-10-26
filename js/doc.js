// belge okuma (PDF / Word)
const PDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const MKCOL = { y:'#f5c400', g:'#3dbb78', p:'#ee6fa0' };
const DOC = { type:'', pdf:null, pages:[], scale:1, io:null, token:0 };
let reattachFor = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('script'));
    document.head.appendChild(s);
  });
}
const textRoot = pgEl => pgEl.querySelector('.textLayer') || pgEl;
const cleanText = t => t.replace(/-\s*\n\s*/g, '').replace(/\s+/g, ' ').trim();

// işaretlerin yerini sayfadaki harf sırasıyla tutuyoruz, böylece yakınlaştırınca bozulmuyor
function rangeFor(pgEl, s, e) {
  const w = document.createTreeWalker(textRoot(pgEl), NodeFilter.SHOW_TEXT);
  let pos = 0, sn, so, en, eo;
  while (w.nextNode()) {
    const n = w.currentNode, len = n.nodeValue.length;
    if (sn === undefined && s < pos + len) { sn = n; so = s - pos; }
    if (sn !== undefined && e <= pos + len) { en = n; eo = e - pos; break; }
    pos += len;
  }
  if (!sn || !en) return null;
  const r = document.createRange();
  r.setStart(sn, so); r.setEnd(en, eo);
  return r;
}
function applyMarks() {
  if (!window.CSS || !CSS.highlights) return;
  const by = { y:[], g:[], p:[] };
  for (const m of L().marks || []) {
    const pg = DOC.pages[m.p];
    if (!pg || !pg.done) continue;
    for (const [a, z] of m.r || [[m.s, m.e]]) { const r = rangeFor(pg.el, a, z); if (r) by[m.c].push(r); }
  }
  for (const c of ['y', 'g', 'p']) {
    if (by[c].length) CSS.highlights.set('lm-' + c, new Highlight(...by[c]));
    else CSS.highlights.delete('lm-' + c);
  }
}

function teardownDoc() {
  if (DOC.io) DOC.io.disconnect();
  if (DOC.pdf) { try { DOC.pdf.destroy(); } catch {} }
  DOC.pdf = null; DOC.pages = []; DOC.type = '';
  $('docPages').innerHTML = ''; $('docTotal').textContent = '0'; $('docPage').value = '';
  if (window.CSS && CSS.highlights) ['y', 'g', 'p'].forEach(c => CSS.highlights.delete('lm-' + c));
  hideSelbar(); hideTip();
}
function applyKind() {
  const doc = L().kind === 'doc';
  $('app').dataset.kind = doc ? 'doc' : 'rec';
  document.querySelector('#mtabs [data-mtab=trans]').textContent = doc ? 'Belge' : 'Transkript';
  document.querySelector('label[for=src]').textContent = doc ? 'Belge dili' : 'Konuşulan dil';
  const mt = $('app').dataset.mtab;
  if ((doc && mt === 'sum') || (!doc && mt === 'marks')) setMTab('trans');
  const on = document.querySelector('.tab.on');
  if (on && ((doc && on.dataset.tab === 'sum') || (!doc && on.dataset.tab === 'marks'))) showTab('notes');
}
async function loadDoc() {
  teardownDoc();
  const l = L(), token = ++DOC.token;
  if (l.kind !== 'doc') return;
  $('docName').textContent = l.doc ? l.doc.name : '';
  const blob = await idbDo('audio', 'readonly', s => s.get(l.id + ':doc'));
  if (token !== DOC.token) return;
  if (!blob) {
    $('docPages').innerHTML = '<div class="empty" style="padding:20px">Bu dersin belge dosyası bulunamadı (yedekte sadece yazılar olabilir). İşaretlerin ve notların duruyor. Dosyayı yeniden seçersen işaretler yerine oturur.<br><br><button class="btn primary sm" id="docReattach">Dosyayı seç</button></div>';
    $('docReattach').onclick = () => { reattachFor = l.id; $('docFile').click(); };
    return;
  }
  try {
    if (l.doc.type === 'docx') await openDocx(blob, token); else await openPdf(blob, token);
  } catch (e) {
    console.error(e);
    if (token === DOC.token) $('docPages').innerHTML = '<div class="empty" style="padding:20px">Belge açılamadı: ' + esc(e.message || e.name || '') + '</div>';
  }
}

async function openPdf(blob, token) {
  await loadScript(PDF_CDN + 'pdf.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CDN + 'pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data:new Uint8Array(await blob.arrayBuffer()) }).promise;
  if (token !== DOC.token) { pdf.destroy(); return; }
  DOC.pdf = pdf; DOC.type = 'pdf';
  $('docTotal').textContent = pdf.numPages;
  const first = await pdf.getPage(1);
  DOC.scale = L().doc.scale || fitScale(first.getViewport({ scale:1 }).width);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < pdf.numPages; i++) {
    const page = i === 0 ? first : await pdf.getPage(i + 1);
    if (token !== DOC.token) return;
    const el = document.createElement('div');
    el.className = 'pg'; el.dataset.p = i;
    const pg = { el, page, done:false, busy:false };
    DOC.pages.push(pg); sizePage(pg); frag.appendChild(el);
  }
  $('docPages').appendChild(frag);
  $('docPage').value = 1;
  watchPages();
}
async function openDocx(blob, token) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  const r = await mammoth.convertToHtml({ arrayBuffer:await blob.arrayBuffer() });
  if (token !== DOC.token) return;
  const el = document.createElement('div');
  el.className = 'pg docx'; el.dataset.p = 0; el.innerHTML = r.value;
  DOC.type = 'docx'; DOC.scale = L().doc.scale || 1;
  el.style.zoom = DOC.scale;
  DOC.pages = [{ el, done:true }];
  $('docPages').appendChild(el);
  $('docTotal').textContent = '1'; $('docPage').value = 1;
  applyMarks();
}
function fitScale(pageWidth) {
  const w = $('docBody').clientWidth;
  return Math.min(2.5, Math.max(.6, ((w > 100 ? w : innerWidth) - 32) / pageWidth));
}
function sizePage(pg) {
  const vp = pg.page.getViewport({ scale:DOC.scale });
  pg.el.style.width = vp.width + 'px'; pg.el.style.height = vp.height + 'px';
}
// sayfalar ekrana yaklaşınca çizilir, yüzlerce sayfalık dosyada tarayıcı yorulmasın
function watchPages() {
  if (DOC.io) DOC.io.disconnect();
  DOC.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) renderPdfPage(+e.target.dataset.p); }), { root:$('docBody'), rootMargin:'900px 0px' });
  DOC.pages.forEach(pg => DOC.io.observe(pg.el));
}
async function renderPdfPage(i) {
  const pg = DOC.pages[i], token = DOC.token;
  if (!pg || pg.done || pg.busy || DOC.type !== 'pdf') return;
  pg.busy = true;
  try {
    const vp = pg.page.getViewport({ scale:DOC.scale }), dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
    await pg.page.render({ canvasContext:canvas.getContext('2d'), viewport:vp, transform:dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    const tl = document.createElement('div');
    tl.className = 'textLayer';
    tl.style.setProperty('--scale-factor', vp.scale); // pdf.js yazı boyutunu buradan hesaplıyor, yoksa yazı katmanı görünen metinle örtüşmüyor
    await pdfjsLib.renderTextLayer({ textContentSource:await pg.page.getTextContent(), container:tl, viewport:vp, textDivs:[] }).promise;
    if (token !== DOC.token || DOC.pages[i] !== pg) return;
    pg.el.innerHTML = ''; pg.el.append(canvas, tl);
    pg.done = true;
    applyMarks();
  } finally { pg.busy = false; }
}
function setScale(s) {
  if (!DOC.pages.length) return;
  const body = $('docBody'), ratio = body.scrollTop / Math.max(1, body.scrollHeight);
  DOC.scale = Math.min(3, Math.max(.4, s));
  L().doc.scale = DOC.scale; save();
  hideSelbar(); hideTip();
  if (DOC.type === 'docx') DOC.pages[0].el.style.zoom = DOC.scale;
  else {
    DOC.pages.forEach(pg => { pg.el.innerHTML = ''; pg.done = false; pg.busy = false; sizePage(pg); });
    watchPages();
  }
  body.scrollTop = ratio * body.scrollHeight;
}
$('docPlus').onclick = () => setScale(DOC.scale * 1.15);
$('docMinus').onclick = () => setScale(DOC.scale / 1.15);
$('docFit').onclick = () => { if (DOC.pages.length) setScale(DOC.type === 'pdf' ? fitScale(DOC.pages[0].page.getViewport({ scale:1 }).width) : 1); };
$('docBody').addEventListener('scroll', () => {
  hideTip();
  const st = $('docBody').scrollTop + 60;
  let cur = 0;
  for (let i = 0; i < DOC.pages.length; i++) if (DOC.pages[i].el.offsetTop + DOC.pages[i].el.offsetHeight > st) { cur = i; break; }
  if (DOC.pages.length && document.activeElement !== $('docPage')) $('docPage').value = cur + 1;
});
$('docPage').onchange = () => {
  if (!DOC.pages.length) return;
  const n = Math.min(DOC.pages.length, Math.max(1, parseInt($('docPage').value) || 1));
  $('docBody').scrollTop = DOC.pages[n - 1].el.offsetTop - 12;
};

// kelimenin üstüne gelince anlamı
let hoverT = null, lastWord = '';
const hideTip = () => { $('tip').hidden = true; lastWord = ''; };
$('docHover').checked = lsGet('ders-dochover', '0') === '1';
$('docHover').onchange = () => { lsSet('ders-dochover', $('docHover').checked ? '1' : '0'); hideTip(); };
function caretAt(x, y) {
  const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
  if (!r || r.startContainer.nodeType !== 3 || !$('docBody').contains(r.startContainer)) return null;
  return r;
}
function wordAt(x, y) {
  const r = caretAt(x, y);
  if (!r) return null;
  const n = r.startContainer, re = /[\p{L}][\p{L}'’\-]*/gu;
  let m;
  while ((m = re.exec(n.nodeValue))) {
    if (r.startOffset < m.index || r.startOffset > m.index + m[0].length) continue;
    const rg = document.createRange();
    rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
    const b = rg.getBoundingClientRect();
    if (x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 2 && y <= b.bottom + 2) return { w:m[0], rect:b };
  }
  return null;
}
async function hoverWord(x, y) {
  if (!getSelection().isCollapsed) return;
  const hit = wordAt(x, y), tip = $('tip');
  if (!hit || hit.w.length < 2) return hideTip();
  if (lastWord === hit.w && !tip.hidden) return;
  lastWord = hit.w;
  const l = L();
  tip.dir = l.lang === 'ur' ? 'rtl' : 'ltr';
  tip.innerHTML = '<b>' + esc(hit.w) + '</b><br>...';
  tip.hidden = false;
  tip.style.left = Math.max(8, Math.min(innerWidth - 280, hit.rect.left)) + 'px';
  tip.style.top = (hit.rect.bottom + 6) + 'px';
  let m;
  try { m = await translateWord(hit.w, l.lang); } catch { m = '(çeviri alınamadı)'; }
  if (lastWord === hit.w) tip.innerHTML = '<b>' + esc(hit.w) + '</b><br>' + esc(m);
}
$('docBody').addEventListener('mousemove', e => {
  clearTimeout(hoverT);
  if (!$('docHover').checked || !trOn || e.buttons) return;
  hoverT = setTimeout(() => hoverWord(e.clientX, e.clientY), 380);
});
$('docBody').addEventListener('mouseleave', () => { clearTimeout(hoverT); hideTip(); });
$('docBody').addEventListener('mousedown', () => { clearTimeout(hoverT); hideTip(); });

// sütunlar, hiç yazı geçmeyen dikey boşluklardan bulunur. yan kutudaki sözlükçe gibi metinler seçime karışmasın diye
const rectOf = n => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect(); };
function textNodesOf(pgEl) {
  const all = [], w = document.createTreeWalker(textRoot(pgEl), NodeFilter.SHOW_TEXT);
  let o = 0, i = 0;
  while (w.nextNode()) { const n = w.currentNode; all.push({ n, o, i:i++ }); o += n.nodeValue.length; }
  return all;
}
function columnCuts(pgEl) {
  const pr = pgEl.getBoundingClientRect(), B = 4, nb = Math.ceil(pr.width / B) + 1;
  const cover = new Array(nb).fill(0), spans = [];
  for (const { n } of textNodesOf(pgEl)) {
    if (!n.nodeValue.trim()) continue;
    const r = rectOf(n);
    if (r.width <= 0) continue;
    const a = r.left - pr.left, b = r.right - pr.left;
    spans.push([a, b]);
    for (let i = Math.max(0, Math.floor(a / B)); i <= Math.min(nb - 1, Math.floor(b / B)); i++) cover[i]++;
  }
  const lim = Math.floor(spans.length * .02), cuts = [];
  let run = -1;
  for (let i = 0; i <= nb; i++) {
    const free = i < nb && cover[i] <= lim;
    if (free && run < 0) run = i;
    else if (!free && run >= 0) {
      const x0 = run * B, x1 = i * B;
      if (x1 - x0 >= 12) {
        const left = spans.filter(s => s[1] <= x0 + B).length, right = spans.filter(s => s[0] >= x1 - B).length;
        if (left >= 2 && right >= 2) cuts.push((x0 + x1) / 2);
      }
      run = -1;
    }
  }
  return { left:pr.left, cuts };
}
const colOf = (r, cc) => { const cx = (r.left + r.right) / 2 - cc.left; return cc.cuts.filter(c => c < cx).length; };
const newLine = (a, b) => Math.abs(a.top - b.top) > Math.min(a.height, b.height) * .5;

// seçili aralığın parçaları, sadece başladığı sütundan
function partsOf(range) {
  const el = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
  const pgEl = el && el.closest && el.closest('.pg');
  if (!pgEl) return [];
  const hit = textNodesOf(pgEl).filter(x => range.intersectsNode(x.n));
  const ref = hit.find(x => x.n.nodeValue.slice(x.n === range.startContainer ? range.startOffset : 0).trim());
  if (!ref) return [];
  const cc = columnCuts(pgEl), col = colOf(rectOf(ref.n), cc), parts = [];
  for (const x of hit) {
    const s = x.n === range.startContainer ? range.startOffset : 0, e = x.n === range.endContainer ? range.endOffset : x.n.nodeValue.length;
    if (e <= s) continue;
    const r = rectOf(x.n);
    if (r.width === 0 || colOf(r, cc) === col) parts.push({ n:x.n, s, e, o:x.o, i:x.i, r });
  }
  return parts;
}
// parçaları metne çevirir. aynı satırdakiler bitişik yazılır (PDF boşlukları zaten koyuyor), satır değişince boşluk konur. satır sonu tiresi (long-term) korunur
function joinParts(parts) {
  let t = '', prev = null;
  for (const p of parts) {
    const piece = p.n.nodeValue.slice(p.s, p.e);
    if (prev && newLine(prev.r, p.r) && !/\s$/.test(t) && !/^\s/.test(piece)) {
      if (!/\p{L}-$/u.test(t)) t += ' ';
    }
    t += piece;
    if (piece.trim()) prev = p;
  }
  return t.replace(/\s+/g, ' ').replace(/(\p{L})- (?=\p{Ll})/gu, '$1-').trim();
}
// tıklanan yerin cümlesi. satır sonu cümle sonu sayılmasın diye sınırı kendimiz buluyoruz
function sentenceParts(node, off) {
  const pgEl = node.parentElement && node.parentElement.closest('.pg');
  if (!pgEl || !node.nodeValue.trim()) return null;
  const cc = columnCuts(pgEl), col = colOf(rectOf(node), cc), blk = x => x.parentElement.closest('p,li,h1,h2,h3,h4,h5,tr');
  const list = textNodesOf(pgEl).map(x => ({ ...x, r:rectOf(x.n) })).filter(x => x.r.width === 0 || colOf(x.r, cc) === col);
  const solid = list.filter(x => x.r.width && x.n.nodeValue.trim());
  const colL = Math.min(...solid.map(x => x.r.left)), colR = Math.max(...solid.map(x => x.r.right));
  const font = n => getComputedStyle(n.parentElement).fontFamily;
  // başlık gibi satırlar: yazı boyu ya da tipi değişiyor, ya da satır noktalamasız ve erken bitip alttaki büyük harfle başlıyor
  const heading = (a, b) => {
    const h = Math.max(a.r.height, b.r.height) / Math.min(a.r.height, b.r.height);
    if (h > 1.15 || font(a.n) !== font(b.n)) return true;
    return colR - a.r.right > (colR - colL) * .15 && !/[.!?:;,\-–]["'”’)\]]*\s*$/.test(text) && /^\s*["“(\[]?[A-Z0-9]/.test(b.n.nodeValue);
  };
  let text = '', prev = null;
  for (const x of list) {
    if (prev && x.n.nodeValue.trim()) {
      if (blk(prev.n) !== blk(x.n) || x.r.top - prev.r.bottom > prev.r.height * .6 || (newLine(prev.r, x.r) && heading(prev, x))) text += '\n';
      else if (newLine(prev.r, x.r) && !/\s$/.test(text)) text += ' ';
    }
    x.start = text.length;
    text += x.n.nodeValue;
    if (x.n.nodeValue.trim()) prev = x;
  }
  const hit = list.find(x => x.n === node);
  if (!hit) return null;
  const idx = hit.start + off, ends = [0];
  for (const m of text.matchAll(/[.!?]["'”’)\]]*(?=\s+["“(\[]?[A-Z0-9])|\n/g)) ends.push(m.index + m[0].length);
  ends.push(text.length);
  let s = 0, e = text.length;
  for (const x of ends) { if (x <= idx) s = x; else { e = x; break; } }
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  if (e - s < 2 || e - s > 1500) return null;
  const parts = [];
  for (const x of list) {
    const a = Math.max(s, x.start), z = Math.min(e, x.start + x.n.nodeValue.length);
    if (z > a) parts.push({ n:x.n, s:a - x.start, e:z - x.start, o:x.o, i:x.i, r:x.r });
  }
  return parts;
}
// art arda gelen parçalar tek aralık olur, vurgu kelime kelime bölük görünmesin
function rangesOf(parts) {
  const out = [];
  let r = null, last = null;
  for (const p of parts) {
    if (r && last.i === p.i - 1) r.setEnd(p.n, p.e);
    else { r = document.createRange(); r.setStart(p.n, p.s); r.setEnd(p.n, p.e); out.push(r); }
    last = p;
  }
  return out;
}

// tıklayınca cümle, sürükleyince ya da çift tıklayınca seçilen yazı
$('docBody').addEventListener('click', e => {
  if (!getSelection().isCollapsed || e.detail > 1) return;
  const c = caretAt(e.clientX, e.clientY);
  const parts = c && sentenceParts(c.startContainer, c.startOffset);
  if (parts && parts.length) showSelbar(parts, joinParts(parts));
  else hideSelbar();
});
$('docBody').addEventListener('dblclick', e => {
  const c = caretAt(e.clientX, e.clientY);
  if (!c) return;
  const n = c.startContainer, re = /[\p{L}][\p{L}'’\-]*/gu;
  let m;
  while ((m = re.exec(n.nodeValue))) {
    if (c.startOffset < m.index || c.startOffset > m.index + m[0].length) continue;
    const pgEl = n.parentElement.closest('.pg'), x = pgEl && textNodesOf(pgEl).find(t => t.n === n);
    if (x) showSelbar([{ n, s:m.index, e:m.index + m[0].length, o:x.o, i:x.i, r:rectOf(n) }], m[0].replace(/[-’']+$/, ''));
    return;
  }
});
function takeSelection() {
  const sel = getSelection();
  if (L().kind !== 'doc' || !sel.rangeCount || sel.isCollapsed) return;
  const r = sel.getRangeAt(0);
  if (!$('docBody').contains(r.commonAncestorContainer)) return;
  const parts = partsOf(r), text = joinParts(parts);
  if (text.length >= 2) showSelbar(parts, text);
}
$('docBody').addEventListener('mouseup', e => { if (e.detail < 2) setTimeout(takeSelection, 0); });
let selT;
document.addEventListener('selectionchange', () => {
  if (!matchMedia('(hover: none)').matches) return;
  clearTimeout(selT); selT = setTimeout(takeSelection, 500);
});

// belgenin altındaki çeviri şeridi
let selTok = 0, cur = null;
function hideSelbar() {
  $('selbar').hidden = true; cur = null;
  if (window.CSS && CSS.highlights) CSS.highlights.delete('lm-sel');
}
function showSelbar(parts, text) {
  const l = L(), bar = $('selbar'), tok = ++selTok, one = /^[\p{L}'’-]+$/u.test(text);
  hideTip();
  cur = { parts, text, tr:'' };
  if (window.CSS && CSS.highlights) CSS.highlights.set('lm-sel', new Highlight(...rangesOf(parts)));
  getSelection().removeAllRanges();
  bar.innerHTML = '<div class="sbo">' + esc(text) + '</div>'
    + '<div class="sbq" dir="' + (l.lang === 'ur' ? 'rtl' : 'ltr') + '">' + (trOn ? 'Çevriliyor...' : '') + '</div>'
    + '<div class="sbb"><button data-c="y" class="dot y" title="Sarı vurgula"></button><button data-c="g" class="dot g" title="Yeşil vurgula"></button><button data-c="p" class="dot p" title="Pembe vurgula"></button>'
    + '<button data-a="note">Nota ekle</button>' + (one ? '<button data-a="word">Defterime ekle</button>' : '') + '<button data-a="copy">Kopyala</button>'
    + '<span class="grow"></span><button data-a="close" title="Kapat">&times;</button></div>';
  bar.hidden = false;
  const q = bar.querySelector('.sbq');
  if (!trOn) return;
  if (text.length > 1200) { q.textContent = '(seçim çok uzun, çeviri için daha kısa seç)'; return; }
  (one ? translateWord(text, l.lang) : translate(text, l.lang, l.src || 'en'))
    .then(t => { if (tok === selTok && cur) { cur.tr = t; q.textContent = t; } })
    .catch(() => { if (tok === selTok) q.textContent = '(çeviri alınamadı)'; });
}
function pageOf(c) {
  const el = c.parts[0].n.parentElement && c.parts[0].n.parentElement.closest('.pg');
  return el ? +el.dataset.p : 0;
}
// işaret, sayfa metnindeki harf aralıkları olarak saklanır. yan sütun araya girerse birkaç parça olur
function addMark(c) {
  if (!cur || !cur.parts.length) return;
  const l = L(), p = pageOf(cur), segs = [];
  for (const x of cur.parts) {
    const s = x.o + x.s, e = x.o + x.e, last = segs[segs.length - 1];
    if (last && last[1] === s) last[1] = e; else segs.push([s, e]);
  }
  (l.marks ||= []).push({ id:'m' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), p, s:segs[0][0], e:segs[segs.length - 1][1], r:segs, t:cur.text, tr:cur.tr || '', c });
  save(); applyMarks(); renderMarks(); renderLessons();
  hideSelbar();
}
const quoteHTML = (text, tr, p) => '<blockquote>' + esc(text) + (tr && !/^\(/.test(tr) ? '<br><i>' + esc(tr) + '</i>' : '') + '<br><small>s. ' + (p + 1) + '</small></blockquote><div><br></div>';
$('selbar').addEventListener('mousedown', e => e.preventDefault());
$('selbar').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || !cur) return;
  const l = L();
  if (b.dataset.a === 'close') return hideSelbar();
  if (b.dataset.c) return addMark(b.dataset.c);
  if (b.dataset.a === 'note') { appendToNotes(quoteHTML(cur.text, cur.tr, pageOf(cur))); toast('Nota eklendi'); }
  else if (b.dataset.a === 'copy') { try { navigator.clipboard.writeText(cur.text); } catch {} toast('Kopyalandı'); }
  else if (b.dataset.a === 'word') {
    if (!l.vocab.some(v => v.w.toLowerCase() === cur.text.toLowerCase())) { l.vocab.push({ w:cur.text, m:cur.tr, ex:'' }); save(); renderVocab(); }
    toast('Kelime defterine eklendi');
  }
});

// işaretler sekmesi
function renderMarks() {
  const ms = [...(L().marks || [])].sort((a, b) => a.p - b.p || a.s - b.s);
  $('mkCount').textContent = ms.length ? '(' + ms.length + ')' : '';
  $('marksList').innerHTML = ms.length ? ms.map(m =>
    '<div class="mk" data-id="' + m.id + '" style="border-left-color:' + MKCOL[m.c] + '"><div class="mkt">' + esc(m.t)
    + (m.tr ? '<span class="st">' + esc(m.tr) + '</span>' : '') + '</div><div class="mkb"><span class="pgn">s. ' + (m.p + 1)
    + '</span><button data-a="go">Git</button><button data-a="note">Nota ekle</button><button data-a="del">Sil</button></div></div>'
  ).join('') : '<div class="empty">Henüz işaret yok. Belgede bir cümleye tıkla ya da yazıyı seç, çıkan kutudan bir renk seç.</div>';
}
async function gotoMark(m) {
  const pg = DOC.pages[m.p];
  if (!pg) return;
  if (innerWidth <= 760) setMTab('trans');
  const body = $('docBody');
  body.scrollTop = pg.el.offsetTop - 12;
  if (DOC.type === 'pdf') await renderPdfPage(m.p);
  const first = (m.r || [[m.s, m.e]])[0], r = rangeFor(pg.el, first[0], first[1]);
  if (r) body.scrollTop += r.getBoundingClientRect().top - body.getBoundingClientRect().top - body.clientHeight / 3;
}
$('marksList').addEventListener('click', e => {
  const b = e.target.closest('button'), row = e.target.closest('.mk');
  if (!b || !row) return;
  const l = L(), m = (l.marks || []).find(x => x.id === row.dataset.id);
  if (!m) return;
  if (b.dataset.a === 'go') gotoMark(m);
  else if (b.dataset.a === 'note') { appendToNotes(quoteHTML(m.t, m.tr, m.p)); toast('Nota eklendi'); }
  else { l.marks = l.marks.filter(x => x !== m); save(); applyMarks(); renderMarks(); renderLessons(); }
});

// belge açma
$('docOpen').onclick = () => { $('exportMenu').hidden = true; reattachFor = null; $('docFile').click(); };
$('docFile').onchange = async () => {
  const f = $('docFile').files[0];
  $('docFile').value = '';
  if (!f) return;
  const ext = (f.name.match(/\.([^.]+)$/) || [])[1];
  const type = ext && ext.toLowerCase() === 'pdf' ? 'pdf' : ext && ext.toLowerCase() === 'docx' ? 'docx' : '';
  if (!type) { toast('Sadece PDF ya da Word (.docx) açabilirim'); return; }
  if (reattachFor) {
    const l = DB.lessons.find(x => x.id === reattachFor);
    reattachFor = null;
    if (!l) return;
    await idbDo('audio', 'readwrite', s => s.put(f, l.id + ':doc'));
    l.doc = { name:f.name, type, scale:l.doc && l.doc.scale };
    saveNow();
    if (DB.cur === l.id) loadDoc();
    return;
  }
  if (R.state !== 'idle') { toast('Önce kaydı bitir'); return; }
  let l = L();
  if (l.kind === 'doc' || l.segs.length || l.notes || l.recs.length) { l = newLesson(); DB.lessons.push(l); }
  l.kind = 'doc'; l.title = f.name.replace(/\.[^.]+$/, ''); l.doc = { name:f.name, type }; l.marks = [];
  await idbDo('audio', 'readwrite', s => s.put(f, l.id + ':doc'));
  saveNow(); switchLesson(l.id, true);
};
