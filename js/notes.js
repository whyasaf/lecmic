// kelime defteri
// kartlarda ne kadar öğrenildiği: 4 nokta
const vLevel = v => '<span class="vlv" title="' + T('Öğrenme: ') + (v.box || 0) + '/4">' + [1, 2, 3, 4].map(n => '<i' + ((v.box || 0) >= n ? ' class="on"' : '') + '></i>').join('') + '</span>';
function renderVocab() {
  const l = L();
  $('vCount').textContent = l.vocab.length || '';
  $('vocabList').innerHTML = l.vocab.length ? l.vocab.map((v, i) =>
    '<div class="vrow"><div><div class="vw">' + esc(v.w) + vLevel(v) + '</div><div class="vm" dir="' + (l.lang === 'ur' ? 'rtl' : 'ltr') + '">' + esc(v.m) + '</div>'
    + (v.ex ? '<div class="vx">' + esc(v.ex) + '</div>' : '') + '</div><button class="icon sm" data-vdel="' + i + '" title="Sil">' + IC.trash + '</button></div>'
  ).join('') : '<div class="empty">Henüz kelime yok. Soldaki metinde bir kelimeye tıkla, "Defterime ekle" de. Ya da yukarıdan kendin yaz.</div>';
  if (typeof renderVocabBar === 'function') renderVocabBar();
}
$('vocabList').addEventListener('click', e => {
  const b = e.target.closest('[data-vdel]'); if (!b) return;
  L().vocab.splice(+b.dataset.vdel, 1); save(); renderVocab();
});
$('vForm').onsubmit = async e => {
  e.preventDefault();
  const w = $('vInput').value.trim(), l = L(); if (!w) return;
  $('vInput').value = '';
  let m; try { m = await translate(w, l.lang); } catch { m = '(çeviri alınamadı)'; }
  l.vocab.push({ w, m, ex:'' }); save(); renderVocab();
};

// sekme çizgileri: boyut değişince (dil değişti, sekme gizlendi) yeniden yerleşir
const inkBars = [document.querySelector('#right .tabs'), $('mtabs')];
const inkRO = new ResizeObserver(() => inkBars.forEach(moveInk));
inkBars.forEach(b => { inkRO.observe(b); b.querySelectorAll('button').forEach(x => inkRO.observe(x)); });

// çeviri sekmesi, Google Çeviri gibi. seçilen diller ve son çeviriler hatırlanır
const GT_LANGS = { tr:'Türkçe', en:'English', de:'Deutsch', fr:'Français', es:'Español', it:'Italiano', pt:'Português', nl:'Nederlands', pl:'Polski', ru:'Русский', el:'Ελληνικά', ar:'العربية', fa:'فارسی', ur:'اردو', hi:'हिन्दी', ja:'日本語', ko:'한국어', 'zh-CN':'中文' };
const gtOpts = auto => (auto ? '<option value="auto">Dili algıla</option>' : '') + Object.entries(GT_LANGS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('');
$('gtFrom').innerHTML = gtOpts(true); $('gtTo').innerHTML = gtOpts(false);
let gtT = null, gtTok = 0, gtHistT = null, gtLast = null, gtReady = false;
// ilk açılışta dersin dil yönüyle başlar
function gtInit() {
  if (gtReady) return;
  gtReady = true;
  const l = L();
  $('gtFrom').value = lsGet('ders-gtfrom', l.src || 'en'); if (!$('gtFrom').value) $('gtFrom').value = 'auto';
  $('gtTo').value = lsGet('ders-gtto', l.lang); if (!$('gtTo').value) $('gtTo').value = 'tr';
  renderGtHist();
}
const gtSaveLangs = () => { lsSet('ders-gtfrom', $('gtFrom').value); lsSet('ders-gtto', $('gtTo').value); };
async function gtGo() {
  clearTimeout(gtT); clearTimeout(gtHistT);
  const raw = $('gtIn').value, text = raw.trim(), from = $('gtFrom').value, to = $('gtTo').value, tok = ++gtTok, out = $('gtOut');
  $('gtCount').textContent = raw.length + ' / 5000'; $('gtClear').hidden = !raw;
  gtLast = null; $('gtWord').hidden = true; $('gtDet').textContent = '';
  if (!text) { out.textContent = ''; $('gtDict').innerHTML = ''; return; }
  out.classList.add('busy');
  let r = null;
  try { r = await gtTranslate(text, from, to); } catch {}
  if (tok !== gtTok) return;
  out.classList.remove('busy');
  if (!r) { out.textContent = T('(çeviri alınamadı)'); $('gtDict').innerHTML = ''; return; }
  gtLast = { i:text, o:r.text, f:r.from, from, t:to };
  out.textContent = r.text; replay(out, 'arrive');
  $('gtWord').hidden = !/^[\p{L}'’-]+$/u.test(text);
  if (from === 'auto' && GT_LANGS[r.from]) $('gtDet').textContent = T('Algılanan: ') + GT_LANGS[r.from];
  $('gtDict').innerHTML = r.dict.map(d => '<div class="gtd"><b>' + esc(d.pos) + '</b> ' + d.ws.slice(0, 8).map(esc).join(', ') + '</div>').join('');
  // yazmayı bıraktıysa son çevirilere girer
  gtHistT = setTimeout(gtSaveHist, 2000);
}
$('gtIn').addEventListener('input', () => {
  clearTimeout(gtT); gtT = setTimeout(gtGo, 500);
  $('gtCount').textContent = $('gtIn').value.length + ' / 5000'; $('gtClear').hidden = !$('gtIn').value;
});
// Ctrl+Enter normalde kaydı başlatıyor, burada sadece çevirsin
$('gtIn').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); gtGo(); } });
$('gtFrom').onchange = $('gtTo').onchange = () => { gtSaveLangs(); gtGo(); };
$('gtSwap').onclick = () => {
  $('gtSwap').classList.toggle('turn');
  let f = $('gtFrom').value;
  if (f === 'auto') { if (!gtLast || !GT_LANGS[gtLast.f]) { toast('Önce bir metin yaz, dili algılansın'); return; } f = gtLast.f; }
  $('gtFrom').value = $('gtTo').value; $('gtTo').value = f;
  if (gtLast) $('gtIn').value = gtLast.o;
  gtSaveLangs(); gtGo();
};
$('gtClear').onclick = () => { $('gtIn').value = ''; gtGo(); $('gtIn').focus(); };
function gtSay(text, lang) {
  if (!text.trim()) return;
  try { const u = new SpeechSynthesisUtterance(text); if (lang && lang !== 'auto') u.lang = lang; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}
$('gtSayIn').onclick = () => gtSay($('gtIn').value, gtLast ? gtLast.f : $('gtFrom').value);
$('gtSayOut').onclick = () => gtSay(gtLast ? gtLast.o : '', $('gtTo').value);
$('gtCopy').onclick = async () => {
  if (!gtLast) return;
  try { await navigator.clipboard.writeText(gtLast.o); toast('Kopyalandı'); gtSaveHist(); } catch {}
};
$('gtNote').onclick = () => {
  if (!gtLast) return;
  appendToNotes('<blockquote>' + esc(gtLast.i) + '<br><i>' + esc(gtLast.o) + '</i></blockquote><div><br></div>'); toast('Nota eklendi'); gtSaveHist();
};
$('gtWord').onclick = () => {
  if (!gtLast) return;
  // defterde kelime dersin dilinde, anlamı öbür dilde durur
  const l = L(), [w, m] = gtLast.t === (l.src || 'en') ? [gtLast.o, gtLast.i] : [gtLast.i, gtLast.o];
  if (l.vocab.some(v => v.w.toLowerCase() === w.toLowerCase())) { toast('Bu kelime zaten defterde'); return; }
  l.vocab.push({ w, m, ex:'' }); save(); renderVocab(); toast('Kelime defterine eklendi'); gtSaveHist();
};
// son 10 çeviri. yazmaya devam edilen metin yeni kayıt açmasın, öncekinin yerine geçsin
const gtHist = () => { try { return JSON.parse(lsGet('ders-gthist', '[]')) || []; } catch { return []; } };
function gtSaveHist() {
  clearTimeout(gtHistT);
  if (!gtLast) return;
  let h = gtHist().filter(x => !(x.i === gtLast.i && x.t === gtLast.t));
  if (h[0] && h[0].t === gtLast.t && gtLast.i.startsWith(h[0].i)) h.shift();
  h.unshift({ i:gtLast.i, o:gtLast.o, f:gtLast.from, t:gtLast.t });
  lsSet('ders-gthist', JSON.stringify(h.slice(0, 10))); renderGtHist();
}
function renderGtHist() {
  const h = gtHist();
  $('gtHistBox').hidden = !h.length;
  $('gtHist').innerHTML = h.map((x, k) => '<button class="gthi" data-k="' + k + '"><span class="gthl">' + (x.f === 'auto' ? T('Algıla') : x.f.toUpperCase()) + ' → ' + x.t.toUpperCase() + '</span><span class="gthi-i">' + esc(x.i) + '</span><span class="gthi-o">' + esc(x.o) + '</span></button>').join('');
}
$('gtHist').onclick = e => {
  const b = e.target.closest('.gthi'), x = b && gtHist()[+b.dataset.k]; if (!x) return;
  $('gtFrom').value = x.f; $('gtTo').value = x.t; $('gtIn').value = x.i; gtSaveLangs(); gtGo();
};
$('gtHistClear').onclick = () => { lsSet('ders-gthist', '[]'); renderGtHist(); };

// telefon sekmeleri
function setMTab(name) {
  $('app').dataset.mtab = name;
  document.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.mtab === name));
  const mb = document.querySelector('#mtabs button.on'); if (mb && mb.offsetParent) mb.scrollIntoView({ block:'nearest', inline:'nearest' });
  moveInk($('mtabs'));
  if (name !== 'trans') showTab(name);
}
document.querySelectorAll('#mtabs button').forEach(b => b.onclick = () => setMTab(b.dataset.mtab));
$('scrim').onclick = () => setSide(false);
document.querySelectorAll('.tab').forEach(t => t.onclick = () => showTab(t.dataset.tab));
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  $('paneNotes').hidden = name !== 'notes'; $('paneVocab').hidden = name !== 'vocab'; $('paneSum').hidden = name !== 'sum'; $('paneMarks').hidden = name !== 'marks';
  $('paneTr').hidden = name !== 'tr'; $('right').dataset.tab = name;
  if (name === 'tr') gtInit();
  // sekmeler sığmayıp yana kaydıysa seçilen görünsün
  const on = document.querySelector('.tab.on'); if (on && on.offsetParent) on.scrollIntoView({ block:'nearest', inline:'nearest' });
  moveInk(document.querySelector('#right .tabs'));
}
// seçili sekmenin altındaki çizgi (telefonda arkasındaki kutu) kayarak yerine gider
function moveInk(bar) {
  const ink = bar.querySelector('.ink'), on = bar.querySelector('.on');
  if (!ink) return;
  if (!on || !on.offsetWidth) { ink.style.opacity = 0; return; }
  Object.assign(ink.style, { opacity:1, width:on.offsetWidth + 'px', transform:'translateX(' + on.offsetLeft + 'px)' });
  if (bar.id === 'mtabs') Object.assign(ink.style, { top:on.offsetTop + 'px', height:on.offsetHeight + 'px' });
  // ilk yerleşmede kaymasın, sonrakilerde kaysın
  requestAnimationFrame(() => ink.classList.add('ready'));
}

// not editörü
const notes = $('notes');
function onNotesChange() {
  if (notes.innerHTML === '<br>') notes.innerHTML = '';
  L().notes = notes.innerHTML; save(); updateCount();
}
function updateCount() {
  const t = notes.innerText.trim();
  $('count').textContent = (t ? t.split(/\s+/).length : 0) + ' kelime';
}
notes.addEventListener('input', onNotesChange);
const fmtCmd = (cmd, val) => { notes.focus(); document.execCommand(cmd, false, val); onNotesChange(); refreshState(); };
function focusEnd() {
  showTab('notes'); notes.focus();
  if (!notes.contains(getSelection().anchorNode)) {
    const r = document.createRange(); r.selectNodeContents(notes); r.collapse(false);
    getSelection().removeAllRanges(); getSelection().addRange(r);
  }
}
// mousedown'ı engelleyince düğmeye basarken seçili yazı kaybolmuyor
const tools = $('tools');
tools.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
tools.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  // az kullanılanlar "⋯" menüsünde. birine basınca menü kapanır
  if (b.hasAttribute('data-more')) { $('toolsMore').hidden = !$('toolsMore').hidden; return; }
  if (b.closest('#toolsMore')) $('toolsMore').hidden = true;
  if (b.dataset.cmd) fmtCmd(b.dataset.cmd);
  else if (b.hasAttribute('data-hl')) {
    const on = document.queryCommandValue('hiliteColor');
    fmtCmd('hiliteColor', /255,\s*224,\s*102|ffe066/i.test(on) ? 'transparent' : '#ffe066');
  } else if (b.hasAttribute('data-todo')) { focusEnd(); document.execCommand('insertHTML', false, '<div><input type="checkbox">&nbsp;</div>'); onNotesChange(); }
  else if (b.hasAttribute('data-time')) { focusEnd(); document.execCommand('insertText', false, '[' + new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' }) + '] '); onNotesChange(); }
});
tools.querySelector('[data-block]').addEventListener('change', e => fmtCmd('formatBlock', e.target.value === 'p' ? 'div' : e.target.value));
notes.addEventListener('click', e => {
  if (e.target.matches('input[type=checkbox]')) { e.target.toggleAttribute('checked', e.target.checked); onNotesChange(); }
});
function refreshState() {
  tools.querySelectorAll('[data-cmd]').forEach(b => {
    let on = false; try { on = document.queryCommandState(b.dataset.cmd); } catch {}
    b.classList.toggle('active', on && !['undo','redo','removeFormat','insertHorizontalRule','indent','outdent'].includes(b.dataset.cmd));
  });
  let blk = ''; try { blk = document.queryCommandValue('formatBlock').toLowerCase(); } catch {}
  tools.querySelector('[data-block]').value = ['h1','h2','h3'].includes(blk) ? blk : 'p';
}
document.addEventListener('selectionchange', () => { if (notes.contains(getSelection().anchorNode)) refreshState(); });
document.addEventListener('mousedown', e => { if (!e.target.closest('.tmore-w')) $('toolsMore').hidden = true; });
// yapıştırılan içerik temizlenir. resim ve dosya notlara girmez, bir resim bile megabaytlarca yer tutuyor
notes.addEventListener('paste', e => {
  const cd = e.clipboardData; if (!cd) return;
  const html = cd.getData('text/html'), text = cd.getData('text/plain');
  e.preventDefault();
  if (!html && !text) { if ([...cd.items].some(i => i.kind === 'file')) toast('Notlara resim ya da dosya eklenemez'); return; }
  document.execCommand('insertHTML', false, html ? cleanHTML(html) : esc(text).replace(/\n/g, '<br>'));
  onNotesChange();
});
notes.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); toast('Notlara resim ya da dosya eklenemez'); } });
// yazarken araç çubuğu geri çekilir, fareyle üstüne gelince netleşir
notes.addEventListener('input', () => tools.classList.add('quiet'));
notes.addEventListener('blur', () => tools.classList.remove('quiet'));
function appendToNotes(html) {
  if (notes.offsetParent === null) notes.insertAdjacentHTML('beforeend', html);
  else { focusEnd(); document.execCommand('insertHTML', false, html); }
  onNotesChange();
}
function quoteToNotes(s) {
  const html = '<blockquote>' + esc(s.en) + (s.tr && !/^\(/.test(s.tr) ? '<br><i>' + esc(s.tr) + '</i>' : '') + '</blockquote><div><br></div>';
  if (notes.offsetParent === null) notes.insertAdjacentHTML('beforeend', html);
  else { focusEnd(); document.execCommand('insertHTML', false, html); }
  onNotesChange(); toast('Nota eklendi');
}
