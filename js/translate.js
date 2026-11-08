// çeviri sırası: Chrome'un kendi çevirisi, olmazsa Google, o da olmazsa MyMemory
let translator = null, translatorKey = null;
function showEngine(why = '') {
  const e = $('engine');
  if (translator) { e.textContent = 'Chrome (çevrimdışı)'; e.className = 'pill ok'; e.title = 'Chrome\'un kendi çevirisi: sınırsız, internet gerekmez'; }
  else { e.textContent = 'Google (internet)'; e.className = 'pill warn'; e.title = 'İnternetten çeviri' + why; }
}
async function initTranslator(target = L().lang, src = L().src || 'en') {
  translator = null; translatorKey = null;
  let why = ' - bu tarayıcıda yerleşik çeviri yok';
  try {
    if ('Translator' in self) {
      const av = await Translator.availability({ sourceLanguage:src, targetLanguage:target });
      why = ' - Chrome bu dil için: ' + av;
      if (av !== 'unavailable') {
        translator = await Translator.create({
          sourceLanguage:src, targetLanguage:target,
          monitor: m => m.addEventListener('downloadprogress', e => { $('engine').textContent = 'Dil paketi iniyor %' + Math.round(e.loaded * 100); })
        });
        translatorKey = src + '>' + target;
      }
    }
  } catch (e) { translator = null; why += ' (' + e.name + ')'; }
  showEngine(why);
}
async function translate(text, target = L().lang, src = L().src || 'en') {
  if (translator && translatorKey === src + '>' + target) { try { return await translator.translate(text); } catch {} }
  try {
    const g = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + src + '&dt=t&tl=' + target + '&q=' + encodeURIComponent(text));
    const out = (await g.json())[0].map(p => p[0]).join('');
    if (out) return out;
  } catch {}
  const r = await fetch('https://api.mymemory.translated.net/get?langpair=' + src + '|' + target + '&q=' + encodeURIComponent(text));
  const j = await r.json(), t = j.responseData.translatedText || '';
  if (+j.responseStatus !== 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error('limit');
  return t;
}
const wordCache = new Map();
// kelime kutusunun içi: anlam, cümledeki anlamsa küçük etiketi, diğer anlamlar, istenirse cümlenin çevirisi
function meaningHTML(r, withSent) {
  const tag = r.ctx ? T('bu cümlede') : r.pos ? T(r.pos === 'verb' ? 'fiil olarak' : 'isim olarak') : '';
  return '<div class="mm">' + esc(r.main) + (tag ? ' <small>' + esc(tag) + '</small>' : '') + '</div>'
    + (r.others.length ? '<div class="mo">' + esc(T('diğer: ') + r.others.join(', ')) + '</div>' : '')
    + (withSent && r.sent ? '<div class="ms">' + esc(r.sent) + '</div>' : '');
}
async function translateWord(w, target, src = L().src || 'en') {
  const k = src + '>' + target + '|' + w.toLowerCase();
  if (!wordCache.has(k)) wordCache.set(k, await translate(w.toLowerCase(), target, src));
  return wordCache.get(k);
}

// kelimenin bu cümledeki anlamı. Google sözlüğünden kelimenin bütün anlamları türlerine göre alınır,
// cümlenin çevirisinde hangisi geçiyorsa o seçilir. geçmiyorsa (sözlükte o kelime yoksa) kelimenin türü
// cümledeki önceki kelimeden tahmin edilir ve o türün en sık anlamı gösterilir. o da olmazsa düz anlamı
const sensesCache = new Map(), sentCache = new Map();
function wordSenses(w, target, src) {
  const k = src + '>' + target + '|' + w.toLowerCase();
  if (!sensesCache.has(k)) sensesCache.set(k, (async () => {
    try {
      // hl=en: kelime türleri her zaman İngilizce gelsin (noun, verb), türe göre seçerken lazım
      const g = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + src + '&tl=' + target + '&hl=en&dt=t&dt=bd&q=' + encodeURIComponent(w.toLowerCase()));
      return parseSenses(await g.json());
    } catch { return null; }
  })());
  return sensesCache.get(k);
}
// j[0]: çeviri, j[1]: türe göre gruplar [tür, [anlamlar...], ...]
function parseSenses(j) {
  if (!Array.isArray(j)) return null;
  const main = (Array.isArray(j[0]) ? j[0] : []).map(p => p && p[0]).join('').trim();
  const groups = (Array.isArray(j[1]) ? j[1] : []).map(p => ({ pos:String(p && p[0] || ''), ws:(Array.isArray(p && p[1]) ? p[1] : []).filter(s => typeof s === 'string').map(s => s.trim()) })).filter(g => g.ws.length);
  const senses = [...new Set([main, ...groups.flatMap(g => g.ws)].filter(Boolean))];
  return senses.length ? { main:main || senses[0], senses, groups } : null;
}
// kelimenin cümledeki türünü önündeki kelimeden tahmin eder: "can't bear" fiil, "a bear" isim
const BEFORE_VERB = new Set(['to', 'can', "can't", 'cannot', 'could', "couldn't", 'will', "won't", 'would', "wouldn't", 'shall', 'should', "shouldn't", 'may', 'might', 'must', "mustn't", 'do', "don't", 'does', "doesn't", 'did', "didn't", 'i', 'you', 'we', 'they', 'not', 'never', 'always', 'often', 'please', "let's"]);
const BEFORE_NOUN = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'some', 'any', 'no', 'every', 'each', 'of', 'another']);
function guessPos(w, sentence) {
  const words = String(sentence || '').toLowerCase().replace(/[’`]/g, "'").match(/[\p{L}']+/gu) || [];
  const i = words.indexOf(w.toLowerCase()), prev = i > 0 ? words[i - 1] : '';
  return BEFORE_VERB.has(prev) ? 'verb' : BEFORE_NOUN.has(prev) ? 'noun' : null;
}
function translateSentence(text, target, src) {
  const k = src + '>' + target + '|' + text;
  if (!sentCache.has(k)) sentCache.set(k, translate(text, target, src).catch(e => { sentCache.delete(k); throw e; }));
  return sentCache.get(k);
}
// anlamın cümlede aranacak kökü. Türkçe ekler yüzünden sonu kırpılıyor: dayanmak -> dayan, kitap -> kita(b/p)
function senseStems(s, target) {
  return s.toLocaleLowerCase(target).split(/\s+/).filter(x => x.length > 1).map(x => {
    if (target === 'tr') {
      const verb = /m[ae]k$/.test(x);
      x = x.replace(/m[ae]k$/, '');
      // fiilde -iyor gelince son ünlü düşüyor: belgele -> belgeliyor, katla -> katlıyor
      if (verb && x.length > 3 && /[aeıioöuü]$/.test(x)) x = x.slice(0, -1);
      else if (x.length > 3 && /[pçtk]$/.test(x)) x = x.slice(0, -1);
    }
    else if (x.length > 5) x = x.slice(0, -2);
    return x;
  });
}
function pickSense(senses, sentTr, target) {
  const words = sentTr.toLocaleLowerCase(target).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  let best = null, bestLen = 0;
  for (const s of senses) {
    const stems = senseStems(s, target);
    if (!stems.length) continue;
    // kısa köklerde (ve, ol) yanlış eşleşme olmasın: kelimenin tamamı ya da en fazla birkaç harf eki
    const ok = stems.every(st => words.some(w => st.length >= 3 ? w.startsWith(st) : w === st));
    const len = stems.join('').length;
    if (ok && len > bestLen) { best = s; bestLen = len; }
  }
  return best;
}
// sentTr verilirse (transkriptte cümlenin çevirisi zaten var) cümle tekrar çevrilmez
async function wordInContext(w, sentence, target = L().lang, src = L().src || 'en', sentTr = '') {
  const d = await wordSenses(w, target, src);
  if (!d) return { main:await translateWord(w, target, src), ctx:false, others:[], sent:'' };
  if (!sentTr && sentence && sentence.length <= 1200) { try { sentTr = await translateSentence(sentence, target, src); } catch {} }
  const pick = sentTr ? pickSense(d.senses, sentTr, target) : null;
  // cümlede geçen anlam yoksa türden tahmin. "ayı" gibi yanlış bir en sık anlam yerine o türün ilk anlamı
  const pos = !pick && guessPos(w, sentence), grp = pos && d.groups.find(g => g.pos === pos);
  const main = pick || (grp && grp.ws[0]) || d.main;
  return { main, ctx:!!pick, pos:!pick && grp ? pos : null, others:d.senses.filter(s => s !== main).slice(0, 4), sent:sentTr };
}

// çeviri sekmesi için Google: çeviri, algılanan dil ve tek kelimede türüne göre anlamlar (isim, fiil...)
async function gtGoogle(text, from, to) {
  const g = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + from + '&tl=' + to + '&hl=' + UI + '&dt=t&dt=bd&q=' + encodeURIComponent(text));
  const j = await g.json();
  const out = (j[0] || []).map(p => p[0]).join('');
  if (!out) throw new Error('empty');
  const dict = (Array.isArray(j[1]) ? j[1] : []).map(p => ({ pos:String(p[0] || ''), ws:(Array.isArray(p[1]) ? p[1] : []).filter(s => typeof s === 'string') })).filter(d => d.ws.length);
  return { text:out, from:typeof j[2] === 'string' ? j[2] : from, dict };
}
// uzun metin parça parça gider. Google olmazsa normal çeviri sırası (Chrome, MyMemory), ama orada dil algılama yok
async function gtTranslate(text, from, to) {
  const pieces = text.length > 1500 ? text.match(/[^]{1,1500}(?:\s|$)/g) : [text];
  try {
    const rs = [];
    for (const p of pieces) rs.push(await gtGoogle(p.trim(), from, to));
    return { text:rs.map(r => r.text).join(' '), from:rs[0].from, dict:pieces.length === 1 ? rs[0].dict : [] };
  } catch {}
  if (from === 'auto') throw new Error('auto');
  const out = [];
  for (const p of pieces) out.push(await translate(p.trim(), to, from));
  return { text:out.join(' '), from, dict:[] };
}
