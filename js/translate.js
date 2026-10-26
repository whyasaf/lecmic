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
async function translateWord(w, target) {
  const k = (L().src || 'en') + '>' + target + '|' + w.toLowerCase();
  if (!wordCache.has(k)) wordCache.set(k, await translate(w.toLowerCase(), target));
  return wordCache.get(k);
}
