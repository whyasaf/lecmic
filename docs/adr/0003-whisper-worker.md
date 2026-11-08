# 3. Ses dosyasından transkript Whisper ile, tarayıcıda ve bir Worker içinde

**Durum:** Kabul edildi · 2026

## Bağlam
Hazır bir ders kaydını yazıya dökmek için sesi bir sunucuya göndermek ADR 1 ile çelişir. Whisper modelleri
Transformers.js ile tarayıcıda çalışabiliyor ama 40-250 MB ve işlem ağır; ana iş parçacığında çalışırsa sayfa donar.

## Karar
- Whisper, Transformers.js (sürümü sabitlenmiş) ile bir Web Worker içinde çalışır. Ses parça parça gönderilir,
  çıkan metin hemen derse eklenir.
- Ekran kartı (WebGPU) varsa tam hassasiyetli model, yoksa WASM. Telefonda bellek yetmediği için her zaman WASM.
- Ses, sessiz anlardan kesilerek en fazla 30 saniyelik parçalara bölünür; tamamen sessiz parçalar modele hiç
  verilmez, tekrar eden çıktılar temizlenir.
- Model ilk kullanımda Hugging Face'ten bir kez indirilir; ses hiçbir yere gitmez.

## Sonuçlar
- Gizlilik korunur, sunucu maliyeti yok.
- İlk kullanım yavaş (model indirme), zayıf cihazlarda yazıya dökme uzun sürer.
- Kütüphane ve modeller CDN'den geldiği için bu özellik internet ister ve CSP'de `cdn.jsdelivr.net`, `huggingface.co`
  izinleri (betik, bağlantı ve worker için) ile `'wasm-unsafe-eval'` gerekir.
