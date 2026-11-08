# 2. Veriler IndexedDB'de, her ders ayrı kayıt

**Durum:** Kabul edildi · 2026 (ilk sürümdeki localStorage kararının yerine)

## Bağlam
İlk sürümde bütün dersler tek bir JSON olarak `localStorage`'a yazılıyordu, ses kayıtları ve belgeler
IndexedDB'deydi. `localStorage` yaklaşık 5 MB ile sınırlı ve eşzamanlı çalışıyor. Bir saatlik dersin transkripti
ve çevirisi 100-150 KB tuttuğu için 30-40 dersten sonra sınır doluyordu. Yazma hatası yutulduğu için kayıt
sessizce duruyordu.

## Karar
- Dersler IndexedDB'de `lessons` deposunda, her ders kendi kimliğiyle ayrı bir kayıt. Açık ders ve klasörler
  `meta` deposunda.
- Kaydederken her dersin son yazılan hali hatırlanır, sadece değişen dersler yazılır.
- Eski sürümün `localStorage` verisi ilk açılışta otomatik taşınır. Eski kopya ancak taşıma başarıyla yazılınca
  silinir.
- Yazma başarısız olursa hata yutulmaz: ekranda kapanmayan bir uyarı ve "Hemen yedek al" düğmesi çıkar.
- Ayarlar gibi küçük, eşzamanlı okunması gereken değerler `localStorage`'da kalır.
- Notlara resim yapıştırmak engellenir (bir resim megabaytlarca yer tutuyordu).

## Sonuçlar
- Sınır artık cihazın diskiyle belirleniyor (genelde gigabaytlar).
- Açılış asenkron oldu: dersler yüklenmeden ekran gelmez (`DBReady`).
- Aynı anda iki sekme açıksa son yazan kazanır. Bu kabul edilen bir sınır.
