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
- `save(id)` dersi "değişti" diye işaretler; 300 ms sonra sadece işaretli dersler yazılır. Canlı kayıtta her
  cümlede bütün dersleri JSON'a çevirmek dönem sonunda telefonu yorardı.
- Güvenlik ağı: `saveNow()` bütün dersleri son yazılan halleriyle karşılaştırır. Ders değişimi, silme, taşıma gibi
  önemli anlarda ve sayfa gizlenirken çağrılır, böylece işaretlenmesi unutulmuş bir değişiklik de kaybolmaz.
- Sekme kapanırken başlayan IndexedDB yazması bitmeyebilir. Bu yüzden `pagehide`'ın yanında `visibilitychange`
  (sayfa gizlenince) da kaydeder; bu olay daha erken gelir ve telefonda daha güvenilirdir.
- Bu da yetmedi: smoke testi, not yazıp hemen yenileyince notun kaybolduğunu gösterdi (yenilemede yazma yarıda
  kesiliyor). Çözüm: sayfa kapanırken ya da gizlenirken, o an değişmiş dersler eşzamanlı olarak `localStorage`'a
  (`ders-pending`) da yazılır. IndexedDB yazması bitince silinir; bitmezse sonraki açılışta `loadDB` bunu alıp
  IndexedDB'ye aktarır. Normal kayıtlarda `localStorage`'a dokunulmaz, 5 MB sınırı geri gelmez.
- Yazma başarısız olursa o dersler yeniden işaretlenir, bir sonraki kayıtta tekrar denenir.
- Eski sürümün `localStorage` verisi ilk açılışta otomatik taşınır. Eski kopya ancak taşıma başarıyla yazılınca
  silinir.
- Yazma başarısız olursa hata yutulmaz: ekranda kapanmayan bir uyarı ve "Hemen yedek al" düğmesi çıkar.
- Ayarlar gibi küçük, eşzamanlı okunması gereken değerler `localStorage`'da kalır.
- Notlara resim yapıştırmak engellenir (bir resim megabaytlarca yer tutuyordu).

## Sonuçlar
- Sınır artık cihazın diskiyle belirleniyor (genelde gigabaytlar).
- Açılış asenkron oldu: dersler yüklenmeden ekran gelmez (`DBReady`).
- Aynı anda iki sekme açıksa son yazan kazanır. Bu kabul edilen bir sınır.
