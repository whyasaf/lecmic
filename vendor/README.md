# vendor

Lecmic'in kullandığı kütüphaneler CDN'den değil buradan yüklenir. Böylece bir CDN'de sorun çıksa da kullanıcıya
değiştirilmiş kod gitmez ve PDF/Word okuma internetsiz de çalışır. Dosyalara elle dokunulmaz, sadece aşağıdaki
kaynaktan aynen indirilir.

| Dosya | Sürüm | Kaynak | Lisans |
|---|---|---|---|
| `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs` | pdf.js 4.10.38 | npm `pdfjs-dist@4.10.38` → `build/` | Apache-2.0 |
| `mammoth.browser.min.js` | mammoth 1.6.0 | cdnjs `mammoth/1.6.0` | BSD-2-Clause |
| `lame.min.js` | lamejs 1.2.1 | cdnjs `lamejs/1.2.1` | LGPL-3.0 |
| `purify.min.js` | DOMPurify 3.4.17 | cdnjs `dompurify/3.4.17` | Apache-2.0 / MPL-2.0 |

pdf.js dosyaları npm paketinden alınıp paketin `integrity` değeriyle doğrulandı. Diğerleri cdnjs'in yayınladığı
SRI değerleriyle karşılaştırıldı.

## SHA-384

```
+0ti2moQlmLN7WZHE2RHIf5lV8hHxhxEalN0il3YZceG26fUPyOkR0hp9daxk1i7  pdfjs/pdf.min.mjs
ToeVvShCxKc6CEvhHeMt0Q8A06pSPDbAlngO9nokrDmh914gk/pYd0N7D0a4Lz2o  pdfjs/pdf.worker.min.mjs
nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz  mammoth.browser.min.js
xuasJXVcyv3hZq0eYpelEkBC8l4yufatZXDsKuyCU2rqfhDCb+ftuE/mSfZAteiK  lame.min.js
P0JNneQf81HOl9VwNXK76cQ9VMD6Nfsnepxb0cCOg8+UzEdzgPHAPV4wVQrvYQSx  purify.min.js
```

Kontrol etmek için: `openssl dgst -sha384 -binary <dosya> | openssl base64 -A`

Ses dosyasından transkript için kullanılan Transformers.js ve Whisper modelleri çok büyük olduğu için buraya
konmadı. Onlar `cdn.jsdelivr.net` ve `huggingface.co`'dan, sürümü sabitlenmiş olarak gelir (bkz. `js/import.js`).
