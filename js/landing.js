// tanıtım ve gizlilik sayfaları: dil düğmesi, üst çubuk, kayarak görünme, temaya ve dile göre ekran görüntüleri
const d = document.documentElement, $$ = s => document.querySelectorAll(s);
const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const dark = () => d.dataset.theme ? d.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;

function applyUI() {
  const ui = d.dataset.ui, en = ui === 'en';
  d.lang = ui;
  if (d.dataset.titleEn) { d.dataset.titleTr ||= document.title; document.title = en ? d.dataset.titleEn : d.dataset.titleTr; }
  $$('.lng button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === ui));
  $$('[data-alt-en]').forEach(el => { el.dataset.altTr ||= el.alt; el.alt = en ? el.dataset.altEn : el.dataset.altTr; });
  shots();
}
// ekran görüntüleri: img/shots/{dil}-{tema}-{ad}.webp
function shots() {
  const pre = '/img/shots/' + d.dataset.ui + '-' + (dark() ? 'dark' : 'light') + '-';
  $$('img[data-shot]').forEach(im => { const src = pre + im.dataset.shot + '.webp'; if (im.getAttribute('src') !== src) im.src = src; });
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', shots);
$$('.lng button').forEach(b => b.onclick = () => { d.dataset.ui = b.dataset.v; set('ders-ui', b.dataset.v); applyUI(); });
applyUI();

const bar = document.querySelector('.top');
const onScroll = () => bar && bar.classList.toggle('sc', scrollY > 8);
addEventListener('scroll', onScroll, { passive:true }); onScroll();

// ekrana girince bir kez yukarı kayarak belirir
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));
} else $$('.rv').forEach(el => el.classList.add('on'));

// sürüm tek yerde (js/core.js) tutuluyor
const ver = document.getElementById('ver');
if (ver) fetch('/js/core.js').then(r => r.text()).then(t => { const m = t.match(/VERSION\s*=\s*'([^']+)'/); if (m) ver.textContent = 'Lecmic ' + m[1]; }).catch(() => {});

// gizlilik sayfası: sekmeler seçili dildeki metne kaydırır, okunan metnin sekmesi seçili görünür
const tabs = $$('.ltabs a');
if (tabs.length) {
  const art = doc => document.querySelector('article[data-doc="' + doc + '"][lang="' + d.dataset.ui + '"]');
  const mark = doc => tabs.forEach(a => a.classList.toggle('on', a.dataset.doc === doc));
  const goTo = (doc, smooth) => { const a = art(doc); if (!a) return; a.scrollIntoView({ behavior:smooth ? 'smooth' : 'auto' }); mark(doc); };
  tabs.forEach(a => a.onclick = e => { e.preventDefault(); history.replaceState(null, '', '#' + a.dataset.doc); goTo(a.dataset.doc, true); });
  const h = location.hash.slice(1);
  if (h && art(h)) requestAnimationFrame(() => goTo(h, false)); else mark('kvkk');
  const seen = new Map();
  const io = new IntersectionObserver(es => {
    es.forEach(e => seen.set(e.target, e.isIntersecting));
    const vis = [...$$('article[data-doc]')].find(a => seen.get(a));
    if (vis) mark(vis.dataset.doc);
  }, { rootMargin:'-140px 0px -55% 0px' });
  $$('article[data-doc]').forEach(a => io.observe(a));
}

// Başla: tanıtımda seçilen dil uygulamada da geçerli olsun
$$('a[href="/app"]').forEach(a => a.addEventListener('click', () => set('ders-ui', d.dataset.ui)));
