// veri kaybı riski en yüksek yerler: açılışta derslerin yüklenmesi (loadDB), sekme kapanırken yazılamamış
// değişikliklerin kurtarılması (ders-pending) ve eski localStorage verisinin IndexedDB'ye taşınması.
// her test sıfır bir IndexedDB (fake-indexeddb) ve boş localStorage ile, uygulamanın gerçek core.js'iyle çalışır
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadApp } from './load.js';

const NAMES = ['loadDB', 'saveNow', 'save', 'idb', 'newLesson', 'getDB:() => DB', 'setDB:v => { DB = v; }', 'closeIDB:() => { IDB.close(); }', 'dirty'];
const lesson = (id, extra = {}) => ({ id, title:id, created:extra.created || 1, src:'en', lang:'tr', segs:[], notes:'', vocab:[], recs:[], ...extra });
const PENDING = 'ders-pending', LEGACY = 'ders-v2';

// uygulamanın açacağı veritabanını önceden doldurur (önceki bir oturumda kaydedilmiş gibi)
function openRaw() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('ders-audio2', 2);
    r.onupgradeneeded = () => ['chunks', 'audio', 'lessons', 'meta'].forEach(n => r.result.createObjectStore(n, n === 'chunks' ? { autoIncrement:true } : undefined));
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function seed(lessons, meta) {
  const db = await openRaw();
  await new Promise(res => {
    const tx = db.transaction(['lessons', 'meta'], 'readwrite');
    lessons.forEach(l => tx.objectStore('lessons').put(l, l.id));
    if (meta) tx.objectStore('meta').put(meta, 'db');
    tx.oncomplete = res;
  });
  db.close();
}
// IndexedDB'de şu an ne var
async function stored() {
  const db = await openRaw();
  const out = await new Promise(res => { const r = db.transaction('lessons').objectStore('lessons').getAll(); r.onsuccess = () => res(r.result); });
  db.close();
  return Object.fromEntries(out.map(l => [l.id, l]));
}
const until = async (fn, ms = 2000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error('zaman aşımı'); await new Promise(r => setTimeout(r, 10)); } };

// uygulamayı aç: dersleri yükle, DB'ye koy
async function boot() {
  const app = loadApp([], NAMES);
  await app.idb;
  app.setDB(await app.loadDB());
  return app;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('loadDB: kaydedilmiş dersler', () => {
  it('IndexedDB\'deki dersler ve açık ders geri gelir', async () => {
    await seed([lesson('a', { notes:'<p>a</p>' }), lesson('b')], { cur:'b', folders:[] });
    const app = await boot();
    expect(app.getDB().lessons.map(l => l.id).sort()).toEqual(['a', 'b']);
    expect(app.getDB().cur).toBe('b');
  });
  it('açık ders artık yoksa en yeni ders açılır', async () => {
    await seed([lesson('a', { created:5 }), lesson('b', { created:9 })], { cur:'silinmis', folders:[] });
    expect((await boot()).getDB().cur).toBe('b');
  });
  it('hiç veri yoksa boş bir ders açılır', async () => {
    const d = (await boot()).getDB();
    expect(d.lessons).toHaveLength(1);
    expect(d.cur).toBe(d.lessons[0].id);
  });
});

describe('ders-pending: sekme kapanırken yazılamamış değişiklikler', () => {
  it('IndexedDB\'deki eski hâlin yerine geçer, kaydedilince günlük silinir', async () => {
    await seed([lesson('a', { notes:'<p>eski</p>' })], { cur:'a', folders:[] });
    localStorage.setItem(PENDING, JSON.stringify({ lessons:[lesson('a', { notes:'<p>yeni</p>' })], gone:[], meta:{ cur:'a', folders:[] } }));
    const app = await boot();
    expect(app.getDB().lessons[0].notes).toBe('<p>yeni</p>');
    // değişiklik olmasa da günlük IndexedDB'ye işlenir ve ancak ondan sonra silinir
    app.saveNow();
    await until(() => localStorage.getItem(PENDING) === null);
    expect((await stored()).a.notes).toBe('<p>yeni</p>');
  });
  it('IndexedDB\'ye hiç yazılamamış yeni ders eklenir', async () => {
    await seed([lesson('a')], { cur:'a', folders:[] });
    localStorage.setItem(PENDING, JSON.stringify({ lessons:[lesson('yeni', { created:7 })], gone:[], meta:{ cur:'yeni', folders:[] } }));
    const d = (await boot()).getDB();
    expect(d.lessons.map(l => l.id).sort()).toEqual(['a', 'yeni']);
    expect(d.cur).toBe('yeni');
  });
  it('silinen ders geri dirilmez', async () => {
    await seed([lesson('a'), lesson('b')], { cur:'a', folders:[] });
    localStorage.setItem(PENDING, JSON.stringify({ lessons:[], gone:['b'], meta:{ cur:'a', folders:[] } }));
    expect((await boot()).getDB().lessons.map(l => l.id)).toEqual(['a']);
  });
  it('günlük bütün dersleri silmek istese de hiçbiri silinmez', async () => {
    await seed([lesson('a'), lesson('b')], { cur:'a', folders:[] });
    localStorage.setItem(PENDING, JSON.stringify({ lessons:[], gone:['a', 'b'], meta:{ cur:'a', folders:[] } }));
    expect((await boot()).getDB().lessons).toHaveLength(2);
  });
  it('bozuk günlük açılışı durdurmaz, kayıtlı dersler gelir', async () => {
    await seed([lesson('a', { notes:'<p>a</p>' })], { cur:'a', folders:[] });
    for (const bad of ['{yarım', '"metin"', '{"lessons":"x"}', '{"lessons":[null,{"id":5},{"title":"idsiz"}]}']) {
      localStorage.setItem(PENDING, bad);
      const d = (await boot()).getDB();
      expect(d.lessons.map(l => l.id)).toEqual(['a']);
      expect(d.lessons[0].notes).toBe('<p>a</p>');
    }
  });
  it('sayfa gizlenirken değişiklik aynı anda localStorage\'a da yazılır', async () => {
    await seed([lesson('a')], { cur:'a', folders:[] });
    const app = await boot();
    app.getDB().lessons[0].notes = '<p>son an</p>';
    app.saveNow(true, true);
    // IndexedDB yazması bitmeden sayfa ölse bile bu kayıt kalır
    const p = JSON.parse(localStorage.getItem(PENDING));
    expect(p.lessons[0].notes).toBe('<p>son an</p>');
    await until(() => localStorage.getItem(PENDING) === null);
    expect((await stored()).a.notes).toBe('<p>son an</p>');
  });
  it('sayfa ölürse sonraki açılışta günlükten kurtarılır', async () => {
    await seed([lesson('a', { notes:'<p>eski</p>' })], { cur:'a', folders:[] });
    const app = await boot();
    app.getDB().lessons[0].notes = '<p>son an</p>';
    app.closeIDB();  // IndexedDB yazması hiç gerçekleşmez
    app.saveNow(true, true);
    expect((await stored()).a.notes).toBe('<p>eski</p>');
    const app2 = await boot();
    expect(app2.getDB().lessons[0].notes).toBe('<p>son an</p>');
  });
});

describe('localStorage\'dan IndexedDB\'ye taşıma', () => {
  const old = { lessons:[lesson('x', { notes:'<p>eski sürüm</p>' }), lesson('y')], cur:'x' };
  it('eski veri yüklenir, IndexedDB\'ye yazılır, eski kopya ancak ondan sonra silinir', async () => {
    localStorage.setItem(LEGACY, JSON.stringify(old));
    const app = await boot();
    expect(app.getDB().lessons.map(l => l.id)).toEqual(['x', 'y']);
    expect(app.getDB().folders).toEqual([]);
    expect(localStorage.getItem(LEGACY)).not.toBeNull();
    app.saveNow();
    await until(() => localStorage.getItem(LEGACY) === null);
    const s = await stored();
    expect(Object.keys(s).sort()).toEqual(['x', 'y']);
    expect(s.x.notes).toBe('<p>eski sürüm</p>');
  });
  it('yazma başarısız olursa eski kopya silinmez, ders yeniden denenmek üzere işaretli kalır', async () => {
    localStorage.setItem(LEGACY, JSON.stringify(old));
    const app = await boot();
    app.closeIDB();
    app.getDB().lessons[0].notes = '<p>değişti</p>';
    app.saveNow();
    await new Promise(r => setTimeout(r, 50));
    expect(localStorage.getItem(LEGACY)).not.toBeNull();
    expect(app.dirty.has('x')).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
  it('IndexedDB\'de ders varsa eski kopya kullanılmaz', async () => {
    await seed([lesson('yeni')], { cur:'yeni', folders:[] });
    localStorage.setItem(LEGACY, JSON.stringify(old));
    expect((await boot()).getDB().lessons.map(l => l.id)).toEqual(['yeni']);
  });
  it('en eski sürümün transkripti ve notu "Önceki ders" olarak gelir', async () => {
    localStorage.setItem('ders-segments', JSON.stringify([{ en:'hello', tr:'merhaba', t:0 }]));
    localStorage.setItem('ders-notes-html', '<p>not</p>');
    const d = (await boot()).getDB();
    expect(d.lessons[0].title).toBe('Önceki ders');
    expect(d.lessons[0].segs[0].tr).toBe('merhaba');
    expect(d.lessons[0].notes).toBe('<p>not</p>');
  });
});

describe('save: işaretlenen ders', () => {
  it('sadece işaretli ders yazılır, diğerine dokunulmaz', async () => {
    await seed([lesson('a'), lesson('b')], { cur:'a', folders:[] });
    const app = await boot();
    const [a, b] = app.getDB().lessons.sort((x, y) => x.id.localeCompare(y.id));
    a.notes = '<p>a2</p>'; b.notes = '<p>b2</p>';
    app.save('a');
    await until(() => !app.dirty.size);
    await new Promise(r => setTimeout(r, 400));
    const s = await stored();
    expect(s.a.notes).toBe('<p>a2</p>');
    expect(s.b.notes).toBe('');
    // tam kayıt kaçırılan değişikliği de yakalar
    app.saveNow();
    await until(() => false, 300).catch(() => {});
    expect((await stored()).b.notes).toBe('<p>b2</p>');
  });
});
