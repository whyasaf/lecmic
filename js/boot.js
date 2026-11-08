// sayfanın en başında çalışır (head içinde). CSP satır içi betiğe izin vermediği için ayrı dosyada
// açılış ekranı ilk anda doğru temada çıksın
try { const t = localStorage.getItem('ders-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}
// bir hata yüzünden açılış ekranı ekranda takılı kalmasın
addEventListener('load', () => setTimeout(() => { const s = document.getElementById('splash'); if (s) s.classList.add('done'); }, 3000));
