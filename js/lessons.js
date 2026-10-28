// sol panel: dersler. bir dersin altında belgeleri ve kayıtları ağaç gibi durur
const byNew = (a, b) => b.created - a.created;
const folderOf = id => DB.folders.find(f => f.id === id);
function itemHTML(l) {
  return '<div class="lesson' + (l.id === DB.cur ? ' on' : '') + '" draggable="true" data-id="' + l.id + '" title="' + esc(l.title) + '"><div class="lb">' + (l.kind === 'doc' ? IC.doc : l.recs.length ? IC.mic : IC.book) + '</div><div class="lt"><div class="ln">' + esc(l.title) + '</div><div class="lm">'
    + new Date(l.created).toLocaleDateString(LOC(), { day:'numeric', month:'short' }) + ' · ' + (l.kind === 'doc' ? (l.marks || []).length + ' işaret' : l.segs.length + ' cümle' + (l.recs.length ? ' · ses' : ''))
    + '</div></div><button class="icon sm del" data-move="' + l.id + '" title="Derse taşı">' + IC.move + '</button><button class="icon sm del" data-del="' + l.id + '" title="' + (l.folder ? 'Sil' : 'Dersi sil') + '">' + IC.trash + '</button></div>';
}
function folderHTML(f) {
  const kids = DB.lessons.filter(l => l.folder === f.id).sort((a, b) => a.created - b.created);
  const docs = kids.filter(l => l.kind === 'doc').length, recs = kids.length - docs, en = UI === 'en';
  const meta = !kids.length ? (en ? 'empty' : 'boş') : [docs && docs + (en ? ' doc' + (docs > 1 ? 's' : '') : ' belge'), recs && recs + (en ? ' recording' + (recs > 1 ? 's' : '') : ' kayıt')].filter(Boolean).join(' · ');
  return '<div class="folder' + (f.open ? ' open' : '') + '" data-fid="' + f.id + '">'
    + '<div class="lesson frow' + (kids.some(l => l.id === DB.cur) ? ' has-cur' : '') + '" title="' + esc(f.title) + '"><span class="chev">' + IC.chev + '</span><div class="lb">' + IC.folder + '</div><div class="lt"><div class="ln">' + esc(f.title) + '</div><div class="lm">' + meta + '</div></div>'
    + '<button class="icon sm fa" data-add="' + f.id + '" title="Bu derse ekle">' + IC.plus + '</button>'
    + '<button class="icon sm del" data-ren="' + f.id + '" title="Adını değiştir">' + IC.pen + '</button>'
    + '<button class="icon sm del" data-fdel="' + f.id + '" title="Dersi sil">' + IC.trash + '</button></div>'
    + (f.open ? '<div class="kids">' + (kids.length ? kids.map(itemHTML).join('') : '<button class="fempty" data-add="' + f.id + '">+ PDF ya da kayıt ekle</button>') + '</div>' : '') + '</div>';
}
function renderLessons() {
  const loose = DB.lessons.filter(l => !folderOf(l.folder));
  $('lessonList').innerHTML = [...DB.folders, ...loose].sort(byNew).map(x => DB.folders.includes(x) ? folderHTML(x) : itemHTML(x)).join('');
  // başlığın yanında hangi dersin içinde olduğu
  const f = L() && folderOf(L().folder);
  $('crumb').hidden = !f; $('crumb').textContent = f ? f.title : '';
}
$('crumb').onclick = () => { const f = folderOf(L().folder); if (f) { f.open = true; save(); setSide(true); renderLessons(); } };
function switchLesson(id, force) {
  if (!force && R.state !== 'idle') { toast('Önce kaydı bitir, sonra derse geç'); return; }
  saveNow(); DB.cur = id; curRec = null; playingIdx = -1;
  $('pop').hidden = true; filt.q = ''; filt.star = false; $('q').value = ''; $('starFilter').classList.remove('on');
  renderAll();
  if (translatorKey !== (L().src || 'en') + '>' + L().lang) initTranslator();
}
$('lessonList').addEventListener('click', e => {
  const b = e.target.closest('[data-add],[data-ren],[data-fdel],[data-del],[data-move]');
  if (b) {
    const d = b.dataset;
    if (d.add) addMenu(b, d.add); else if (d.ren) renameFolder(d.ren); else if (d.fdel) deleteFolder(d.fdel);
    else if (d.del) deleteLesson(d.del); else moveMenu(b, d.move);
    return;
  }
  const fr = e.target.closest('.frow');
  if (fr) {
    const f = folderOf(fr.parentElement.dataset.fid);
    // dar panelde alttakiler görünmüyor, paneli açıp dersi aç
    if ($('app').classList.contains('side-closed')) { f.open = true; setSide(true); } else f.open = !f.open;
    save(); renderLessons(); return;
  }
  const it = e.target.closest('.lesson'); if (it && it.dataset.id !== DB.cur) switchLesson(it.dataset.id);
  if (innerWidth <= 760) setSide(false);
});

// küçük açılır menü (+ ve taşı düğmeleri için). items: [html, iş, seçili mi]
function popMenu(btn, items) {
  const m = $('fMenu');
  m.innerHTML = items.map((x, i) => '<button data-i="' + i + '"' + (x[2] ? ' class="on"' : '') + '>' + x[0] + '</button>').join('');
  m.onclick = e => { const b = e.target.closest('button'); if (!b) return; m.hidden = true; items[b.dataset.i][1](); };
  m.hidden = false;
  const r = btn.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  m.style.top = (r.bottom + m.offsetHeight + 8 > innerHeight ? r.top - m.offsetHeight - 4 : r.bottom + 4) + 'px';
}
document.addEventListener('click', e => { if (!e.target.closest('#fMenu,[data-add],[data-move]')) $('fMenu').hidden = true; });

// yeni eklenecek şeyin gideceği ders: + menüsünden seçilen, yoksa açık olanın dersi
let addTo = null;
function targetFolder() { const f = addTo !== null ? addTo : L().folder; addTo = null; return folderOf(f) ? f : undefined; }
// açık sayfa boşsa onu kullan, değilse yenisini aç
function freshItem(fid) {
  let l = L();
  if (l.kind === 'doc' || l.segs.length || l.notes || l.recs.length) { l = newLesson(); DB.lessons.push(l); }
  if (fid) { l.folder = fid; folderOf(fid).open = true; } else delete l.folder;
  return l;
}
function addMenu(btn, fid) {
  popMenu(btn, [
    [esc(T('PDF ya da Word ekle')), () => { addTo = fid; reattachFor = null; $('docFile').click(); }],
    [esc(T('Yeni canlı kayıt')), () => newRecItem(fid)],
    [esc(T('Ses dosyasından transkript')), () => { if (R.state !== 'idle') { toast('Önce kaydı bitir'); return; } addTo = fid; $('impBtn').click(); }]
  ]);
}
function newRecItem(fid) {
  if (R.state !== 'idle') { toast('Önce kaydı bitir'); return; }
  const l = freshItem(fid);
  l.title = (UI === 'en' ? 'Recording' : 'Kayıt') + ' - ' + stamp(); l.created = Date.now();
  saveNow(); switchLesson(l.id, true);
  toast(T('Hazır. Kaydı başlat\'a bas'));
}
function moveTo(l, fid) {
  if (fid) { l.folder = fid; folderOf(fid).open = true; } else delete l.folder;
  save(); renderLessons();
}
function moveMenu(btn, id) {
  const l = DB.lessons.find(x => x.id === id); if (!l) return;
  const items = [...DB.folders].sort(byNew).map(f => ['<span class="fn">' + esc(f.title) + '</span>', () => moveTo(l, f.id), l.folder === f.id]);
  items.push([esc(T('Hiçbir ders (tek başına)')), () => moveTo(l, null), !folderOf(l.folder)]);
  items.push([esc(T('+ Yeni ders oluştur')), async () => { const f = await newFolder(); if (f) moveTo(l, f.id); }]);
  popMenu(btn, items);
}
// bilgisayarda sürükleyip bir dersin üstüne bırakınca içine girer, boşluğa bırakınca dışarı çıkar
let dragId = null;
const lessonList = $('lessonList');
const clearDrag = () => lessonList.querySelectorAll('.dragin').forEach(x => x.classList.remove('dragin'));
lessonList.addEventListener('dragstart', e => { const it = e.target.closest('.lesson[data-id]'); if (!it) return; dragId = it.dataset.id; e.dataTransfer.effectAllowed = 'move'; });
lessonList.addEventListener('dragover', e => {
  if (!dragId) return;
  e.preventDefault(); clearDrag();
  (e.target.closest('.folder') || lessonList).classList.add('dragin');
});
lessonList.addEventListener('drop', e => {
  if (!dragId) return;
  e.preventDefault(); clearDrag();
  const l = DB.lessons.find(x => x.id === dragId), fo = e.target.closest('.folder');
  dragId = null;
  if (l) moveTo(l, fo ? fo.dataset.fid : null);
});
lessonList.addEventListener('dragend', () => { dragId = null; clearDrag(); });

async function newFolder() {
  const name = await ask(T('Dersin adı:'), { input:'', ok:T('Oluştur') });
  if (name === null) return null;
  const f = { id:'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title:name.trim() || T('Adsız ders'), created:Date.now(), open:true };
  DB.folders.push(f); saveNow(); renderLessons();
  return f;
}
async function renameFolder(fid) {
  const f = folderOf(fid); if (!f) return;
  const n = await ask(T('Dersin adı:'), { input:f.title, ok:T('Kaydet') });
  if (n === null) return;
  f.title = n.trim() || f.title; save(); renderLessons();
}
// silme. önce sorulur, sonra dropLesson ile ses ve belge dosyalarıyla birlikte gider
function dropLesson(l) {
  l.recs.forEach(r => { idbDo('audio', 'readwrite', s => s.delete(l.id + ':' + r.id)); urlCache.delete(l.id + ':' + r.id); });
  if (l.doc) idbDo('audio', 'readwrite', s => s.delete(l.id + ':doc'));
  idbDeleteChunks(c => c.lesson === l.id);
  DB.lessons = DB.lessons.filter(x => x !== l);
}
function afterDelete() {
  if (!DB.lessons.length) DB.lessons.push(newLesson());
  if (!L()) { DB.cur = [...DB.lessons].sort(byNew)[0].id; curRec = null; renderAll(); }
  else renderLessons();
  saveNow();
}
async function deleteLesson(id) {
  const l = DB.lessons.find(x => x.id === id); if (!l) return;
  if (R.state !== 'idle' && R.lessonId === id) { toast('Kayıt sürerken bu ders silinemez'); return; }
  if (!(await ask(T(folderOf(l.folder) ? 'Silinsin mi?' : 'Ders silinsin mi?'), { sub:'"' + l.title + '"\n' + T('Transkript, notlar, kelimeler ve ses kaydı da silinir.'), ok:T('Sil'), danger:true }))) return;
  dropLesson(l); afterDelete();
}
async function deleteFolder(fid) {
  const f = folderOf(fid); if (!f) return;
  const kids = DB.lessons.filter(l => l.folder === fid);
  if (R.state !== 'idle' && kids.some(l => l.id === R.lessonId)) { toast('Kayıt sürerken bu ders silinemez'); return; }
  if (!(await ask(T('Ders silinsin mi?'), { sub:'"' + f.title + '"' + (kids.length ? '\n' + T('İçindeki belgeler ve kayıtlar da silinir') + ' (' + kids.length + ')' : ''), ok:T('Sil'), danger:true }))) return;
  kids.forEach(dropLesson);
  DB.folders = DB.folders.filter(x => x !== f);
  afterDelete();
}
$('newLesson').onclick = async () => {
  if (await newFolder()) toast(T('Ders açıldı. Yanındaki + ile PDF ya da kayıt ekle'));
};
$('title').addEventListener('input', () => { L().title = $('title').value || T('Adsız ders'); save(); renderLessons(); });

function renderAll() {
  const l = L();
  $('title').value = l.title;
  $('left').classList.toggle('en-only', !trOn);
  applyLangStyle(); trInterim = ''; showTrInt();
  notes.innerHTML = l.notes || ''; updateCount();
  renderVocab(); renderSummary(); renderSegments(); renderLessons(); refreshPlayer();
  applyKind(); renderMarks(); loadDoc();
  stick.en = stick.tr = true; autoscroll();
}

// dışa aktarma
function lessonHTML() {
  const l = L(), rtl = l.lang === 'ur';
  const rows = l.segs.map(s => '<tr><td class="t">' + (s.t != null ? fmt(s.t) : '') + '</td><td>' + (s.star ? '<b>' + esc(s.en) + '</b>' : esc(s.en)) + '</td><td dir="' + (rtl ? 'rtl' : 'ltr') + '">' + esc(s.tr || '') + '</td></tr>').join('');
  const vocab = l.vocab.map(v => '<tr><td><b>' + esc(v.w) + '</b></td><td dir="' + (rtl ? 'rtl' : 'ltr') + '">' + esc(v.m) + '</td><td>' + esc(v.ex || '') + '</td></tr>').join('');
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(l.title) + '</title><style>'
    + 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111}h1{font-size:20pt;margin-bottom:2pt}h2{font-size:14pt;margin:18pt 0 6pt;border-bottom:1px solid #999}'
    + 'table{border-collapse:collapse;width:100%}td{border:1px solid #bbb;padding:4pt 6pt;vertical-align:top}td.t{width:40pt;color:#666;font-size:9pt}blockquote{border-left:3px solid #3b6cf5;margin:6pt 0;padding-left:8pt;color:#444}'
    + '</style></head><body><h1>' + esc(l.title) + '</h1><div>' + new Date(l.created).toLocaleString(LOC()) + '</div>'
    + (l.summary ? '<h2>' + T('Özet') + '</h2><ul>' + l.summary.pts.map(p => '<li>' + esc(p.s) + (p.t ? '<br><i>' + esc(p.t) + '</i>' : '') + '</li>').join('') + '</ul>' : '') + '<h2>' + T('Notlar') + '</h2>' + (l.notes || '<p>' + T('(boş)') + '</p>')
    + (l.vocab.length ? '<h2>' + T('Kelimeler') + '</h2><table>' + vocab + '</table>' : '')
    + (l.marks && l.marks.length ? '<h2>' + T('İşaretler') + '</h2><table>' + l.marks.map(m => '<tr><td class="t">s. ' + (m.p + 1) + '</td><td>' + esc(m.t) + '</td><td dir="' + (rtl ? 'rtl' : 'ltr') + '">' + esc(m.tr || '') + '</td></tr>').join('') + '</table>' : '')
    + (l.segs.length ? '<h2>' + T('Transkript (kalın = önemli)') + '</h2><table>' + rows + '</table>' : '') + '</body></html>';
}
const fileName = () => (L().title || 'ders').replace(/[\\/:*?"<>|]+/g, '-').trim();
$('exportBtn').onclick = () => { $('exportMenu').hidden = !$('exportMenu').hidden; $('setPop').hidden = true; };
$('langBtn').onclick = () => { $('setPop').hidden = !$('setPop').hidden; $('exportMenu').hidden = true; };
$('exportMenu').addEventListener('click', async e => {
  const b = e.target.closest('[data-exp]'); if (!b) return;
  $('exportMenu').hidden = true;
  const l = L();
  if (b.dataset.exp === 'notesdoc') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(l.title) + '</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45}blockquote{border-left:3px solid #3b6cf5;margin:6pt 0;padding-left:8pt;color:#444}</style></head><body><h1>' + esc(l.title) + '</h1>' + (l.notes || '<p>' + T('(boş)') + '</p>') + '</body></html>';
    download(new Blob(['\ufeff' + html], { type:'application/msword' }), fileName() + '-notlar.doc');
  } else if (b.dataset.exp === 'notestxt') download(new Blob([l.title + '\n\n' + notes.innerText], { type:'text/plain;charset=utf-8' }), fileName() + '-notlar.txt');
  else if (b.dataset.exp === 'doc') download(new Blob(['\ufeff' + lessonHTML()], { type:'application/msword' }), fileName() + '.doc');
  else if (b.dataset.exp === 'pdf') {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    f.onload = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60000); };
    f.srcdoc = lessonHTML();
    toast('Açılan pencerede "PDF olarak kaydet" seç');
  } else if (b.dataset.exp === 'txt') {
    const txt = l.title + (l.marks && l.marks.length ? '\n\n' + T('İŞARETLER') + '\n' + l.marks.map(m => 's. ' + (m.p + 1) + ': ' + m.t).join('\n') : '') + (l.summary ? '\n\n' + T('ÖZET') + '\n' + l.summary.pts.map(p => '- ' + p.s).join('\n') : '') + '\n\n' + T('NOTLAR') + '\n' + notes.innerText + '\n\n' + T('KELİMELER') + '\n' + l.vocab.map(v => v.w + ' - ' + v.m).join('\n')
      + '\n\n' + T('TRANSKRİPT') + ' (' + SRC[l.src || 'en'].name + ')\n' + l.segs.map(s => (s.star ? '* ' : '') + s.en).join('\n') + '\n\n' + T('ÇEVİRİ') + ' (' + LANGS[l.lang] + ')\n' + l.segs.map(s => s.tr || '').join('\n');
    download(new Blob([txt], { type:'text/plain;charset=utf-8' }), fileName() + '.txt');
  } else if (b.dataset.exp === 'mp3') {
    if (!l.recs.length) { toast('Bu derste ses kaydı yok'); return; }
    for (const [i, r] of l.recs.entries()) {
      const blob = await idbDo('audio', 'readonly', s => s.get(l.id + ':' + r.id));
      if (blob) { download(blob, fileName() + (l.recs.length > 1 ? '-' + (r.name || i + 1).toString().replace(/[\\/:*?"<>|]+/g, '-') : '') + (r.mime === 'audio/mpeg' ? '.mp3' : (r.ext || '.webm'))); await new Promise(x => setTimeout(x, 400)); }
    }
  }
});

// yedekleme
const blobToDataURL = b => new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
async function makeBackup(withAudio) {
  saveNow(); setStatus('Yedek hazırlanıyor...');
  const out = { app:'ders-asistani', v:1, at:Date.now(), db:DB, audio:{} };
  if (withAudio) for (const l of DB.lessons) for (const r of l.recs) {
    const key = l.id + ':' + r.id, blob = await idbDo('audio', 'readonly', s => s.get(key));
    if (blob) out.audio[key] = await blobToDataURL(blob);
  }
  if (withAudio) for (const l of DB.lessons) if (l.doc) {
    const key = l.id + ':doc', blob = await idbDo('audio', 'readonly', s => s.get(key));
    if (blob) out.audio[key] = await blobToDataURL(blob);
  }
  download(new Blob([JSON.stringify(out)], { type:'application/json' }), 'lecmic-yedek-' + new Date().toISOString().slice(0, 10) + (withAudio ? '-sesli' : '') + '.json');
  setStatus(''); toast('Yedek indirildi');
}
async function restoreBackup(file) {
  let j; try { j = JSON.parse(await file.text()); } catch { j = null; }
  if (!j || j.app !== 'ders-asistani' || !j.db || !j.db.lessons) { toast('Bu dosya bir Lecmic yedeği değil'); return; }
  let added = 0, had = 0;
  for (const l of j.db.lessons) {
    if (DB.lessons.some(x => x.id === l.id)) { had++; continue; }
    const keep = [];
    for (const r of l.recs || []) {
      const key = l.id + ':' + r.id, du = j.audio && j.audio[key];
      if (du) { const blob = await (await fetch(du)).blob(); await idbDo('audio', 'readwrite', s => s.put(blob, key)); keep.push(r); }
    }
    l.recs = keep;
    const dk = l.id + ':doc';
    if (j.audio && j.audio[dk]) { const dblob = await (await fetch(j.audio[dk])).blob(); await idbDo('audio', 'readwrite', s => s.put(dblob, dk)); }
    DB.lessons.push(l); added++;
  }
  for (const f of j.db.folders || []) if (!DB.folders.some(x => x.id === f.id)) DB.folders.push(f);
  saveNow(); renderLessons();
  toast(added + ' ders eklendi' + (had ? ', ' + had + ' tanesi zaten vardı' : ''));
}
$('bkLite').onclick = () => { $('exportMenu').hidden = true; makeBackup(false); };
$('bkFull').onclick = () => { $('exportMenu').hidden = true; makeBackup(true); };
$('bkRestore').onclick = () => { $('exportMenu').hidden = true; $('bkFile').click(); };
$('bkFile').onchange = () => { const f = $('bkFile').files[0]; $('bkFile').value = ''; if (f) restoreBackup(f); };

$('help').onclick = () => $('helpDlg').showModal();
$('ui').value = UI;
$('ui').onchange = () => {
  UI = $('ui').value; lsSet('ders-ui', UI);
  applyI18n(); renderLessons(); renderSegments(); renderSummary(); renderVocab(); refreshPlayer(); uiRec(); showEngine();
};
