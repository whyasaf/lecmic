# vendor

Lecmic'in kullandığı kütüphaneler CDN'den değil buradan yüklenir. Böylece bir CDN'de sorun çıksa da kullanıcıya
değiştirilmiş kod gitmez. Service worker bu dosyaları ilk açılışta önbelleğe aldığı için PDF/Word okuma, daha önce
hiç belge açılmamış olsa bile internetsiz çalışır. Dosyalara elle dokunulmaz, sadece aşağıdaki
kaynaktan aynen indirilir.

| Dosya | Sürüm | Kaynak | Lisans |
|---|---|---|---|
| `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs` | pdf.js 4.10.38 | npm `pdfjs-dist@4.10.38` → `build/` | Apache-2.0 |
| `mammoth.browser.min.js` | mammoth 1.6.0 | cdnjs `mammoth/1.6.0` | BSD-2-Clause |
| `lame.min.js` | lamejs 1.2.1 | cdnjs `lamejs/1.2.1` | LGPL-3.0 |
| `purify.min.js` | DOMPurify 3.4.17 | cdnjs `dompurify/3.4.17` | Apache-2.0 / MPL-2.0 |
| `tesseract/tesseract.min.js`, `tesseract/worker.min.js` | Tesseract.js 7.0.0 | npm `tesseract.js@7.0.0` → `dist/` | Apache-2.0 (`tesseract/LICENSE.md`) |
| `fonts/instrument-serif-*.woff2` | Instrument Serif (v5) | Google Fonts (`fonts.gstatic.com`), tanıtım sayfasındaki italik vurgular | OFL-1.1 (`fonts/OFL.txt`) |

pdf.js dosyaları npm paketinden alınıp paketin `integrity` değeriyle doğrulandı. Diğerleri cdnjs'in yayınladığı
SRI değerleriyle karşılaştırıldı.

## SHA-384

```
+0ti2moQlmLN7WZHE2RHIf5lV8hHxhxEalN0il3YZceG26fUPyOkR0hp9daxk1i7  pdfjs/pdf.min.mjs
ToeVvShCxKc6CEvhHeMt0Q8A06pSPDbAlngO9nokrDmh914gk/pYd0N7D0a4Lz2o  pdfjs/pdf.worker.min.mjs
nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz  mammoth.browser.min.js
xuasJXVcyv3hZq0eYpelEkBC8l4yufatZXDsKuyCU2rqfhDCb+ftuE/mSfZAteiK  lame.min.js
P0JNneQf81HOl9VwNXK76cQ9VMD6Nfsnepxb0cCOg8+UzEdzgPHAPV4wVQrvYQSx  purify.min.js
2BQ3U3OdKOb0Uczxqr41I9UvZkzr4V9Hv8uSzMMZAlmhsFClvdZX5wi5fDCzG+tM  tesseract/tesseract.min.js
iUyp1FxLBc4DYaSwxT1/G6elMdSh3vvQffNSmMiySoXDpk2XfS9ZcM4RjPSiqiw3  tesseract/worker.min.js
```

Kontrol etmek için: `openssl dgst -sha384 -binary <dosya> | openssl base64 -A`

Ses dosyasından transkript için kullanılan Transformers.js ve Whisper modelleri çok büyük olduğu için buraya
konmadı. Onlar `cdn.jsdelivr.net` ve `huggingface.co`'dan, sürümü sabitlenmiş olarak gelir (bkz. `js/import.js`).
Fotoğraftaki yazıyı tanıyan Tesseract'ın motoru (`tesseract.js-core@7.0.0`, ~4 MB) ve dil modelleri
(`@tesseract.js-data/eng@1.0.0`, `tur@1.0.0`, ~2-3 MB) de aynı sebeple jsDelivr'dan, sürümü sabit gelir (bkz. `js/doc.js`).
