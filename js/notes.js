// kelime defteri
function renderVocab() {
  const l = L();
  $('vCount').textContent = l.vocab.length ? '(' + l.vocab.length + ')' : '';
  $('vocabList').innerHTML = l.vocab.length ? l.vocab.map((v, i) =>
    '<div class="vrow"><div><div class="vw">' + esc(v.w) + '</div><div class="vm" dir="' + (l.lang === 'ur' ? 'rtl' : 'ltr') + '">' + esc(v.m) + '</div>'
    + (v.ex ? '<div class="vx">' + esc(v.ex) + '</div>' : '') + '</div><button class="icon sm" data-vdel="' + i + '" title="Sil">' + IC.trash + '</button></div>'
  ).join('') : '<div class="empty">Henüz kelime yok. Soldaki metinde bir kelimeye tıkla, "Defterime ekle" de. Ya da yukarıdan kendin yaz.</div>';
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

// telefon sekmeleri
function setMTab(name) {
  $('app').dataset.mtab = name;
  document.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.mtab === name));
  if (name !== 'trans') showTab(name);
}
document.querySelectorAll('#mtabs button').forEach(b => b.onclick = () => setMTab(b.dataset.mtab));
$('scrim').onclick = () => setSide(false);
document.querySelectorAll('.tab').forEach(t => t.onclick = () => showTab(t.dataset.tab));
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  $('paneNotes').hidden = name !== 'notes'; $('paneVocab').hidden = name !== 'vocab'; $('paneSum').hidden = name !== 'sum'; $('paneMarks').hidden = name !== 'marks';
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
