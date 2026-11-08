// uygulamanın kendi dosyalarını, sitede yüklendikleri sırayla jsdom içinde çalıştırır.
// dosyalar modül değil düz betik olduğu için birleştirilip tek seferde değerlendiriliyor; testlerdeki
// temizleyici, sitedekinin aynısı (aynı DOMPurify, aynı kod)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// jsdom ortamında URL jsdom'un sürümü, dosya yolları bu yüzden path ile kuruluyor
const ROOT = join(fileURLToPath(import.meta.url), '../../..');
const BASE = ['vendor/purify.min.js', 'js/core.js', 'js/i18n.js'];

// files: BASE'den sonra yüklenecek dosyalar, names: dışarı verilecek fonksiyonlar
export function loadApp(files = ['js/sanitize.js'], names = ['cleanLesson', 'cleanBackup', 'cleanHTML', 'ID_RE']) {
  const code = [...BASE, ...files].map(f => readFileSync(join(ROOT, f), 'utf8')).join('\n;\n')
    + '\n;({ ' + names.join(', ') + ' });';
  return (0, eval)(code);
}
