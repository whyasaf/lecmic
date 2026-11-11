// ayarlar penceresi. bölümler: genel, ders ve çeviri, mikrofon, veri, destek
// adres çubuğundan da açılır: #ayarlar/veri gibi
const SUPPORT_MAIL = 'whyasaf.wa@gmail.com';
const SEC_TITLE = { genel:'Genel', ders:'Ders ve çeviri', mikrofon:'Mikrofon', veri:'Veri', destek:'Destek' };
let setSec = 'genel';

function openSettings(sec) {
  const d = $('setDlg');
  // açılınca odak pencerenin kendisinde dursun, ilk düğmenin etrafında çerçeve çıkmasın
  if (!d.open) { d.showModal(); d.focus(); }
  showSec(sec || (innerWidth <= 760 ? '' : setSec));
}
// telefonda önce bölüm listesi görünür, bölüme girince içi
function showSec(sec) {
  const d = $('setDlg');
  d.classList.toggle('in-sec', !!sec);
  if (!sec) { history.replaceState(null, '', '#ayarlar'); return; }
  if (sec !== 'mikrofon') micTestStop();
  setSec = sec;
  d.querySelectorAll('.sh-nav [data-sec]').forEach(b => b.classList.toggle('on', b.dataset.sec === sec));
  d.querySelectorAll('.sh-body section').forEach(s => { s.hidden = s.dataset.sec !== sec; });
  $('secTitle').textContent = T(SEC_TITLE[sec]);
  $('setBody').scrollTop = 0;
  history.replaceState(null, '', '#ayarlar/' + sec);
  ({ genel:renderGeneral, ders:renderLessonSet, mikrofon:renderMicSet, veri:renderData, destek:renderSupport })[sec]();
}
function closeSettings() { micTestStop(); if ($('setDlg').open) $('setDlg').close(); }
$('setDlg').addEventListener('close', () => { micTestStop(); if (/^#ayarlar/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
$('setBtn').onclick = () => openSettings();
$('setClose').onclick = $('setClose2').onclick = closeSettings;
$('setBack').onclick = () => { micTestStop(); showSec(''); };
$('setDlg').querySelector('.sh-nav').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) showSec(b.dataset.sec); });
// pencerenin dışına tıklayınca kapanır
$('setDlg').addEventListener('click', e => { if (e.target === $('setDlg')) closeSettings(); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-open-set]');
  if (b) { $('setPop').hidden = true; openSettings(b.dataset.openSet); }
});
// metinlerdeki #ayarlar/... bağlantıları
addEventListener('hashchange', () => { const m = location.hash.match(/^#ayarlar\/?(\w*)/); if (m) openSettings(m[1] || undefined); });

// seçenek düğmeleri: seçilinin arkasındaki kutu kayarak gider
function segSet(el, v) {
  el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v)));
  const on = el.querySelector('button.on'), ink = el.querySelector('.segi');
  if (!on || !ink) return;
  Object.assign(ink.style, { width:on.offsetWidth + 'px', transform:'translateX(' + on.offsetLeft + 'px)', opacity:1 });
  requestAnimationFrame(() => ink.classList.add('ready'));
}
function segOn(el, fn) { el.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) { segSet(el, b.dataset.v); fn(b.dataset.v); } }); }
const segRO = new ResizeObserver(es => es.forEach(x => { const on = x.target.querySelector('button.on'); if (on) segSet(x.target, on.dataset.v); }));
document.querySelectorAll('#setDlg .segc').forEach(el => segRO.observe(el));

// ---- genel
const reduceSet = () => lsGet('ders-motion', 'full') === 'reduce';
function applyMotion() { if (reduceSet()) document.documentElement.dataset.motion = 'reduce'; else delete document.documentElement.dataset.motion; }
applyMotion();
function renderGeneral() {
  $('ui').value = UI;
  const t = lsGet('ders-theme', '');
  $('themePick').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
  $('fsRange').value = fs; $('fsVal').textContent = fs + ' px';
  $('fsPrev').style.fontSize = fs + 'px';
  segSet($('motionPick'), reduceSet() ? 'reduce' : 'full');
}
$('themePick').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  lsSet('ders-theme', b.dataset.v); applyTheme(); renderGeneral();
};
$('fsRange').oninput = () => { fs = +$('fsRange').value; lsSet('ders-fs', fs); applyFs(); $('fsVal').textContent = fs + ' px'; $('fsPrev').style.fontSize = fs + 'px'; };
segOn($('motionPick'), v => { lsSet('ders-motion', v); applyMotion(); });

// ---- ders ve çeviri
function renderLessonSet() {
  $('defSrc').innerHTML = Object.keys(SRC).map(k => '<option value="' + k + '">' + SRC[k].name + '</option>').join('');
  $('defSrc').value = lsGet('ders-src', 'en');
  const src = $('defSrc').value;
  $('defLang').innerHTML = Object.keys(LANGS).filter(k => k !== src).map(k => '<option value="' + k + '">' + LANGS[k] + '</option>').join('');
  $('defLang').value = lsGet('ders-lang', 'tr'); if (!$('defLang').value) $('defLang').selectedIndex = 0;
  const l = L(), pair = (l.src || 'en').toUpperCase() + ' → ' + l.lang.toUpperCase();
  $('engCard').classList.toggle('ok', !!translator);
  $('engTitle').textContent = translator ? T('Chrome çevirmeni hazır') + ' · ' + pair : T('İnternetten çeviri') + ' · ' + pair;
  $('engSub').textContent = translator ? T('Açık dersin çevirisi bu cihazda yapılıyor. İnternet gerekmez, sınırı yok.') : T('Bu dil çifti için Chrome\'un kendi çevirmeni yok, çeviri Google üzerinden yapılıyor.');
  $('setHover').checked = $('docHover').checked;
}
$('defSrc').onchange = () => { lsSet('ders-src', $('defSrc').value); if (lsGet('ders-lang', 'tr') === $('defSrc').value) lsSet('ders-lang', $('defSrc').value === 'tr' ? 'en' : 'tr'); renderLessonSet(); };
$('defLang').onchange = () => lsSet('ders-lang', $('defLang').value);
$('setHover').onchange = () => { $('docHover').checked = $('setHover').checked; $('docHover').onchange(); };

// ---- mikrofon
const MT_BARS = 28;
$('mtBars').innerHTML = '<i></i>'.repeat(MT_BARS);
let mt = null;
function renderMicSet() {
  $('setNs').checked = lsGet('ders-ns', '0') === '1';
  segSet($('ratePick'), lsGet('ders-rate', '1'));
  if (!mt) micTestIdle();
}
function micTestIdle(msg) {
  $('mtGo').textContent = T('Testi başlat');
  $('mtCard').classList.remove('live', 'heard', 'quiet');
  $('mtBars').querySelectorAll('i').forEach(b => { b.style.transform = 'scaleY(.08)'; });
  $('mtState').textContent = msg || '';
}
async function micTestStart() {
  if (R.state !== 'idle') { micTestIdle(T('Kayıt sürerken test edilemez. Alttaki ses çubuğuna bak.')); return; }
  $('mtState').textContent = T('Mikrofon isteniyor...');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio:micConstraints() }); }
  catch (e) { const [t, s] = micError(e); micTestIdle(T(t) + '. ' + T(s)); return; }
  const ctx = new AudioContext(); ctx.resume().catch(() => {});
  const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
  const td = new Uint8Array(an.fftSize), bars = [...$('mtBars').children], hist = new Array(MT_BARS).fill(0);
  const name = (stream.getAudioTracks()[0] || {}).label || '';
  $('mtName').textContent = name ? T('Dinlenen: ') + name : T('Mikrofon açık');
  $('mtGo').textContent = T('Durdur');
  $('mtCard').classList.add('live');
  $('mtState').textContent = T('Bir şeyler söyle...');
  const start = performance.now();
  let heard = false;
  mt = { stream, ctx, t:setInterval(() => {
    an.getByteTimeDomainData(td);
    let m = 0; for (const v of td) m = Math.max(m, Math.abs(v - 128));
    // ses seviyesi soldan sağa akar, en yeni ölçüm en sağda
    hist.shift(); hist.push(Math.min(1, Math.sqrt(m / 90)));
    bars.forEach((b, i) => { b.style.transform = 'scaleY(' + Math.max(.08, hist[i]).toFixed(3) + ')'; });
    if (m > 6 && !heard) { heard = true; $('mtCard').classList.add('heard'); $('mtCard').classList.remove('quiet'); $('mtState').textContent = T('Ses geliyor, mikrofon çalışıyor.'); }
    if (!heard && performance.now() - start > 6000 && !$('mtCard').classList.contains('quiet')) {
      $('mtCard').classList.add('quiet');
      $('mtState').textContent = T('Ses gelmiyor.') + ' ' + silentLines().join(' ');
    }
  }, 60) };
}
function micTestStop() {
  if (!mt) return;
  clearInterval(mt.t); mt.stream.getTracks().forEach(t => t.stop()); try { mt.ctx.close(); } catch {}
  mt = null; micTestIdle();
}
$('mtGo').onclick = () => mt ? micTestStop() : micTestStart();
$('setNs').onchange = () => { lsSet('ders-ns', $('setNs').checked ? '1' : '0'); if (mt) { micTestStop(); micTestStart(); } };
segOn($('ratePick'), v => { $('pRate').value = v; $('pRate').onchange(); });

// ---- veri
const fmtSize = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
async function renderData() {
  // yazılar (dersler, notlar), ses ve belgeler; hepsi IndexedDB'de
  const text = new Blob([JSON.stringify(DB)]).size;
  let audio = 0, docs = 0;
  try {
    const all = await idbDo('audio', 'readonly', s => s.getAll()), keys = await idbDo('audio', 'readonly', s => s.getAllKeys());
    (all || []).forEach((b, i) => { const n = (b && b.size) || 0; if (/:doc(\.\d+)?$/.test(keys[i])) docs += n; else audio += n; });
    for (const c of (await idbDo('chunks', 'readonly', s => s.getAll())) || []) audio += (c.blob && c.blob.size) || 0;
  } catch {}
  const total = text + audio + docs, parts = [['Yazılar', text, 'p1'], ['Ses kayıtları', audio, 'p2'], ['Belgeler', docs, 'p3']];
  $('stTotal').textContent = fmtSize(total);
  $('stBar').innerHTML = parts.map(([, v, c]) => '<i class="' + c + '" style="flex-grow:' + (v || 0) + '"></i>').join('');
  $('stLeg').innerHTML = parts.map(([n, v, c]) => '<span><i class="' + c + '"></i>' + T(n) + ' <b>' + fmtSize(v) + '</b></span>').join('');
  let persisted = false;
  try { persisted = await navigator.storage.persisted(); } catch {}
  $('persistTxt').textContent = persisted ? T('Açık. Tarayıcı yer açarken derslerini silmez.') : T('Kapalı. Cihazda yer azalırsa tarayıcı verileri silebilir.');
  $('persistBtn').hidden = persisted;
  const last = +lsGet('ders-lastbk', '0');
  $('bkLast').textContent = last ? T('Son yedek: ') + new Date(last).toLocaleDateString(LOC(), { day:'numeric', month:'long', year:'numeric' }) : T('Henüz hiç yedek almadın.');
  $('setBkRemind').checked = lsGet('ders-bkremind', '1') === '1';
}
$('persistBtn').onclick = async () => {
  let ok = false;
  try { ok = await navigator.storage.persist(); } catch {}
  if (!ok) toast(T('Tarayıcı izin vermedi. Uygulamayı yükleyince genelde verilir.'));
  renderData();
};
$('setBkRemind').onchange = () => lsSet('ders-bkremind', $('setBkRemind').checked ? '1' : '0');
$('wipeBtn').onclick = async () => {
  if (R.state !== 'idle') { toast('Önce kaydı bitir'); return; }
  if (!(await ask(T('Tüm veriler silinsin mi?'), { sub:T('Bütün dersler, notlar, kayıtlar ve belgeler bu cihazdan silinir. Geri alınamaz.'), ok:T('Devam'), danger:true }))) return;
  const w = await ask(T('Emin misin?'), { sub:T('Onaylamak için kutuya SİL yaz.'), input:'', ok:T('Hepsini sil'), danger:true });
  if (w === null) return;
  if (!['SİL', 'SIL', 'DELETE'].includes(w.trim().toLocaleUpperCase('tr'))) { toast(T('Silinmedi')); return; }
  await idbDo('audio', 'readwrite', s => s.clear()); await idbDo('chunks', 'readwrite', s => s.clear());
  await idbDo('lessons', 'readwrite', s => s.clear()); await idbDo('meta', 'readwrite', s => s.clear());
  DB = null;
  Object.keys(localStorage).filter(k => k.startsWith('ders-') && k !== 'ders-ui' && k !== 'ders-theme').forEach(k => localStorage.removeItem(k));
  location.replace(location.pathname);
};

// ---- destek
function deviceInfo() {
  const u = navigator.userAgent, v = re => (u.match(re) || [])[1];
  const br = v(/Edg\/(\d+)/) ? 'Edge ' + v(/Edg\/(\d+)/) : v(/Chrome\/(\d+)/) ? 'Chrome ' + v(/Chrome\/(\d+)/) : v(/Firefox\/(\d+)/) ? 'Firefox ' + v(/Firefox\/(\d+)/) : v(/Version\/(\d+).*Safari/) ? 'Safari ' + v(/Version\/(\d+).*Safari/) : '?';
  const os = /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'macOS' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : '?';
  const app = matchMedia('(display-mode: standalone)').matches ? ' · ' + T('uygulama') : '';
  return VERSION + ' · ' + br + ' · ' + os + app + ' · ' + innerWidth + '×' + innerHeight + ' · ' + T('çeviri') + ': ' + (translator ? 'Chrome' : 'Google');
}
let repType = 'hata';
// destekteki sürüm yazısı tek yerden (VERSION) gelir
document.querySelector('.about .ver').textContent = 'Sürüm ' + VERSION;
function renderSupport() { segSet($('repType'), repType); $('repDevTxt').textContent = deviceInfo(); setKeyOs(IS_MAC ? 'mac' : 'win'); }
// kısayol tablosu: Windows ya da Mac tuşları. her açılışta kendi sistemine döner
function setKeyOs(os) {
  segSet($('keyOs'), os);
  document.querySelectorAll('.ktab kbd.mod').forEach(k => { k.textContent = os === 'mac' ? '⌘ Cmd' : 'Ctrl'; replay(k, 'swap'); });
}
segOn($('keyOs'), setKeyOs);
segRO.observe($('keyOs'));
segOn($('repType'), v => { repType = v; });
const REP_NAME = { hata:'Hata', oneri:'Öneri', soru:'Soru' };
function reportBody() {
  const msg = $('repMsg').value.trim() || $('repTitle').value.trim();
  return msg + ($('repDev').checked ? '\n\n---\n' + deviceInfo() : '');
}
const reportSubject = () => '[Lecmic ' + VERSION + '] ' + T(REP_NAME[repType]) + ': ' + $('repTitle').value.trim();
function reportOk() {
  if ($('repTitle').value.trim().length < 3) { toast(T('Önce bir başlık yaz')); $('repTitle').focus(); return false; }
  return true;
}
$('repSend').onclick = () => {
  if (!reportOk()) return;
  const a = document.createElement('a');
  a.href = 'mailto:' + SUPPORT_MAIL + '?subject=' + encodeURIComponent(reportSubject()) + '&body=' + encodeURIComponent(reportBody());
  a.click();
};
$('repCopy').onclick = async () => {
  if (!reportOk()) return;
  try { await navigator.clipboard.writeText(T('Kime: ') + SUPPORT_MAIL + '\n' + T('Konu: ') + reportSubject() + '\n\n' + reportBody()); toast(T('Kopyalandı. E-postana yapıştırıp gönder.')); } catch {}
};
// sık sorulanlarda biri açılınca öbürleri kapanır
$('setDlg').querySelectorAll('.faq details').forEach(d => d.addEventListener('toggle', () => { if (d.open) $('setDlg').querySelectorAll('.faq details[open]').forEach(x => { if (x !== d) x.open = false; }); }));

// arayüz dili değişince açık bölüm yeni dilde yeniden yazılsın
$('ui').addEventListener('change', () => {
  if ($('setDlg').open && $('setDlg').classList.contains('in-sec')) showSec(setSec);
  if ($('legalDlg').open) showLegal(legalDoc);
});

// gizlilik ve yasal metinler: ayarların üstüne sağdan kayan okuma paneli. #gizlilik/kvkk gibi adresle de açılır
// metinlerin tek kopyası /gizlilik sayfasında. panel ilk açılışta oradan alır (service worker önbellekte tutar)
let legalLoaded = null;
function loadLegal() {
  return legalLoaded ||= fetch('/gizlilik').then(r => { if (!r.ok) throw 0; return r.text(); }).then(html => {
    const arts = new DOMParser().parseFromString(html, 'text/html').querySelectorAll('article[data-doc]');
    if (!arts.length) throw 0;
    $('legalBody').replaceChildren(...[...arts].map(a => document.importNode(a, true)));
  }).catch(() => { legalLoaded = null; $('legalLoad').textContent = T('Metinler yüklenemedi. İnternet bağlantını kontrol et.'); });
}
async function openLegal(doc) {
  const d = $('legalDlg');
  if (!d.open) { d.showModal(); d.focus(); }
  await loadLegal();
  showLegal(doc || 'kvkk');
}
let legalDoc = 'kvkk';
function showLegal(doc) {
  if (!['kvkk', 'gizlilik', 'kosullar'].includes(doc)) doc = 'kvkk';
  legalDoc = doc;
  const lang = UI === 'en' ? 'en' : 'tr';
  $('legalBody').querySelectorAll('article').forEach(a => { a.hidden = !(a.dataset.doc === doc && a.lang === lang); });
  segSet($('legalTabs'), doc); $('legalBody').scrollTop = 0;
  history.replaceState(null, '', '#gizlilik/' + doc);
}
segOn($('legalTabs'), showLegal);
segRO.observe($('legalTabs'));
$('legalClose').onclick = () => $('legalDlg').close();
$('legalDlg').addEventListener('click', e => { if (e.target === $('legalDlg')) $('legalDlg').close(); });
$('legalDlg').addEventListener('close', () => { if (/^#gizlilik/.test(location.hash)) history.replaceState(null, '', $('setDlg').open ? '#ayarlar/' + setSec : location.pathname + location.search); });
document.addEventListener('click', e => { const b = e.target.closest('[data-legal]'); if (b) openLegal(b.dataset.legal); });
addEventListener('hashchange', () => { const m = location.hash.match(/^#gizlilik\/?(\w*)/); if (m) openLegal(m[1]); });

// adres #ayarlar ya da #gizlilik ile açıldıysa (dersler yüklendikten sonra)
DBReady.then(() => {
  const m = location.hash.match(/^#ayarlar\/?(\w*)/), g = location.hash.match(/^#gizlilik\/?(\w*)/);
  if (m) openSettings(m[1] || undefined); else if (g) openLegal(g[1]);
});

// ilk açılışta 3 adımlık kısa rehber. içinde ders olan eski kullanıcılara çıkmaz
// son adım kayıt izni: onaylanmadan "Başla" açılmaz. onaylayana ilk kayıtta tekrar sorulmaz,
// rehberi atlayana ise ilk kayıtta sorulur (record.js)
let tourStep = 0;
const TOUR_LAST = $('tourDlg').querySelectorAll('section').length - 1;
function showTourStep() {
  $('tourDlg').querySelectorAll('section').forEach(x => { x.hidden = +x.dataset.step !== tourStep; });
  $('tourDlg').querySelectorAll('.tr-dots i').forEach((x, i) => x.classList.toggle('on', i === tourStep));
  $('tourNext').textContent = T(tourStep === TOUR_LAST ? 'Başla' : 'Devam');
  $('tourNext').disabled = tourStep === TOUR_LAST && !$('tourOk').checked;
  $('tourSkip').textContent = T(tourStep ? 'Önceki' : 'Atla');
}
function openTour() { tourStep = 0; $('tourOk').checked = !!lsGet('ders-recok', ''); showTourStep(); $('tourDlg').showModal(); $('tourDlg').focus(); }
$('tourOk').onchange = showTourStep;
$('tourNext').onclick = () => {
  if (tourStep < TOUR_LAST) { tourStep++; showTourStep(); return; }
  if (!$('tourOk').checked) return;
  lsSet('ders-recok', '1'); $('tourDlg').close();
};
$('tourSkip').onclick = () => { if (tourStep) { tourStep--; showTourStep(); } else $('tourDlg').close(); };
$('tourDlg').addEventListener('close', () => lsSet('ders-tour', '1'));
$('tourAgain').onclick = () => { closeSettings(); openTour(); };
DBReady.then(() => setTimeout(() => {
  if (lsGet('ders-tour', '') || location.hash || DB.lessons.some(l => l.segs.length || l.notes || l.recs.length || l.doc)) return;
  openTour();
}, 1100));

// haftada bir yedek hatırlatması. ilk kullanımdan bir hafta geçmeden ya da üç gün içinde tekrar sormaz
if (!lsGet('ders-since', '')) lsSet('ders-since', Date.now());
DBReady.then(() => setTimeout(() => {
  if (lsGet('ders-bkremind', '1') !== '1') return;
  const used = DB.lessons.some(l => l.segs.length || l.notes || l.recs.length || l.doc);
  const now = Date.now(), WEEK = 7 * 864e5, base = Math.max(+lsGet('ders-lastbk', '0'), +lsGet('ders-since', now));
  if (!used || now - base < WEEK || now - +lsGet('ders-bknag', '0') < 3 * 864e5) return;
  lsSet('ders-bknag', now);
  toast(T('Bir haftadır yedek almadın.'), { label:T('Yedekle'), fn:() => openSettings('veri') });
}, 5000));
