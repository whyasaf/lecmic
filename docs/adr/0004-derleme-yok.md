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
- Bilinen borç: global kapsam ve script sırası bağımlılığı. Sıra değişirse uygulama kırılabilir
  (örneğin `cards.js`, `settings.js`'ten sonra yüklenmeli). Kod 10 bin satıra yaklaşınca bu canı yakar.
- Planlanan adım (beta sonrası): derleme adımı eklemeden `<script type="module">` ile ES modüllerine geçmek,
  dosyaların başına `// @ts-check` ve JSDoc tipleri eklemek, kayıt durumları için küçük bir durum makinesi
  (`idle → rec → paused`) yazmak.
