import { defineConfig } from '@playwright/test';

// testler, vercel.json'daki başlıkları (CSP dahil) uygulayan küçük bir sunucuya karşı çalışır.
// tarayıcı indirmez, bilgisayardaki Chrome'u kullanır
export default defineConfig({
  testDir:'e2e',
  timeout:30000,
  use:{ baseURL:'http://localhost:4173', channel:'chrome' },
  webServer:{ command:'node serve.js', url:'http://localhost:4173/app', reuseExistingServer:false }
});
