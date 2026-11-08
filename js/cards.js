// kelime kartları: defterdeki kelimelerle çalışma. kutu sistemi: bildiğin kelime giderek seyrek
// (1, 3, 7, 16 gün sonra), bilmediğin hemen tekrar gelir. kutu ve tarih kelimenin kendisinde saklanır
const BOX_DAYS = [0, 1, 3, 7, 16];
const CD_MAX = 20;
let cd = null, cdScope = 'lesson';
const cdPool = scope => (scope === 'all' ? DB.lessons : [L()]).flatMap(l => (l.vocab || []).map(v => ({ v, l })));
const isDue = v => !v.due || v.due <= Date.now();

// kelime sekmesindeki çubuk: kaç kelime tekrar bekliyor
function renderVocabBar() {
  const all = cdPool('all'), mine = cdPool('lesson'), due = mine.filter(x => isDue(x.v)).length;
  $('vBar').hidden = !all.length;
  $('vDue').textContent = !mine.length ? T('Diğer derslerde kelimelerin var') : due ? due + T(' kelime tekrar bekliyor') : T('Bu dersin hepsi tekrar edildi');
}

function openCards() {
  cdScope = cdPool('lesson').length ? 'lesson' : 'all';
  $('cardDlg').showModal(); $('cardDlg').focus();
  segSet($('cdScope'), cdScope);
  cdStart(false);
}
// all: tekrar zamanı gelmemişleri de al
function cdStart(all) {
  let q = cdPool(cdScope);
  if (!all) q = q.filter(x => isDue(x.v));
  // önce en az bilinenler, kendi içinde karışık
  q = q.map(x => ({ ...x, r:Math.random() })).sort((a, b) => (a.v.box || 0) - (b.v.box || 0) || a.r - b.r).slice(0, CD_MAX);
  cd = { q, i:0, known:0, again:0 };
  if (!q.length) { cdEnd(cdPool(cdScope).length ? 'rested' : 'empty'); return; }
  cdShow();
}
function cdShow() {
  const { v, l } = cd.q[cd.i], card = $('cdCard'), src = cdScope === 'all' ? l.title : '';
  $('cdEnd').hidden = true; card.hidden = false;
  // yeni kart dönmeden, sağdan kayarak gelsin
  card.classList.add('instant'); card.classList.remove('flipped'); void card.offsetWidth; card.classList.remove('instant');
  replay(card, 'enter');
  $('cdWord').textContent = $('cdWord2').textContent = v.w;
  $('cdSrc').textContent = $('cdSrc2').textContent = src;
  $('cdMean').textContent = v.m || '';
  $('cdEx').textContent = v.ex || ''; $('cdEx').hidden = !v.ex;
  $('cdFlip').hidden = false; $('cdAns').hidden = true; $('cdEndB').hidden = true; $('cdKeys').hidden = false;
  $('cdBar').style.width = (cd.i / cd.q.length * 100) + '%';
  $('cdNum').textContent = (cd.i + 1) + ' / ' + cd.q.length;
}
function cdFlip() {
  if (!cd || cd.i >= cd.q.length || $('cdCard').classList.contains('flipped')) return;
  $('cdCard').classList.add('flipped');
  $('cdFlip').hidden = true; $('cdAns').hidden = false;
}
function cdAnswer(ok) {
  if (!cd || !$('cdCard').classList.contains('flipped')) return;
  const x = cd.q[cd.i];
  if (ok) { x.v.box = Math.min(4, (x.v.box || 0) + 1); x.v.due = Date.now() + BOX_DAYS[x.v.box] * 864e5; cd.known++; }
  else {
    x.v.box = 0; x.v.due = Date.now(); cd.again++;
    // bilinmeyen kelime bu turun sonunda bir kez daha gelir
    if (!x.re) cd.q.push({ ...x, re:true });
  }
  save(); renderVocab();
  cd.i++;
  if (cd.i < cd.q.length) cdShow(); else cdEnd('finish');
}
function cdEnd(kind) {
  $('cdCard').hidden = true; $('cdEnd').hidden = false; replay($('cdEnd'), 'enter');
  $('cdFlip').hidden = true; $('cdAns').hidden = true; $('cdKeys').hidden = true;
  $('cdBar').style.width = kind === 'finish' ? '100%' : '0%';
  $('cdNum').textContent = '';
  $('cdEndB').hidden = kind === 'empty';
  $('cdMore').textContent = T(kind === 'rested' ? 'Yine de çalış' : 'Bir tur daha');
  if (kind === 'empty') { $('cdEndT').textContent = T('Bu derste henüz kelime yok'); $('cdEndP').textContent = T('Metinde bir kelimeye tıkla ve "Defterime ekle" de. Ya da üstten "Tüm dersler"i seç.'); }
  else if (kind === 'rested') { $('cdEndT').textContent = T('Bugünlük bu kadar'); $('cdEndP').textContent = T('Tekrar zamanı gelen kelime yok. Bildiklerin birkaç gün sonra yeniden gelecek.'); }
  else { $('cdEndT').textContent = T('Tur bitti'); $('cdEndP').textContent = cd.known + T(' kez bildin, ') + cd.again + T(' kez tekrar dedin. Bilmediklerin yarın yeniden gelecek.'); }
}
$('vStudy').onclick = openCards;
$('cdClose').onclick = $('cdDone').onclick = () => $('cardDlg').close();
$('cdMore').onclick = () => cdStart(true);
$('cdFlip').onclick = cdFlip;
$('cdCard').onclick = cdFlip;
$('cdAgain').onclick = () => cdAnswer(false);
$('cdKnow').onclick = () => cdAnswer(true);
segOn($('cdScope'), v => { cdScope = v; cdStart(false); });
segRO.observe($('cdScope'));
$('cardDlg').addEventListener('click', e => { if (e.target === $('cardDlg')) $('cardDlg').close(); });
// boşluk çevirir, 1 tekrar, 2 biliyorum. tuşlar sayfaya geçmesin (boşluk kaydı başlatıyor)
$('cardDlg').addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest('button') && e.key === 'Enter') return; e.preventDefault(); if ($('cdCard').classList.contains('flipped')) return; cdFlip(); }
  else if (e.key === '1' || e.key === 'ArrowLeft') cdAnswer(false);
  else if (e.key === '2' || e.key === 'ArrowRight') cdAnswer(true);
  else return;
  e.stopPropagation();
});
