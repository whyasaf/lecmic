# 1. Sunucu ve hesap yok, veriler cihazda

**Durum:** Kabul edildi · 2026

## Bağlam
Lecmic öğrencilerin ders kayıtlarını, notlarını ve okudukları belgeleri tutuyor. Bunlar kişisel ve bazen hassas
(hocanın sesi, sınav notları). Bir sunucu olsaydı hesap sistemi, veri saklama, KVKK yükümlülükleri, maliyet ve
güvenlik sorumluluğu gelirdi. Proje tek kişilik ve ücretsiz.

## Karar
Uygulama tamamen tarayıcıda çalışır. Lecmic'in sunucusu, veritabanı ve hesap sistemi yoktur. Site Vercel'de sabit
dosyalar olarak durur. Ders verisi sadece kullanıcının cihazında saklanır. Cihazlar arası taşıma için yedek dosyası
(JSON) kullanılır.

Bazı özellikler doğrudan tarayıcıdan üçüncü taraflara gider: canlı transkript (Chrome'un konuşma tanıması, Google),
çeviri (Google, MyMemory), yazıya dökme modeli (Hugging Face). Bunlar gizlilik metinlerinde açıkça yazılır.

## Sonuçlar
- Yoğunlukta çökecek bir sunucu yok, işletme maliyeti sıfıra yakın.
- KVKK kapsamında Lecmic'e gelen tek kişisel veri, kullanıcının kendi isteğiyle gönderdiği destek e-postası.
- Veri kaybının sorumluluğu kullanıcıya geçer: tarayıcı verisi silinirse dersler gider. Bunu yumuşatmak için
  kalıcı depolama izni, haftalık yedek hatırlatması ve kayıt hatasında kırmızı uyarı var.
- Senkronizasyon, paylaşım ve çok cihaz desteği bu kararla mümkün değil.
