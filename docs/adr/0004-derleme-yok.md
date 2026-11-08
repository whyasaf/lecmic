# 4. Derleme adımı yok

**Durum:** Kabul edildi · 2026 · gözden geçirilecek

## Bağlam
Proje tek kişilik ve hızlı gelişiyor. Bir paketleyici (Vite, webpack), TypeScript derlemesi ve bağımlılık ağacı
kurulum, güncelleme ve hata ayıklama yükü getirir.

## Karar
Kod düz JavaScript, HTML ve CSS. Dosyalar tarayıcıda olduğu gibi çalışır, Vercel'e olduğu gibi gider. Kütüphaneler
`vendor/` klasöründe (ADR 6). Dosyalar klasik `<script>` olarak sırayla yüklenir ve ortak değişkenleri
(`DB`, `L()`, `R`) paylaşır.

## Sonuçlar
- `git push` yayınlamak için yeterli; kurulum ve derleme hatası yok.
- Testler için Vitest ve Playwright gerekiyor; bunlar kök klasörü etkilemesin diye `tests/` altında kendi
  `package.json`'larıyla durur (kökte `package.json` olsaydı Vercel yayında `npm install` çalıştırırdı).
  Birim testleri uygulama dosyalarını değiştirmeden, sitedeki sırayla jsdom içinde yükler.
- Bilinen borç: global kapsam ve script sırası bağımlılığı. Sıra değişirse uygulama kırılabilir
  (örneğin `cards.js`, `settings.js`'ten sonra yüklenmeli). Kod 10 bin satıra yaklaşınca bu canı yakar.
- Borcu azaltma, derleme adımı eklemeden:
  1. **Başladı:** tip denetimi. `tests/tsconfig.json` ile `tsc` sadece başında `// @ts-check` olan dosyaları
     denetler, CI'da çalışır. Şu an `core.js`, `sanitize.js`, `translate.js`. Diğer dosyalar teker teker eklenecek.
  2. Sonra: `<script type="module">` ile ES modüllerine geçmek (bütün ortak değişkenlere dokunduğu için ayrı bir iş,
     veri testleri ve CI hazır olduktan sonra).
  3. Kayıt durumları için küçük bir durum makinesi (`idle → rec → paused`).
