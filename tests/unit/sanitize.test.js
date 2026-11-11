// yedekten geri yükleme temizliği. yedek dosyası başkasından gelebilir; içindeki hiçbir şey kod çalıştırmamalı,
// dışarıya istek attırmamalı ya da uygulamayı bozmamalı
import { describe, it, expect, beforeAll } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeAll(() => { app = loadApp(); });

const lesson = over => ({ id:'l1', title:'Fizik', created:1, src:'en', lang:'tr', segs:[], notes:'', vocab:[], recs:[], ...over });
const backup = (lessons, extra = {}) => ({ app:'ders-asistani', v:1, db:{ lessons, folders:[] }, audio:{}, ...extra });
const DATA = 'data:audio/mpeg;base64,SUQzBAAAAAAA';
// temizlenmiş çıktı tekrar HTML'e yazıldığında çalışabilecek bir şey kalmış mı
const dangerous = html => /<script|onerror|onload|onclick|javascript:|<img|<iframe|<svg/i.test(html);

describe('cleanLesson: kimlikler', () => {
  it('kimliğinde HTML olan dersi hiç almaz', () => {
    expect(app.cleanLesson(lesson({ id:'"><img src=x onerror=alert(1)>' }))).toBeNull();
    expect(app.cleanLesson(lesson({ id:'x" onmouseover="alert(1)' }))).toBeNull();
    expect(app.cleanLesson(lesson({ id:'' }))).toBeNull();
    expect(app.cleanLesson(lesson({ id:'a'.repeat(41) }))).toBeNull();
  });
  it('kimliği olmayan, null ya da sayı olan dersi almaz (test() bunları "undefined"/"null" yazısına çevirip geçiriyordu)', () => {
    const { id, ...noId } = lesson();
    expect(app.cleanLesson(noId)).toBeNull();
    expect(app.cleanLesson(lesson({ id:null }))).toBeNull();
    expect(app.cleanLesson(lesson({ id:123 }))).toBeNull();
    const out = app.cleanLesson(lesson({ recs:[{ dur:1 }, { id:null }, { id:'r1' }], folder:null }));
    expect(out.recs.map(r => r.id)).toEqual(['r1']);
    expect('folder' in out).toBe(false);
    const b = app.cleanBackup({ app:'ders-asistani', db:{ lessons:[], folders:[{ title:'kimliksiz' }, { id:null }] } });
    expect(b.folders).toEqual([]);
  });
  it('ders olmayan girdiyi almaz', () => {
    for (const bad of [null, undefined, 'l1', 42, [], true]) expect(app.cleanLesson(bad)).toBeNull();
  });
  it('kimliği bozuk kaydı, işareti ve klasör bağını atar', () => {
    const out = app.cleanLesson(lesson({
      folder:'"><svg onload=alert(1)>',
      recs:[{ id:'r1', dur:3 }, { id:'r"><img src=x onerror=alert(5)>', dur:1 }],
      segs:[{ en:'Hi', rec:'r1"onclick="x' }]
    }));
    expect(out.folder).toBeUndefined();
    expect(out.recs.map(r => r.id)).toEqual(['r1']);
    expect(out.segs[0].rec).toBeUndefined();
  });
});

describe('cleanLesson: notlar', () => {
  it('<script>, olay öznitelikleri, javascript: bağlantısı ve resim kalmaz', () => {
    const out = app.cleanLesson(lesson({ notes:'<p>ok</p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">link</a><span onclick="alert(4)">tık</span><iframe src="https://evil.example"></iframe>' }));
    expect(dangerous(out.notes)).toBe(false);
    expect(out.notes).toContain('<p>ok</p>');
    expect(out.notes).toContain('tık');
    expect(out.notes).toContain('link');
  });
  it('sadece yapılacaklar kutusu (checkbox) kalır, diğer giriş kutuları silinir', () => {
    const out = app.cleanLesson(lesson({ notes:'<input type="text" value="x"><input type="checkbox" checked><input type="password">' }));
    expect(out.notes).toBe('<input type="checkbox" checked="">');
  });
  it('başlık, liste, vurgu gibi normal not biçimleri korunur', () => {
    const notes = '<h2>Konu</h2><ul><li><b>kalın</b> ve <i>italik</i></li></ul><blockquote>alıntı</blockquote>';
    expect(app.cleanLesson(lesson({ notes })).notes).toBe(notes);
  });
  it('not yazı değilse boş olur', () => {
    expect(app.cleanLesson(lesson({ notes:{ toString:() => '<script>x</script>' } })).notes).not.toMatch(/script/);
    expect(app.cleanLesson(lesson({ notes:null })).notes).toBe('');
  });
});

describe('cleanLesson: dil kodları ve alan türleri', () => {
  it('bilinmeyen dil kodu varsayılana döner, konuşma ve çeviri dili aynı olamaz', () => {
    expect(app.cleanLesson(lesson({ src:'zz', lang:'<b>' }))).toMatchObject({ src:'en', lang:'tr' });
    expect(app.cleanLesson(lesson({ src:'tr', lang:'tr' }))).toMatchObject({ src:'tr', lang:'en' });
  });
  it('dizi yerine yazı ya da null gelen alanlar boş dizi olur', () => {
    const out = app.cleanLesson(lesson({ segs:'not-array', vocab:null, recs:{ 0:{ id:'r1' } } }));
    expect(out.segs).toEqual([]); expect(out.vocab).toEqual([]); expect(out.recs).toEqual([]);
  });
  it('özetteki sayı alanlarına yazı konursa sayıya döner (HTML özniteliğine yazılıyor)', () => {
    const out = app.cleanLesson(lesson({ summary:{ pts:[{ s:'nokta', i:'1" onclick="alert(6)', g:'x' }], by:'<b>' } }));
    expect(out.summary.pts[0]).toMatchObject({ s:'nokta', i:0, g:0 });
    expect(out.summary.by).toBe('local');
  });
  it('işaret rengi sadece bilinen renklerden olabilir', () => {
    const out = app.cleanLesson(lesson({ kind:'doc', doc:{ name:'a.pdf', type:'pdf' }, marks:[{ id:'m1', c:'" style="x', r:[[1, 2], ['a', 3]] }] }));
    expect(out.marks[0].c).toBe('y');
    expect(out.marks[0].r).toEqual([[1, 2]]);
  });
  it('bilinmeyen belge türü belge sayılmaz', () => {
    const out = app.cleanLesson(lesson({ kind:'doc', doc:{ name:'x', type:'html' } }));
    expect(out.kind).toBeUndefined(); expect(out.doc).toBeUndefined();
  });
});

describe('cleanBackup: ses adresleri', () => {
  it('ses sadece dosyanın içindeki data: adresinden alınır, https ve javascript: atılır', () => {
    const b = app.cleanBackup(backup([lesson({ recs:[{ id:'r1' }, { id:'r2' }, { id:'r3' }], kind:'doc', doc:{ name:'a.pdf', type:'pdf' } })], {
      audio:{ 'l1:r1':DATA, 'l1:r2':'https://evil.example/steal', 'l1:r3':'javascript:alert(9)', 'l1:doc':'http://evil.example/a.pdf' }
    }));
    expect(Object.keys(b.audio)).toEqual(['l1:r1']);
    expect(b.audio['l1:r1']).toBe(DATA);
    // sesi gelmeyen kayıt listeden de düşer
    expect(b.lessons[0].recs.map(r => r.id)).toEqual(['r1']);
  });
  it('kimliği reddedilen dersin sesi de alınmaz', () => {
    const b = app.cleanBackup(backup([lesson({ id:'x"><img>' , recs:[{ id:'r1' }] })], { audio:{ 'x"><img>:r1':DATA } }));
    expect(b.lessons).toEqual([]); expect(b.audio).toEqual({});
  });
  it('yedek olmayan dosya null döner', () => {
    for (const bad of [null, {}, { app:'baska' }, { app:'ders-asistani' }, { app:'ders-asistani', db:{ lessons:'x' } }]) expect(app.cleanBackup(bad)).toBeNull();
  });
});

describe('cleanBackup: klasörler', () => {
  it('kimliği bozuk klasör atılır, başlıktaki HTML yazı olarak kalır (ekrana kaçışla yazılıyor)', () => {
    const b = app.cleanBackup({ ...backup([]), db:{ lessons:[], folders:[{ id:'f9', title:'<svg onload=alert(8)>' }, { id:'bad id!', title:'x' }, null] } });
    expect(b.folders).toHaveLength(1);
    expect(b.folders[0]).toMatchObject({ id:'f9', title:'<svg onload=alert(8)>', open:false });
  });
});

describe('cleanBackup: sağlam yedek bozulmaz', () => {
  it('normal bir yedek aynen geçer', () => {
    const good = lesson({
      title:'Fizik 101', folder:'f1', notes:'<p>Newton <b>yasaları</b></p>',
      segs:[{ en:'Hello class', tr:'Merhaba sınıf', t:1.5, rec:'r1', star:true }],
      vocab:[{ w:'bear', m:'katlanmak', ex:"I can't bear it.", box:2, due:123 }],
      recs:[{ id:'r1', dur:60, mime:'audio/mpeg', name:'Kayıt 1' }],
      summary:{ pts:[{ s:'Özet', en:'Summary', t:'Özet', g:0, i:0 }], by:'chrome', why:'', at:5 }
    });
    const b = app.cleanBackup({ ...backup([good], { audio:{ 'l1:r1':DATA } }), db:{ lessons:[good], folders:[{ id:'f1', title:'Fizik', created:1, open:true }] } });
    const out = b.lessons[0];
    expect(out).toMatchObject({ id:'l1', title:'Fizik 101', folder:'f1', notes:good.notes, src:'en', lang:'tr' });
    expect(out.segs).toEqual([{ en:'Hello class', tr:'Merhaba sınıf', t:1.5, rec:'r1', star:true }]);
    expect(out.vocab[0]).toMatchObject({ w:'bear', m:'katlanmak', box:2, due:123 });
    expect(out.recs[0]).toMatchObject({ id:'r1', dur:60, mime:'audio/mpeg', name:'Kayıt 1' });
    expect(out.summary).toMatchObject({ by:'chrome', at:5 });
    expect(b.folders[0]).toMatchObject({ id:'f1', title:'Fizik', open:true });
  });
});

describe('fotoğraf belgeleri', () => {
  const IMG = 'data:image/webp;base64,UklGRhoAAABXRUJQ';
  it('sayfa boyları sadece pozitif sayı çiftleri olabilir, sayfa sayısı boylardan gelir', () => {
    const out = app.cleanLesson(lesson({ kind:'doc', doc:{ name:'Fotoğraflar', type:'img', pages:99, dims:[[1200, 700], ['a', 3], [-1, 5], [2400, 1760, 9], 'x', [800, 1e9]] } }));
    expect(out.doc.type).toBe('img');
    expect(out.doc.dims).toEqual([[1200, 700]]);
    expect(out.doc.pages).toBe(1);
  });
  it('sayfa sayısı sınırlı, yedekten binlerce sayfa gelmez', () => {
    const dims = Array.from({ length:1000 }, () => [10, 10]);
    expect(app.cleanLesson(lesson({ kind:'doc', doc:{ name:'x', type:'img', dims } })).doc.pages).toBe(300);
  });
  it('her sayfanın fotoğrafı yedekten alınır, fazlası ve dışarıdan adresler alınmaz', () => {
    const b = app.cleanBackup(backup([lesson({ kind:'doc', doc:{ name:'F', type:'img', dims:[[10, 10], [10, 10]] } })], {
      audio:{ 'l1:doc':IMG, 'l1:doc.1':IMG, 'l1:doc.2':IMG, 'l1:doc.3':'https://evil.example/x.png' }
    }));
    expect(Object.keys(b.audio).sort()).toEqual(['l1:doc', 'l1:doc.1']);
  });
  it('PDF belgesinde ek sayfa anahtarı alınmaz', () => {
    const b = app.cleanBackup(backup([lesson({ kind:'doc', doc:{ name:'a.pdf', type:'pdf' } })], { audio:{ 'l1:doc':DATA, 'l1:doc.1':IMG } }));
    expect(Object.keys(b.audio)).toEqual(['l1:doc']);
  });
});
