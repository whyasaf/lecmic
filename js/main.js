// klavye kısayolları
addEventListener('keydown', e => {
  const typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]');
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'Enter') { e.preventDefault(); toggleMain(); return; }
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); $('q').focus(); $('q').select(); return; }
  if (e.key === 'Escape') { hideSelbar(); $('pop').hidden = true; closeMenus(); if (document.activeElement === $('q')) $('q').blur(); return; }
  // açık bir pencere varken tek tuşlu kısayollar arkadaki sayfaya gitmesin
  if (typing || mod || e.altKey || document.querySelector('dialog[open]')) return;
  if (e.code === 'Space' && L().kind !== 'doc' && !e.target.closest('button,a,audio,summary')) {
    e.preventDefault();
    if (R.state === 'idle') startRec(); else if (R.state === 'rec') pauseRec(); else resumeRec();
  } else if (e.key === '/') { e.preventDefault(); $('q').focus(); }
  else if (e.key === '[') setSide($('app').classList.contains('side-closed'));
  else if (e.key === '+' || e.key === '=') bumpFs(2);
  else if (e.key === '-') bumpFs(-2);
});

// başlangıç. dersler IndexedDB'den gelir, o yüzden beklenir
applyTheme(); applyFs();
(async () => {
  DB = await loadDB();
  if (legacyLS || pendingLS) saveNow();
  setSide(innerWidth > 760 && lsGet('ders-side', '1') === '1');
  { const v = parseFloat(lsGet('ders-sv', '')), h = parseFloat(lsGet('ders-sh', '')); if (v) applyV(v); if (h) applyH(h); }
  renderAll();
  uiRec();
  applyI18n();
  initTranslator(L().lang);
  checkRecover();
  dbLoaded();
})();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
// açılış ekranını kaldır. çok hızlı açılınca göz kırpmış gibi olmasın diye en az yarım saniye kalır,
// dersler yüklenmeden de kalkmaz. kalkarken paneller sırayla gelir
DBReady.then(() => setTimeout(() => {
  $('splash').classList.add('done'); $('app').classList.add('enter');
  setTimeout(() => { $('splash').remove(); $('app').classList.remove('enter'); }, 700);
}, Math.max(0, 600 - performance.now())));
