// en temel akış: ders oluştur, not yaz, sayfayı yenile, her şey yerinde mi.
// dersleri IndexedDB'ye kaydetmeyi ve canlı sitedeki CSP ile sayfanın hatasız çalıştığını korur
import { test, expect } from '@playwright/test';

test('ders oluştur, not yaz, yenile: ders ve not yerinde', async ({ page }) => {
  const problems = [];
  page.on('pageerror', e => problems.push('hata: ' + e.message));
  page.on('console', m => { if (/Content Security Policy/.test(m.text())) problems.push('CSP: ' + m.text()); });

  await page.goto('/app');

  // ilk açılış rehberi: son adımda kayıt izni onaylanmadan "Başla" açılmaz
  const tour = page.locator('#tourDlg');
  await expect(tour).toBeVisible();
  for (let i = 0; i < 3; i++) await page.locator('#tourNext').click();
  await expect(page.locator('#tourNext')).toBeDisabled();
  await page.locator('#tourOk').check();
  await page.locator('#tourNext').click();
  await expect(tour).toBeHidden();

  // ders oluştur ve içine bir kayıt aç
  await page.locator('#newLesson').click();
  await page.locator('#askIn').fill('Smoke 101');
  await page.locator('#askOk').click();
  await expect(page.locator('#lessonList .frow .ln')).toHaveText('Smoke 101');
  await page.locator('#lessonList .frow [data-add]').click();
  await page.locator('#fMenu button').nth(1).click();
  await expect(page.locator('#lessonList .kids .lesson.on')).toBeVisible();

  // not yaz ve beklemeden yenile (sayfa kapanırken kaydetme de sınanmış olur)
  await page.locator('#notes').click();
  await page.keyboard.type('Bu not kalmalı');
  await page.reload();

  await expect(page.locator('#lessonList .frow .ln')).toHaveText('Smoke 101');
  await expect(page.locator('#lessonList .kids .lesson.on')).toBeVisible();
  await expect(page.locator('#notes')).toHaveText('Bu not kalmalı');
  // sayfa kapanırken localStorage'a yazılan bekleyen kopya, IndexedDB'ye aktarılınca silinmeli
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ders-pending'))).toBeNull();
  // yenileyince rehber tekrar çıkmaz
  await expect(tour).toBeHidden();
  expect(problems).toEqual([]);
});

// slayt fotoğrafı: açılır, yazısı cihazda tanınır (Tesseract, ilk seferde model jsDelivr'dan iner),
// tanınan yazının cümlesine tıklanınca çeviri şeridi çıkar
test('fotoğraf aç, yazısı tanınsın, cümlesi seçilsin', async ({ page }) => {
  test.setTimeout(120000);
  const problems = [];
  page.on('pageerror', e => problems.push('hata: ' + e.message));
  page.on('console', m => { if (/Content Security Policy/.test(m.text())) problems.push('CSP: ' + m.text()); });
  await page.addInitScript(() => { localStorage.setItem('ders-tour', '1'); localStorage.setItem('ders-recok', '1'); });
  await page.goto('/app');

  await page.locator('#docFile').setInputFiles(new URL('./fixtures/slide.png', import.meta.url).pathname);
  await expect(page.locator('.pg.img img')).toHaveCount(1);
  await expect(page.locator('#docTotal')).toHaveText('1');

  const layer = page.locator('.pg.img .textLayer.ocr');
  await expect(layer).toContainText('Models of Memory', { timeout:90000 });
  await expect(page.locator('#docOcr')).toBeHidden();

  // "bear" kelimesinin bulunduğu cümle, satır sonuna rağmen tam gelmeli
  await layer.locator('span', { hasText:/^bear/ }).click();
  await expect(page.locator('#selbar .sbo')).toHaveText('Most people cannot bear long lists of unrelated facts for more than a few seconds.');
  expect(problems).toEqual([]);
});
