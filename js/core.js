// kısa yardımcılar
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
// iPad kendini Mac gibi tanıtıyor, dokunmatik olmasından ayırıyoruz
const IS_MOBILE = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
const IS_MAC = /Mac/.test(navigator.platform) && !IS_MOBILE, IS_WIN = /Win/.test(navigator.platform);
// çeviri dilleri
const LANGS = { tr:'Türkçe', en:'English', fr:'Français', es:'Español', ur:'اردو (Urdu)' };
// konuşulan diller: tanıma dili ve whisper'daki adı
const SRC = { en:{ name:'English', rec:'en-US', whisper:'english' }, tr:{ name:'Türkçe', rec:'tr-TR', whisper:'turkish' } };
const fmt = s => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p = n => String(n).padStart(2, '0');
  return (h ? h + ':' : '') + p(m) + ':' + p(x);
};
const IC = {
  play:'<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  star:'<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 21l1.2-6.5L2.5 9.9l6.6-.9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  note:'<svg viewBox="0 0 24 24" width="17" height="17"><path d="M5 4h14v12H9l-4 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5h6M9 11.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mic:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>',
  book:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12.5 8h3.5M12.5 12h3.5"/></svg>',
  doc:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  folder:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  chev:'<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus:'<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  pen:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  move:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M10 13h6M13.5 10.5 16 13l-2.5 2.5"/></svg>',
  trash:'<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
// tarayıcının kendi confirm/prompt kutusu kurulu uygulamada (Mac) görünmeyip sayfayı kilitleyebiliyor, o yüzden kendi penceremiz.
// input verilirse yazı kutusu çıkar ve girilen yazı döner, vazgeçilirse null. yoksa true/false döner
function ask(msg, { sub = '', input = null, ok = 'Tamam', danger = false, cancel = true } = {}) {
  return new Promise(res => {
    const d = $('askDlg'), inp = $('askIn');
    $('askMsg').textContent = msg;
    $('askSub').textContent = sub; $('askSub').hidden = !sub;
    inp.hidden = input === null; inp.value = input || '';
    $('askNo').hidden = !cancel;
    $('askOk').textContent = ok; $('askOk').className = 'btn ' + (danger ? 'danger' : 'primary');
    let yes = false;
    $('askOk').onclick = () => { yes = true; d.close(); };
    $('askNo').onclick = () => d.close();
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('askOk').click(); } };
    d.onclose = () => res(input === null ? yes : yes ? inp.value : null);
    d.showModal();
    if (input === null) $('askOk').focus(); else { inp.focus(); inp.select(); }
  });
}
// act verilirse yanında düğme olur: { label, fn }
function toast(msg, act) {
  const d = document.createElement('div'); d.textContent = msg;
  if (act) {
    const b = document.createElement('button'); b.textContent = act.label;
    b.onclick = () => { act.fn(); d.remove(); };
    d.appendChild(b); d.classList.add('act');
  }
  $('toast').appendChild(d);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 220); }, act ? 9000 : 3400);
}
const VERSION = 'Beta 0.9';
// kısayolların tuşu: Mac'te ⌘, Windows'ta Ctrl (ikisi de çalışır)
const MOD = IS_MAC ? '⌘' : 'Ctrl';
if (IS_MAC) {
  document.querySelectorAll('kbd.mod').forEach(k => { k.textContent = '⌘'; });
  document.querySelectorAll('[title*="Ctrl+"]').forEach(el => { el.title = el.title.replace('Ctrl+', '⌘'); });
}
// ayarlardan ya da cihazdan "hareketi azalt"
const reduceMotion = () => document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
// içeriği değişen kutu yeni boyutuna birden zıplamasın, yumuşakça büyüyüp küçülsün
function morph(el, change) {
  if (el.hidden || reduceMotion()) { clearTimeout(el._mT); el.style.width = el.style.height = ''; change(); return; }
  const a = el.getBoundingClientRect();
  clearTimeout(el._mT); el.style.width = el.style.height = '';
  change();
  const b = el.getBoundingClientRect();
  if (Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1) return;
  el.style.width = a.width + 'px'; el.style.height = a.height + 'px';
  void el.offsetWidth;
  el.style.width = b.width + 'px'; el.style.height = b.height + 'px';
  el._mT = setTimeout(() => { el.style.width = el.style.height = ''; }, 240);
}
// ilk açılışta kutu olduğu yerde belirir, açıkken yeri değişirse kayarak gider
function place(el, left, top) {
  const was = !el.hidden && !el.classList.contains('out');
  if (!was) el.classList.remove('placed');
  el.style.left = left + 'px'; el.style.top = top + 'px';
  if (!was) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('placed')));
}
// animasyonu baştan oynatır (aynı öğe yeniden güncellenince)
function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function setStatus(t) { $('status').textContent = t || ''; }
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 20000);
}

// dersler. her dersin transkripti, notu, kelimeleri ve ses kayıtları bunun içinde.
// DB.folders: birden çok belgeyi ve kaydı bir arada tutan dersler. içindekilerin folder alanı o dersin id'si
let DB;
const stamp = () => new Date().toLocaleString(LOC(), { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
function newLesson(word) {
  const d = new Date();
  return {
    id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    title: (word || (UI === 'en' ? 'Lesson' : 'Ders')) + ' - ' + stamp(),
    created: d.getTime(), src: lsGet('ders-src', 'en'), lang: lsGet('ders-lang', 'tr'), segs: [], notes: '', vocab: [], recs: []
  };
}
function loadDB() {
  try { const j = JSON.parse(lsGet('ders-v2', 'null')); if (j && j.lessons && j.lessons.length) { j.folders ||= []; return j; } } catch {}
  const first = newLesson();
  try { const s = JSON.parse(lsGet('ders-segments', '[]')); if (s.length) first.segs = s; } catch {}
  const n = lsGet('ders-notes-html', ''); if (n) first.notes = n;
  if (first.segs.length || first.notes) first.title = T('Önceki ders');
  return { lessons: [first], folders: [], cur: first.id };
}
// açık olan ders
const L = () => DB.lessons.find(l => l.id === DB.cur);
// kaydetmeyi biraz geciktirir, peş peşe yazmasın
let saveT;
const saveNow = () => { clearTimeout(saveT); lsSet('ders-v2', JSON.stringify(DB)); };
const save = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); };
addEventListener('pagehide', saveNow);

// ses dosyaları localStorage'a sığmaz, IndexedDB'de tutuluyor
const idb = new Promise(res => {
  try {
    const r = indexedDB.open('ders-audio2', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('chunks', { autoIncrement:true }); r.result.createObjectStore('audio'); };
    r.onsuccess = () => res(r.result); r.onerror = () => res(null);
  } catch { res(null); }
});
function idbDo(store, mode, fn) {
  return idb.then(db => !db ? undefined : new Promise(res => {
    try {
      const tx = db.transaction(store, mode), req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req && req.result); tx.onerror = tx.onabort = () => res();
    } catch { res(); }
  }));
}
function idbDeleteChunks(pred) {
  return idb.then(db => !db ? undefined : new Promise(res => {
    const tx = db.transaction('chunks', 'readwrite'), c = tx.objectStore('chunks').openCursor();
    c.onsuccess = () => { const cur = c.result; if (!cur) return; if (pred(cur.value)) cur.delete(); cur.continue(); };
    tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => res();
  }));
}
