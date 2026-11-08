# 5. Çeviride yedek zincir

**Durum:** Kabul edildi · 2026

## Bağlam
Ücretsiz ve hesap gerektirmeyen bir çeviri gerekiyor. Resmi çeviri API'leri anahtar ister; anahtar bir sunucuda
saklanmalı (ADR 1 ile çelişir) ve ücretlidir.

## Karar
Her çeviri sırayla şunları dener:
1. **Chrome'un yerleşik çevirmeni** (Translator API): cihazda çalışır, internet ve sınır yok.
2. **Google Çeviri'nin `client=gtx` bağlantısı**: resmi değil, anahtar istemez. Kelimenin bütün anlamlarını da
   verdiği için "kelimenin cümledeki anlamı" bunu kullanır.
3. **MyMemory**: Google cevap vermezse; günlük sınırı var.

Aynı cümle ve kelime için istekler önbelleğe alınır.

## Sonuçlar
- Masaüstü Chrome'da ders çevirisi çoğunlukla hiç internete çıkmaz.
- `gtx` her an kapanabilir ya da aynı ağdan çok istek gelince (ör. aynı okul Wi-Fi'ı) geçici olarak engellenebilir.
  O zaman MyMemory'ye, o da dolarsa "(çeviri alınamadı)" mesajına düşülür; uygulama çökmez.
- Kullanıcı sayısı artarsa kalıcı çözüm, küçük bir sunucu fonksiyonu üzerinden resmi bir API'ye geçmek.
