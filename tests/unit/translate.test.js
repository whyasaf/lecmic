// kelimenin cümledeki anlamı. fixtures/google-bear.json Google'ın "bear" için verdiği gerçek cevap (hl=en).
// Google'ın fiil listesinde "dayanmak" yok; cümle çevirisi "dayanamıyorum" olursa hiçbir anlam eşleşmez.
// o zaman "ayı" değil, kelimenin cümledeki türüne göre fiil anlamı gelmeli
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadApp } from './load.js';

const BEAR = JSON.parse(readFileSync(new globalThis.URL('./fixtures/google-bear.json', import.meta.url).pathname, 'utf8'));
let app;
beforeAll(() => { app = loadApp(['js/translate.js'], ['parseSenses', 'pickSense', 'guessPos', 'wordInContext']); });

// sözlük isteğine gerçek cevap, cümle isteğine verilen çeviri
const google = sentenceTr => vi.fn(async url => ({ json:async () => (url.includes('dt=bd') ? BEAR : [[[sentenceTr, 'x']]]) }));

describe('parseSenses: gerçek Google cevabı', () => {
  it('çeviri, türe göre gruplar ve bütün anlamlar okunur', () => {
    const d = app.parseSenses(BEAR);
    expect(d.main).toBe('ayı');
    expect(d.groups.map(g => g.pos)).toEqual(['noun', 'verb']);
    expect(d.groups[1].ws.slice(0, 2)).toEqual(['taşımak', 'katlanmak']);
    expect(d.senses).toContain('dişini sıkmak');
  });
  it('bozuk cevapta null döner, çökmez', () => {
    for (const bad of [null, {}, 'Sorry...', [], [[]]]) expect(app.parseSenses(bad)).toBeNull();
  });
});

describe('guessPos', () => {
  it.each([
    ["I can't bear this noise anymore.", 'verb'],
    ['They bear the cost.', 'verb'],
    ['to bear', 'verb'],
    ['A bear came out of the forest.', 'noun'],
    ['the bear', 'noun'],
    ['Bear markets scare me.', null],
  ])('%s → %s', (s, pos) => expect(app.guessPos('bear', s)).toBe(pos));
});

describe('wordInContext', () => {
  it('çeviride geçen anlam varsa "bu cümlede" ile o seçilir', async () => {
    globalThis.fetch = google('Bu gürültüye artık katlanamıyorum.');
    const r = await app.wordInContext('bear', "I can't bear this noise anymore.", 'tr', 'en');
    expect(r).toMatchObject({ main:'katlanmak', ctx:true, pos:null });
  });
  it('geçmiyorsa "ayı" değil, türüne göre fiil anlamı gelir', async () => {
    // cümle çevirileri önbellekte tutuluyor, o yüzden önceki testten farklı bir cümle
    globalThis.fetch = google('Bu sıcağa artık dayanamıyorum.');
    const r = await app.wordInContext('bear', "I can't bear this heat anymore.", 'tr', 'en');
    expect(r).toMatchObject({ main:'taşımak', ctx:false, pos:'verb' });
  });
  it('isim olarak kullanılınca ayı', async () => {
    globalThis.fetch = google('Ormandan bir ayı çıktı.');
    const r = await app.wordInContext('bear', 'A bear came out of the forest.', 'tr', 'en');
    expect(r).toMatchObject({ main:'ayı', ctx:true });
  });
  it('türü de anlaşılamazsa düz anlam, etiketsiz', async () => {
    globalThis.fetch = google('Ayı piyasaları beni korkutuyor.');
    const r = await app.wordInContext('bear', 'Bear markets scare me.', 'tr', 'en');
    expect(r.main).toBe('ayı');
  });
});
