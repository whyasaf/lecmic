// kayıt durumu
const R = { state:'idle', startedAt:0, accum:0, stream:null, mr:null, chunks:[], recId:'', lessonId:'', recog:null, listening:false, ctx:null, analyser:null, raf:0, utterStart:null, lastSound:0 };
const elapsed = () => R.accum + (R.state === 'rec' ? (performance.now() - R.startedAt) / 1000 : 0);

// izin bilgisayarın ayarından kapalıysa nereden açılacağı
const OS_MIC = IS_MAC ? 'Mac\'te: Sistem Ayarları → Gizlilik ve Güvenlik → Mikrofon → Google Chrome açık olmalı. Açtıktan sonra Chrome\'u kapatıp yeniden aç.'
  : IS_WIN ? 'Windows\'ta: Ayarlar → Gizlilik ve güvenlik → Mikrofon → "Masaüstü uygulamalarının mikrofona erişmesine izin ver" açık olmalı.' : '';
const SITE_MIC = 'Adres çubuğundaki kilit simgesine bas, Mikrofon için İzin ver seç.';
// mikrofon açılamayınca neden ve ne yapılacağı: [başlık, açıklama]
function micError(e) {
  if (e.name === 'NotAllowedError' && !/system/i.test(e.message || '')) return ['Mikrofon izni verilmedi', SITE_MIC];
  if (e.name === 'NotAllowedError' || e.name === 'NotReadableError')
    return ['Bilgisayar mikrofonu açmaya izin vermiyor', [OS_MIC, 'Başka bir uygulama (Zoom, Meet...) mikrofonu kullanıyorsa onu kapat.'].filter(Boolean).join('\n')];
  if (e.name === 'NotFoundError') return ['Mikrofon bulunamadı', 'Bağlı bir mikrofon görünmüyor. Kulaklık ya da harici mikrofon takılıysa çıkarıp yeniden tak.'];
  return ['Mikrofon açılamadı: ' + e.name, OS_MIC];
}
// canlı transkript hataları
const SR_ERR = {
  'not-allowed':['Konuşma tanımaya izin yok', SITE_MIC],
  'service-not-allowed':['Konuşma tanıma bu tarayıcıda kapalı', 'Chrome ya da Edge kullan.'],
  'audio-capture':['Mikrofondan ses alınamıyor', 'Canlı transkript bilgisayarın varsayılan mikrofonunu kullanır. Ses ayarlarında doğru mikrofonun seçili olduğuna bak.'],
  'network':['Konuşma tanıma sunucusuna ulaşılamadı', 'Canlı transkript internet ister. Bağlantını kontrol et.'],
  'language-not-supported':['Bu konuşma dili desteklenmiyor', 'Üstten başka bir konuşma dili seç.']
};
// Chrome'un konuşma tanıması
function makeRecog() {
  const recog = new SR();
  recog.lang = SRC[L().src || 'en'].rec; recog.continuous = true; recog.interimResults = true;
  recog.onresult = e => {
    R.err = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript.trim();
      if (R.utterStart == null) R.utterStart = elapsed();
      if (e.results[i].isFinal) { if (t) addSegment(t, R.utterStart); R.utterStart = null; }
      else interim += t + ' ';
    }
    setInterim(interim.trim());
  };
  // Chrome arada kendiliğinden durduruyor, tekrar başlatıyoruz
  recog.onend = () => { if (R.listening && R.recog === recog) { try { recog.start(); } catch {} } };
  recog.onerror = e => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    const [t, s] = SR_ERR[e.error] || ['Canlı transkript hatası: ' + e.error, ''];
    R.err = T(t); setStatus(R.err);
    if (e.error !== 'network') R.listening = false; // izin ya da mikrofon sorunu tekrar denemekle geçmez
    if (!R.errShown) { R.errShown = true; ask(R.err, { sub:T(s), cancel:false }); }
  };
  return recog;
}
// mikrofon seviye çubuğu
function setupMeter(stream) {
  try {
    R.ctx = new AudioContext();
    const src = R.ctx.createMediaStreamSource(stream);
    R.analyser = R.ctx.createAnalyser(); R.analyser.fftSize = 512; src.connect(R.analyser);
    const buf = new Uint8Array(R.analyser.fftSize), bar = $('meterBar');
    R.lastSound = performance.now();
    const tick = () => {
      if (R.state === 'idle') { bar.style.width = '0%'; return; }
      R.raf = requestAnimationFrame(tick);
      if (R.state !== 'rec') { bar.style.width = '0%'; return; }
      R.analyser.getByteTimeDomainData(buf);
      let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128));
      if (m > 6) R.lastSound = performance.now();
      bar.style.width = Math.min(100, m / 128 * 170) + '%';
    };
    tick();
  } catch {}
}
function stopMeter() { cancelAnimationFrame(R.raf); try { R.ctx.close(); } catch {} $('meterBar').style.width = '0%'; }

function uiRec() {
  const b = $('rec'), p = $('pause'), idle = R.state === 'idle';
  b.textContent = idle ? 'Kaydı başlat' : 'Bitir';
  b.className = 'btn ' + (idle ? 'primary' : 'rec');
  p.disabled = idle; p.textContent = R.state === 'paused' ? 'Devam et' : 'Duraklat';
  $('timer').classList.toggle('live', R.state === 'rec');
  if (idle) $('timer').textContent = '00:00';
  setStatus(R.state === 'paused' ? 'Duraklatıldı' : R.state === 'rec' ? 'Dinliyor...' : '');
  $('newLesson').disabled = !idle;
  updateLive();
}
setInterval(() => {
  if (R.state === 'idle') return;
  $('timer').textContent = fmt(elapsed());
  // hata varsa üstüne "Dinliyor..." yazılıp kaybolmasın
  if (R.state === 'rec') setStatus(R.err || (performance.now() - R.lastSound > 10000 ? 'Mikrofondan ses gelmiyor gibi' : 'Dinliyor...'));
}, 250);

// kaydı başlat / duraklat / devam / bitir
let starting = false;
async function startRec() {
  if (starting || R.state !== 'idle') return;
  if (L().kind === 'doc') { toast('Belge dersinde kayıt yok, yeni bir ders aç'); return; }
  if (!SR) { toast('Bu tarayıcı canlı konuşma tanımayı desteklemiyor. Chrome kullan.'); return; }
  if (!navigator.mediaDevices) { toast('Mikrofon sadece localhost veya https adreslerinde çalışır.'); return; }
  starting = true; setStatus('Mikrofon isteniyor... (Chrome izin sorarsa İzin ver)');
  try { await startRecInner(); }
  catch (e) { console.error(e); toast('Kayıt başlamadı: ' + (e.name || '') + ' ' + (e.message || '')); R.state = 'idle'; uiRec(); }
  finally { starting = false; if (R.state === 'idle') setStatus(''); }
}
async function startRecInner() {
  if (!translator) initTranslator(L().lang);
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
  catch (e) { const [t, s] = micError(e); ask(T(t), { sub:T(s), cancel:false }); return; }
  R.err = ''; R.errShown = false;
  R.lessonId = L().id; R.recId = Date.now().toString(36); R.chunks = []; R.stream = stream; R.accum = 0; R.utterStart = null;
  let seq = 0;
  const mr = new MediaRecorder(stream); R.mr = mr;
  const lessonId = R.lessonId, recId = R.recId;
  mr.ondataavailable = e => {
    if (!e.data.size) return;
    R.chunks.push(e.data);
    idbDo('chunks', 'readwrite', s => s.add({ lesson:lessonId, rec:recId, seq:seq++, blob:e.data }));
  };
  mr.start(5000);
  setupMeter(stream);
  R.recog = makeRecog(); R.listening = true; try { R.recog.start(); } catch {}
  R.state = 'rec'; R.startedAt = performance.now();
  uiRec();
}
function pauseRec() {
  R.accum += (performance.now() - R.startedAt) / 1000; R.state = 'paused';
  try { R.mr.pause(); } catch {}
  R.listening = false; try { R.recog.stop(); } catch {}
  setInterim(''); uiRec();
}
function resumeRec() {
  try { R.mr.resume(); } catch {}
  R.startedAt = performance.now(); R.state = 'rec';
  R.recog = makeRecog(); R.listening = true; try { R.recog.start(); } catch {}
  uiRec();
}
function stopRec() {
  if (R.state === 'idle') return;
  if (R.state === 'rec') R.accum += (performance.now() - R.startedAt) / 1000;
  const snap = { lessonId:R.lessonId, recId:R.recId, dur:R.accum, stream:R.stream, chunks:R.chunks };
  R.state = 'idle'; R.listening = false; try { R.recog.stop(); } catch {}
  setInterim(''); stopMeter();
  R.mr.onstop = () => finishRec(snap);
  if (R.mr.state !== 'inactive') R.mr.stop();
  uiRec();
}
async function finishRec(snap) {
  snap.stream.getTracks().forEach(t => t.stop());
  const lesson = DB.lessons.find(l => l.id === snap.lessonId);
  if (!lesson) return;
  setStatus('Ses işleniyor...');
  await finalizeRecording(lesson, snap.recId, snap.chunks, snap.dur);
  setStatus(''); toast('Ses kaydı derse eklendi');
  if (DB.cur === lesson.id) { renderSegments(); refreshPlayer(); }
  renderLessons();
}
// kayıt bitince sesi MP3 yapıp saklar
async function finalizeRecording(lesson, recId, blobs, fallbackDur) {
  const raw = new Blob(blobs, { type: (blobs[0] && blobs[0].type) || 'audio/webm' });
  let out = raw, dur = fallbackDur || 0, mime = raw.type;
  try { const r = await toMp3(raw); out = r.blob; dur = r.dur; mime = 'audio/mpeg'; } catch {}
  await idbDo('audio', 'readwrite', s => s.put(out, lesson.id + ':' + recId));
  lesson.recs.push({ id:recId, dur, mime });
  await idbDeleteChunks(c => c.lesson === lesson.id && c.rec === recId);
  saveNow();
}
// webm -> tek kanal 16 kHz mp3, konuşma için yeterli
async function toMp3(blob) {
  const ctx = new AudioContext({ sampleRate:16000 });
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();
  const f = audio.getChannelData(0), pcm = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
  const enc = new lamejs.Mp3Encoder(1, 16000, 64), out = [], step = 1152 * 20;
  for (let i = 0; i < pcm.length; i += step) {
    const b = enc.encodeBuffer(pcm.subarray(i, i + step));
    if (b.length) out.push(b);
    if (i % (step * 50) === 0) await new Promise(r => setTimeout(r));
  }
  out.push(enc.flush());
  return { blob:new Blob(out, { type:'audio/mpeg' }), dur:audio.duration };
}
function toggleMain() {
  if (R.state === 'idle') startRec(); else stopRec();
}
$('rec').onclick = toggleMain;
$('pause').onclick = () => R.state === 'rec' ? pauseRec() : R.state === 'paused' ? resumeRec() : 0;
addEventListener('beforeunload', e => { if (R.state !== 'idle') { e.preventDefault(); e.returnValue = ''; } });

// sekme kapanırsa yarım kalan kaydı geri getirme
let pendingChunks = null;
async function checkRecover() {
  const all = await idbDo('chunks', 'readonly', s => s.getAll());
  if (!all || !all.length) return;
  const groups = {};
  all.sort((a, b) => a.seq - b.seq).forEach(c => (groups[c.lesson + '|' + c.rec] ||= []).push(c));
  pendingChunks = groups;
  const n = Object.keys(groups).length;
  $('bannerText').textContent = 'Yarım kalan ' + n + ' ses kaydı bulundu (sekme kapanmış olabilir).';
  $('banner').hidden = false;
}
$('recGet').onclick = async () => {
  if (!pendingChunks) return;
  $('banner').hidden = true; setStatus('Kayıt kurtarılıyor...');
  let last;
  for (const [key, cs] of Object.entries(pendingChunks)) {
    const [lid, rid] = key.split('|');
    let lesson = DB.lessons.find(l => l.id === lid);
    if (!lesson) { lesson = newLesson(); lesson.id = lid; lesson.title = T('Kurtarılan kayıt'); DB.lessons.push(lesson); }
    if (!lesson.recs.some(r => r.id === rid)) await finalizeRecording(lesson, rid, cs.map(c => c.blob), 0);
    else await idbDeleteChunks(c => c.lesson === lid && c.rec === rid);
    last = lesson;
  }
  pendingChunks = null; setStatus('');
  if (last) switchLesson(last.id, true);
  toast('Kayıt kurtarıldı ve derse eklendi');
};
$('recDel').onclick = async () => {
  if (!(await ask(T('Yarım kalan kayıtlar silinsin mi?'), { ok:T('Sil'), danger:true }))) return;
  await idbDeleteChunks(() => true); pendingChunks = null; $('banner').hidden = true;
};

// kaydı dinleme. cümlenin saniyesine atlar
const player = $('player'), urlCache = new Map();
let curRec = null, playingIdx = -1;
async function recURL(lessonId, rec) {
  const key = lessonId + ':' + rec.id;
  if (!urlCache.has(key)) {
    const blob = await idbDo('audio', 'readonly', s => s.get(key));
    if (!blob) return null;
    urlCache.set(key, URL.createObjectURL(blob));
  }
  return urlCache.get(key);
}
async function loadRec(rec) {
  const u = await recURL(DB.cur, rec);
  if (!u) { toast('Bu ses kaydı bulunamadı'); return false; }
  curRec = rec; if (player.src !== u) player.src = u;
  $('recSel').value = rec.id; return true;
}
function refreshPlayer() {
  const l = L(), bar = $('playerBar');
  if (!l.recs.length) { bar.hidden = true; player.pause(); player.removeAttribute('src'); curRec = null; return; }
  bar.hidden = false;
  $('recSel').innerHTML = l.recs.map((r, i) => '<option value="' + r.id + '">' + esc(r.name || 'Kayıt ' + (i + 1)) + ' (' + fmt(r.dur) + ')</option>').join('');
  if (curRec) $('recSel').value = curRec.id;
  if (!curRec || !l.recs.includes(curRec)) { curRec = null; loadRec(l.recs[l.recs.length - 1]); }
}
$('recName').onclick = async () => {
  const l = L(), r = curRec || l.recs.find(x => x.id === $('recSel').value); if (!r) return;
  const n = await ask(T('Bu kaydın adı:'), { input:r.name || T('Kayıt ' + (l.recs.indexOf(r) + 1)), ok:T('Kaydet') });
  if (n === null) return;
  r.name = n.trim() || undefined; save(); refreshPlayer();
};
$('recSel').onchange = () => { const r = L().recs.find(x => x.id === $('recSel').value); if (r) loadRec(r); };
async function playSeg(seg) {
  const rec = L().recs.find(r => r.id === seg.rec);
  if (!rec) { toast('Kayıt bitince bu cümleyi dinleyebilirsin'); return; }
  if (curRec !== rec && !(await loadRec(rec))) return;
  player.currentTime = Math.max(0, (seg.t || 0) - 0.8);
  player.play();
}
player.addEventListener('timeupdate', () => {
  if (!curRec) return;
  const segs = L().segs, t = player.currentTime + 0.3;
  let idx = -1;
  for (let i = segs.length - 1; i >= 0; i--) if (segs[i].rec === curRec.id && segs[i].t != null && segs[i].t <= t) { idx = i; break; }
  if (idx === playingIdx) return;
  document.querySelectorAll('.seg.playing').forEach(x => x.classList.remove('playing'));
  playingIdx = idx;
  if (idx < 0) return;
  document.querySelectorAll('.seg[data-i="' + idx + '"]').forEach(x => {
    x.classList.add('playing');
    if (!player.paused) x.scrollIntoView({ block:'nearest', behavior:'smooth' });
  });
});
