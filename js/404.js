// bulunamadı sayfası: uygulamada seçilen temayı ve dili kullan
try { const t = localStorage.getItem('ders-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}
addEventListener('DOMContentLoaded', () => {
  try {
    if (localStorage.getItem('ders-ui') !== 'en') return;
    const $ = id => document.getElementById(id);
    document.documentElement.lang = 'en'; document.title = 'Page not found · Lecmic';
    $('h').textContent = 'Page not found'; $('p').textContent = 'This page does not exist or has moved.'; $('a').textContent = 'Back to Lecmic';
  } catch {}
});
