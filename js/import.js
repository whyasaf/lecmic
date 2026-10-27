// ses dosyasından transkript. whisper ayrı bir worker'da çalışıyor ki sayfa donmasın.
// ses 30 saniyelik parçalarla işleniyor, çıkan kısım hemen derse ekleniyor
const WORKER_SRC = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1';
env.allowLocalModels = false;
let asr = null, loaded = '';
self.onmessage = async e => {
  const m = e.data;
  try {
    if (loaded !== m.model) {
      const cb = p => { if (p.status === 'progress') self.postMessage({ type:'dl', pct:p.progress }); };
      try {
        // decoder q4 olunca saçma, tekrarlı ya da boş çıktı veriyor, o yüzden tam hali
        asr = await pipeline('automatic-speech-recognition', m.model, { device:'webgpu', dtype:{ encoder_model:'fp32', decoder_model_merged:'fp32' }, progress_callback:cb });
        self.postMessage({ type:'dev', dev:'webgpu' });
      } catch (err) {
        asr = await pipeline('automatic-speech-recognition', m.model, { progress_callback:cb });
        self.postMessage({ type:'dev', dev:'wasm' });
      }
      loaded = m.model;
    }
    const sr = 16000, F = sr / 10, audio = m.audio;
    // her 100 ms'nin ses yüksekliği. konuşma eşiği dosyanın kendi yüksekliğine göre, kısık kayıtlar da çalışsın
    const fr = new Float32Array(Math.ceil(audio.length / F));
    for (let k = 0; k < fr.length; k++) {
      const a = k * F, b = Math.min(audio.length, a + F); let s = 0;
      for (let i = a; i < b; i++) s += audio[i] * audio[i];
      fr[k] = Math.sqrt(s / (b - a));
    }
    const quiet = Math.max(.002, (Float32Array.from(fr).sort()[Math.floor(fr.length * .95)] || 0) * .08);
    // .en modeller task ve language kabul etmiyor
    const base = m.model.endsWith('.en') ? {} : { task:'transcribe', language:m.language };
    // whisper takılınca aynı şeyi arka arkaya yazıyor, tek sefere indir
    const loop = /(\\S.{0,40}?)(?:[\\s,.]+\\1){3,}/gi;
    let off = 0, skipped = 0, last = '';
    while (off < audio.length) {
      // parçayı tam 30. saniyeden değil, son 5 saniyenin en sessiz anından kes ki kelime bölünmesin
      let end = Math.min(audio.length, off + 30 * sr);
      if (end < audio.length) {
        let low = Infinity, cut = end;
        for (let k = Math.floor((end - 5 * sr) / F); k < Math.floor(end / F); k++) if (fr[k] < low) { low = fr[k]; cut = k * F + F / 2; }
        end = cut;
      }
      let voiced = 0;
      for (let k = Math.floor(off / F); k < Math.ceil(end / F); k++) if (fr[k] > quiet) voiced++;
      let chunks = [];
      // sessiz ya da 1 saniyeden kısa parçayı modele hiç verme, orada uydurup ya da hata verip duruyor
      if (end - off >= sr && voiced >= 5) {
        const part = audio.subarray(off, end);
        let out = null;
        try { out = await asr(part, { ...base, return_timestamps:true }); }
        catch { try { out = await asr(part, base); } catch { skipped++; } } // zaman damgasız bir daha dene, olmazsa atla
        if (out) chunks = out.chunks && out.chunks.length ? out.chunks : [{ text:out.text, timestamp:[0, null] }];
      }
      chunks = chunks.map(c => ({ ...c, text:(c.text || '').replace(loop, '$1').trim() })).filter(c => {
        const key = c.text.toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, '');
        if (!key || key === last) return false;
        last = key; return true;
      });
      self.postMessage({ type:'part', offset:off / sr, progress:end / audio.length, chunks });
      off = end;
    }
    self.postMessage({ type:'done', skipped });
  } catch (err) { self.postMessage({ type:'error', message:String(err && err.message || err) }); }
};`;
let impWorker = null;
$('impBtn').onclick = () => { $('exportMenu').hidden = true; $('impLang').value = L().src || 'en'; $('impDlg').showModal(); };
$('impClose').onclick = () => $('impDlg').close();
$('impStop').onclick = () => stopImport('Durduruldu. Şimdiye kadarki kısım derste kaldı.');
function stopImport(msg) {
  if (impWorker) { impWorker.terminate(); impWorker = null; }
  $('impGo').disabled = false; $('impStop').hidden = true; $('impProg').hidden = true;
  $('impMsg').textContent = msg || ''; setStatus('');
}
async function translateSeg(lesson, seg, i) {
  try { seg.tr = await translate(seg.en, lesson.lang, lesson.src || 'en'); } catch { seg.tr = '(çeviri alınamadı)'; }
  save(); if (L() === lesson) setTrText(i);
}
$('impGo').onclick = async () => {
  const file = $('impFile').files[0];
  if (!file) { $('impMsg').textContent = 'Önce bir ses dosyası seç.'; return; }
  if (impWorker) return;
  $('impGo').disabled = true; $('impStop').hidden = false;
  $('impProg').hidden = false; $('impProg').removeAttribute('value');
  $('impMsg').textContent = 'Dosya okunuyor...';
  let audio, dur;
  try {
    const ctx = new AudioContext({ sampleRate:16000 });
    const dec = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close();
    audio = new Float32Array(dec.length);
    for (let c = 0; c < dec.numberOfChannels; c++) { const ch = dec.getChannelData(c); for (let i = 0; i < ch.length; i++) audio[i] += ch[i] / dec.numberOfChannels; }
    dur = dec.duration;
  } catch { stopImport('Bu dosya okunamadı. mp3, m4a, wav, webm ya da mp4 dene.'); return; }

  let lesson = L();
  if (lesson.segs.length || lesson.notes || lesson.recs.length) { lesson = newLesson(); DB.lessons.push(lesson); }
  lesson.title = file.name.replace(/\.[^.]+$/, ''); lesson.src = $('impLang').value; lsSet('ders-src', lesson.src);
  if (lesson.lang === lesson.src) lesson.lang = lesson.src === 'tr' ? 'en' : 'tr';
  const recId = 'i' + Date.now().toString(36);
  await idbDo('audio', 'readwrite', s => s.put(file, lesson.id + ':' + recId));
  lesson.recs.push({ id:recId, dur, mime:file.type || 'audio/mpeg', ext:(file.name.match(/\.[^.]+$/) || ['.mp3'])[0], name:file.name });
  saveNow(); switchLesson(lesson.id, true);

  const src = lesson.src, model = 'Xenova/whisper-' + $('impQ').value + (src === 'en' ? '.en' : '');
  let tq = Promise.resolve();
  impWorker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type:'text/javascript' })), { type:'module' });
  impWorker.onmessage = e => {
    const m = e.data;
    if (m.type === 'dl') $('impMsg').textContent = 'Model indiriliyor (sadece ilk seferde): %' + Math.round(m.pct || 0);
    else if (m.type === 'dev') { $('impMsg').textContent = 'Yazıya dökülüyor...' + (m.dev === 'webgpu' ? '' : ' (ekran kartı kullanılamadı, yavaş modda)'); $('impProg').max = 1; $('impProg').value = 0; }
    else if (m.type === 'part') {
      for (const c of m.chunks) {
        const text = (c.text || '').trim();
        if (text.length < 2 || /^[\[(].*[\])]$/.test(text)) continue;
        const seg = { en:text, tr:null, t:m.offset + ((c.timestamp && c.timestamp[0]) || 0), rec:recId, star:false };
        lesson.segs.push(seg);
        if (trOn) { const i = lesson.segs.length - 1; tq = tq.then(() => translateSeg(lesson, seg, i)); }
      }
      save(); if (L() === lesson) { renderSegments(); } renderLessons();
      $('impProg').value = m.progress;
      $('impMsg').textContent = 'Yazıya dökülüyor: %' + Math.round(m.progress * 100);
      setStatus('Transkript %' + Math.round(m.progress * 100));
    } else if (m.type === 'done') {
      stopImport('Bitti. Transkript derste.' + (m.skipped ? ' Atlanan bozuk parça: ' + m.skipped : '')); toast('Transkript hazır'); $('impDlg').close();
    } else if (m.type === 'error') stopImport('Hata: ' + m.message);
  };
  impWorker.onerror = e => stopImport('Model yüklenemedi (internet gerekli, ilk seferde). ' + (e.message || ''));
  impWorker.postMessage({ model, language:SRC[src].whisper, audio }, [audio.buffer]);
};
