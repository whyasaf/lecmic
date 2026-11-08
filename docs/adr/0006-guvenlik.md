# 6. Kütüphaneler repoda, CSP ve dışarıdan gelen HTML'in temizlenmesi

**Durum:** Kabul edildi · 2026

## Bağlam
Bütün veri tarayıcıda olduğu için sayfada çalışan herhangi bir kod (bozulmuş bir CDN dosyası, kötü niyetli bir
PDF, başkasının paylaştığı bir yedek) bütün derslere ve notlara erişebilir. Öğrenciler birbirine PDF ve yedek
dosyası gönderiyor. İlk sürümde pdf.js 3.11 (CVE-2024-4367), CDN'den hash'siz kütüphaneler ve ham HTML olarak
basılan notlar vardı.

## Karar
- **Kütüphaneler repoda (`vendor/`):** pdf.js, mammoth, lamejs ve DOMPurify CDN yerine uygulamayla birlikte
  sunulur. Sürümler, kaynaklar ve SHA-384 değerleri `vendor/README.md`'de.
- **pdf.js 4.10.38** ve `isEvalSupported:false`.
- **DOMPurify:** Notlar (gösterirken, yapıştırırken, dışa aktarırken) ve Word belgesinin HTML çıktısı temizlenir.
- **Yedekten geri yükleme:** Kimlikler `/^[a-z0-9]{1,40}$/i` ile, dil kodları bilinen listeyle, alan türleri tek
  tek doğrulanır. Ses yalnızca dosyanın içindeki `data:` adresinden alınır, dışarıya istek atılmaz.
- **CSP (`vercel.json`):** Betik sadece kendi sitemizden ve (yazıya dökme için) `cdn.jsdelivr.net`'ten; satır içi
  betik yok; bağlantılar sadece kullanılan çeviri ve model adreslerine; sayfa başka sitede çerçeve içine alınamaz.

## Sonuçlar
- Bir açık bulunsa bile CSP ikinci bir kilit olur.
- Repo yaklaşık 2,5 MB büyüdü. PDF ve Word okuma internetsiz de çalışır.
- Kütüphane güncellemesi elle yapılır: yeni dosya indirilir, hash doğrulanır, `vendor/README.md` güncellenir.
- Stil için `'unsafe-inline'` hâlâ açık (HTML'de `style` öznitelikleri var). Betik kadar riskli değil, ileride
  kaldırılabilir.
