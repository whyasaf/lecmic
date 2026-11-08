// tanıtım ve gizlilik sayfalarının başında çalışır (head içinde, CSP satır içi betiğe izin vermediği için ayrı dosyada)
// uygulamada seçilen tema ve dil kullanılır. ana adres her zaman tanıtım, uygulama /app'te.
// yalnız kurulu uygulamanın içinde (adres çubuğu yok) tanıtıma düşülürse uygulamaya dönülür
(() => {
  const d = document.documentElement, get = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const t = get('ders-theme'); if (t === 'light' || t === 'dark') d.dataset.theme = t;
  // dil seçilmemişse: tarayıcı Türkçe değilse İngilizce
  const u = get('ders-ui');
  d.dataset.ui = d.lang = u === 'en' || u === 'tr' ? u : /^tr\b/i.test(navigator.language || 'tr') ? 'tr' : 'en';
  if (d.dataset.page !== 'home') return;
  // eski bağlantılar: /#gizlilik/kvkk ve /#ayarlar/... uygulamadaydı
  const h = location.hash, g = h.match(/^#gizlilik\/?(\w*)/);
  const go = url => { d.style.visibility = 'hidden'; location.replace(url); };
  if (g) return go('/gizlilik' + (g[1] ? '#' + g[1] : ''));
  if (/^#ayarlar/.test(h)) return go('/app' + h);
  // ?tanitim: kurulu uygulamada da tanıtım açılsın
  if (new URLSearchParams(location.search).has('tanitim')) return;
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) go('/app' + h);
})();
