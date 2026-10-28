// tema, yazı boyutu, yan panel
function applyTheme() {
  const t = lsGet('ders-theme', '');
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
$('theme').onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  lsSet('ders-theme', cur === 'dark' ? 'light' : 'dark'); applyTheme();
};
let fs = +lsGet('ders-fs', 20);
function applyFs() { document.documentElement.style.setProperty('--fs', fs + 'px'); }
function bumpFs(d) { fs = Math.min(36, Math.max(13, fs + d)); lsSet('ders-fs', fs); applyFs(); }
$('fsPlus').onclick = () => bumpFs(2); $('fsMinus').onclick = () => bumpFs(-2);

function setSide(open) { $('app').classList.toggle('side-closed', !open); lsSet('ders-side', open ? '1' : '0'); }
$('sideToggle').onclick = () => setSide($('app').classList.contains('side-closed'));
$('brand').onclick = () => setSide($('app').classList.contains('side-closed'));

let trOn = lsGet('ders-tron', '1') === '1';
$('trToggle').checked = trOn;
$('trToggle').onchange = () => {
  trOn = $('trToggle').checked; lsSet('ders-tron', trOn ? '1' : '0');
  $('left').classList.toggle('en-only', !trOn);
  updateLangLabel();
  if (trOn) retranslateMissing();
};

// panellerin arasındaki sürüklenebilir çubuklar
function makeSplit(handle, parent, axis, key, apply, min = .2, max = .8) {
  handle.addEventListener('pointerdown', e => {
    handle.setPointerCapture(e.pointerId);
    const r = parent.getBoundingClientRect();
    const mv = ev => {
      let f = axis === 'x' ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
      f = Math.min(max, Math.max(min, f)); apply(f); lsSet(key, f);
    };
    const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); document.body.classList.remove('dragging'); };
    handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up);
    document.body.classList.add('dragging'); e.preventDefault();
  });
}
const applyV = f => { $('main').style.gridTemplateColumns = f + 'fr 10px ' + (1 - f) + 'fr'; };
const applyH = f => { $('left').style.gridTemplateRows = f + 'fr 10px ' + (1 - f) + 'fr'; };
makeSplit($('splitV'), $('main'), 'x', 'ders-sv', applyV, .3, .85);
makeSplit($('splitH'), $('left'), 'y', 'ders-sh', applyH, .15, .85);

// yukarı kaydırınca otomatik aşağı kaymayı durdurur
const stick = { en:true, tr:true };
const bodies = { en:$('en'), tr:$('tr') };
for (const k of ['en', 'tr']) bodies[k].addEventListener('scroll', () => {
  const b = bodies[k]; stick[k] = b.scrollHeight - b.scrollTop - b.clientHeight < 50; updateLive();
});
function autoscroll() {
  if (filt.q || filt.star) return;
  for (const k of ['en', 'tr']) if (stick[k]) bodies[k].scrollTop = bodies[k].scrollHeight;
}
function updateLive() { $('live').hidden = !(R.state !== 'idle' && (!stick.en || !stick.tr)); }
$('live').onclick = () => { stick.en = stick.tr = true; autoscroll(); updateLive(); };

// transkript: arama ve önemli filtresi
const filt = { q:'', star:false };
const segVisible = s => {
  if (filt.star && !s.star) return false;
  if (filt.q) return s.en.toLowerCase().includes(filt.q) || (s.tr || '').toLowerCase().includes(filt.q);
  return true;
};
// kelimeleri tıklanabilir yapar
function wordsHTML(text) {
  const terms = filt.q ? filt.q.split(/\s+/).filter(Boolean) : [];
  return text.split(/([\p{L}][\p{L}'’\-]*)/u).map((p, i) => {
    if (i % 2 === 0) return esc(p);
    const hit = terms.some(t => p.toLowerCase().includes(t));
    return '<span class="w' + (hit ? ' hit' : '') + '">' + esc(p) + '</span>';
  }).join('');
}
function applyLangStyle() {
  const l = L(), ur = l.lang === 'ur';
  fillLangOptions(l);
  $('enTitle').textContent = SRC[l.src || 'en'].name;
  $('trTitle').textContent = LANGS[l.lang];
  // başlıklar büyük harfle yazılıyor. dili belirtmezsek sayfa Türkçe olduğu için English "ENGLİSH" oluyor
  $('enTitle').lang = $('docName').lang = l.src || 'en'; $('trTitle').lang = l.lang;
  for (const id of ['trList', 'trInt']) {
    const el = $(id);
    el.dir = ur ? 'rtl' : 'ltr';
    el.style.fontFamily = ur ? '"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Geeza Pro",serif' : '';
    el.style.lineHeight = ur ? '2.1' : '';
  }
}
function fillLangOptions(l) {
  const src = l.src || 'en';
  if (l.lang === src) l.lang = src === 'tr' ? 'en' : 'tr';
  $('src').value = src;
  $('lang').innerHTML = Object.keys(LANGS).filter(k => k !== src).map(k => '<option value="' + k + '">' + LANGS[k] + '</option>').join('');
  $('lang').value = l.lang;
  updateLangLabel();
}
function updateLangLabel() {
  const l = L();
  $('langLabel').textContent = (l.src || 'en').toUpperCase() + (trOn ? ' \u2192 ' + l.lang.toUpperCase() : '');
}
function renderSegments() {
  const l = L(), withAudio = new Set(l.recs.map(r => r.id));
  let en = '', tr = '', n = 0;
  l.segs.forEach((s, i) => {
    if (!segVisible(s)) return;
    n++;
    const acts = (withAudio.has(s.rec) ? '<button class="icon b-play" data-act="play" title="' + T('Bu cümleyi kayıttan dinle') + '">' + IC.play + '</button>' : '')
      + '<button class="icon b-star" data-act="star" title="' + T('Önemli olarak işaretle') + '">' + IC.star + '</button>'
      + '<button class="icon b-note" data-act="note" title="' + T('Nota ekle') + '">' + IC.note + '</button>';
    en += '<div class="seg' + (s.star ? ' star' : '') + '" data-i="' + i + '"><span class="ts">' + (s.t != null ? fmt(s.t) : '') + '</span><p class="txt">' + wordsHTML(s.en) + '</p><span class="acts">' + acts + '</span></div>';
    tr += '<div class="seg' + (s.star ? ' star' : '') + '" data-i="' + i + '"><p class="txt">' + esc(s.tr == null ? '...' : s.tr) + '</p></div>';
  });
  $('enList').innerHTML = en; $('trList').innerHTML = tr;
  const e = $('enEmpty');
  if (!l.segs.length) {
    e.hidden = false;
    e.innerHTML = UI === 'en' ? '<b>You are ready.</b><br>1. Press <b>Start recording</b> below (Chrome will ask for the microphone).<br>2. While the lesson is spoken the text appears here and its translation below. Pick the spoken language under EN &rarr; TR.<br>3. Click a word to see its meaning. Hover a sentence to play, star or add it to your notes.' : '<b>Hazırsın.</b><br>1. Üstteki <b>Kaydı başlat</b> düğmesine bas (Chrome mikrofon izni ister).<br>2. Ders konuşulurken metin burada, çevirisi altta yazılır. Konuşma dilini üstten seçebilirsin.<br>3. Bir kelimeye tıkla: anlamını gör. Cümlenin üstüne gel: dinle, işaretle, nota ekle.';
  } else if (!n) { e.hidden = false; e.textContent = 'Aramayla eşleşen cümle yok.'; }
  else e.hidden = true;
  autoscroll();
}
// tek çeviriyi yerinde günceller, hepsini baştan çizmez
function setTrText(i) {
  const s = L().segs[i], el = $('trList').querySelector('[data-i="' + i + '"] .txt');
  if (el && s) el.textContent = s.tr == null ? '...' : s.tr;
  autoscroll();
}

// konuşma sürerken yazılan, henüz bitmemiş cümle
let trInterim = '', lastInterim = '', liveTimer = null, liveBusy = false;
function setInterim(en) {
  lastInterim = en;
  const e = $('enInt'); e.textContent = en; e.hidden = !en;
  if (!en) trInterim = '';
  showTrInt(); liveTranslate(en); autoscroll();
}
function showTrInt() { const t = $('trInt'); t.textContent = trInterim; t.hidden = !trInterim; }
function liveTranslate(en) {
  if (!en || !trOn || liveTimer || liveBusy) return;
  liveTimer = setTimeout(async () => {
    liveTimer = null; liveBusy = true;
    try { const t = await translate(lastInterim); if (lastInterim) { trInterim = t; showTrInt(); autoscroll(); } } catch {}
    liveBusy = false;
  }, 600);
}

async function addSegment(text, t) {
  const l = L(), seg = { en:text, tr:null, t, rec:R.recId, star:false };
  l.segs.push(seg); save();
  renderSegments(); renderLessons();
  const i = l.segs.length - 1;
  if (!trOn) return;
  try { seg.tr = await translate(text, l.lang); }
  catch (e) { seg.tr = e.message === 'limit' ? '(günlük çeviri limiti doldu)' : '(çeviri alınamadı)'; }
  save(); if (L() === l) setTrText(i);
}
async function retranslateMissing() {
  const l = L();
  for (let i = 0; i < l.segs.length; i++) {
    if (l.segs[i].tr != null && !/^\(/.test(l.segs[i].tr)) continue;
    try { l.segs[i].tr = await translate(l.segs[i].en, l.lang); } catch { l.segs[i].tr = '(çeviri alınamadı)'; }
    if (L() === l) setTrText(i);
  }
  save();
}
$('lang').onchange = async () => {
  const l = L(); l.lang = $('lang').value; lsSet('ders-lang', l.lang);
  applyLangStyle(); trInterim = ''; showTrInt();
  $('engine').textContent = '...';
  await initTranslator(l.lang);
  l.segs.forEach(s => s.tr = null); renderSegments(); save();
  if (trOn) {
    for (let i = 0; i < l.segs.length; i++) {
      if (L() !== l || l.lang !== $('lang').value) return;
      try { l.segs[i].tr = await translate(l.segs[i].en, l.lang); } catch { l.segs[i].tr = '(çeviri alınamadı)'; }
      if (L() === l) setTrText(i);
    }
    save();
  }
};

$('src').onchange = () => {
  const l = L();
  if (l.segs.length || R.state !== 'idle') { toast('Konuşma dilini değiştirmek için yeni bir ders aç'); $('src').value = l.src || 'en'; return; }
  l.src = $('src').value; lsSet('ders-src', l.src);
  if (l.lang === l.src) l.lang = l.src === 'tr' ? 'en' : 'tr';
  applyLangStyle(); save();
  $('lang').onchange();
};

$('q').oninput = () => { filt.q = $('q').value.trim().toLowerCase(); renderSegments(); };
$('starFilter').onclick = () => { filt.star = !filt.star; $('starFilter').classList.toggle('on', filt.star); renderSegments(); };

$('left').addEventListener('mouseover', e => {
  const s = e.target.closest('.seg[data-i]');
  document.querySelectorAll('.seg.pair').forEach(x => x.classList.remove('pair'));
  if (s) document.querySelectorAll('.seg[data-i="' + s.dataset.i + '"]').forEach(x => x.classList.add('pair'));
});
$('enList').addEventListener('click', e => {
  const seg = e.target.closest('.seg[data-i]'); if (!seg) return;
  const i = +seg.dataset.i, s = L().segs[i];
  const b = e.target.closest('[data-act]');
  if (b) {
    if (b.dataset.act === 'star') {
      s.star = !s.star; save();
      document.querySelectorAll('.seg[data-i="' + i + '"]').forEach(x => x.classList.toggle('star', s.star));
      if (filt.star) renderSegments();
    } else if (b.dataset.act === 'note') quoteToNotes(s);
    else if (b.dataset.act === 'play') playSeg(s);
    return;
  }
  const w = e.target.closest('.w'); if (w) showWord(w, s);
});

// kelimeye tıklayınca çıkan kutu
async function showWord(el, seg) {
  const word = el.textContent, l = L(), pop = $('pop');
  const r = el.getBoundingClientRect();
  pop.hidden = false;
  pop.style.left = Math.max(8, Math.min(innerWidth - 276, r.left)) + 'px';
  pop.style.top = Math.min(innerHeight - 170, r.bottom + 8) + 'px';
  const known = () => l.vocab.some(v => v.w.toLowerCase() === word.toLowerCase());
  pop.innerHTML = '<div class="pw">' + esc(word) + '</div><div class="pm" id="pm" dir="' + (l.lang === 'ur' ? 'rtl' : 'ltr') + '">...</div>'
    + '<div class="pb"><button class="btn sm" id="pSay">Söyle</button><button class="btn sm primary" id="pAdd">' + (known() ? 'Defterde' : 'Defterime ekle') + '</button></div>';
  $('pAdd').disabled = known();
  $('pSay').onclick = () => { try { const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {} };
  let meaning = '';
  try { meaning = await translateWord(word, l.lang); } catch { meaning = '(çeviri alınamadı)'; }
  const pm = $('pm'); if (pm) pm.textContent = meaning;
  $('pAdd').onclick = () => {
    if (!known()) { l.vocab.push({ w:word, m:meaning, ex:seg ? seg.en : '' }); save(); renderVocab(); toast('Kelime defterine eklendi'); }
    pop.hidden = true;
  };
}
document.addEventListener('mousedown', e => {
  if (!e.target.closest('#pop') && !e.target.closest('.w')) $('pop').hidden = true;
  if (!e.target.closest('.menu')) { $('exportMenu').hidden = true; $('setPop').hidden = true; }
});
