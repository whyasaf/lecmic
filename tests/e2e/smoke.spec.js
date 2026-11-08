// en temel akış: ders oluştur, not yaz, sayfayı yenile, her şey yerinde mi.
// dersleri IndexedDB'ye kaydetmeyi ve canlı sitedeki CSP ile sayfanın hatasız çalıştığını korur
import { test, expect } from '@playwright/test';

test('ders oluştur, not yaz, yenile: ders ve not yerinde', async ({ page }) => {
  const problems = [];
  page.on('pageerror', e => problems.push('hata: ' + e.message));
  page.on('console', m => { if (/Content Security Policy/.test(m.text())) problems.push('CSP: ' + m.text()); });

  await page.goto('/index.html');

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
