// klavye kısayolları
addEventListener('keydown', e => {
  const typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]');
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'Enter') { e.preventDefault(); toggleMain(); return; }
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); $('q').focus(); $('q').select(); return; }
  if (e.key === 'Escape') { hideSelbar(); $('pop').hidden = true; $('exportMenu').hidden = true; $('setPop').hidden = true; if (document.activeElement === $('q')) $('q').blur(); return; }
  if (typing || mod || e.altKey) return;
  if (e.code === 'Space' && L().kind !== 'doc' && !e.target.closest('button,a,audio,summary')) {
    e.preventDefault();
    if (R.state === 'idle') startRec(); else if (R.state === 'rec') pauseRec(); else resumeRec();
  } else if (e.key === '/') { e.preventDefault(); $('q').focus(); }
  else if (e.key === '[') setSide($('app').classList.contains('side-closed'));
  else if (e.key === '+' || e.key === '=') bumpFs(2);
  else if (e.key === '-') bumpFs(-2);
});

// başlangıç
DB = loadDB();
applyTheme(); applyFs();
setSide(innerWidth > 760 && lsGet('ders-side', '1') === '1');
{ const v = parseFloat(lsGet('ders-sv', '')), h = parseFloat(lsGet('ders-sh', '')); if (v) applyV(v); if (h) applyH(h); }
renderAll();
uiRec();
applyI18n();
initTranslator(L().lang);
checkRecover();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
