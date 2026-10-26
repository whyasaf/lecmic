// arayüz dili. yazılar Türkçe yazıldı, İngilizce seçilince sözlükten değiştiriliyor
let UI = lsGet('ders-ui', 'tr');
const LOC = () => UI === 'en' ? 'en-GB' : 'tr-TR';
// Türkçe -> İngilizce sözlük
const EN = {
  'Dersler':'Lessons', '+ Yeni ders':'+ New lesson', 'Yeni ders':'New lesson', 'Paneli aç/kapat':'Show / hide the panel',
  'Her ders kendi transkripti, notları, kelimeleri ve ses kaydıyla bu tarayıcıda saklanır.':'Each lesson keeps its own transcript, notes, vocabulary and recording in this browser.',
  'Konuşulan dil':'Spoken language', 'Çeviri':'Translation', 'Çeviri motoru':'Translation engine', 'Arayüz dili':'Interface language',
  'Yazı boyutu':'Text size', 'Tema':'Theme', 'Açık / koyu':'Light / dark', 'Dosya':'File',
  'Ses dosyasından transkript çıkar...':'Transcribe an audio file...',
  'Sadece notlar (.doc)':'Notes only (.doc)', 'Sadece notlar (.txt)':'Notes only (.txt)',
  'Tüm ders: Word (.doc)':'Whole lesson: Word (.doc)', 'Tüm ders: PDF olarak kaydet':'Whole lesson: save as PDF', 'Tüm ders: düz metin (.txt)':'Whole lesson: plain text (.txt)',
  'Ses kaydını indir (.mp3)':'Download recording (.mp3)',
  'Yedekle (sadece yazılar)':'Back up (text only)', 'Yedekle (sesle birlikte)':'Back up (with audio)', 'Yedekten geri yükle...':'Restore from backup...',
  'Kurtar':'Recover', 'Sil':'Delete', 'Transkript':'Transcript', 'Notlar':'Notes', 'Kelimeler':'Vocabulary', 'Özet':'Summary', 'Önemliler':'Starred',
  'Canlıya dön ↓':'Back to live ↓',
  'Liste':'List', '1. Liste':'1. List', 'Kutu':'Checkbox', 'Çizgi':'Line', 'Saat':'Time', 'Temizle':'Clear', 'Geri':'Undo', 'İleri':'Redo', 'Ekle':'Add',
  'Başlık 1':'Heading 1', 'Başlık 2':'Heading 2', 'Başlık 3':'Heading 3',
  'Özet çıkar':'Summarize', 'Nota ekle':'Add to notes', 'Duraklat':'Pause', 'Devam et':'Resume', 'Adlandır':'Rename', 'Kaydı başlat':'Start recording', 'Bitir':'Finish',
  'Ses dosyasından transkript':'Transcript from an audio file',
  'Hazır bir ders kaydını yazıya dökerim. Her şey bilgisayarında çalışır, ses internete gönderilmez. Model ilk kullanımda bir kere indirilir. Çalışırken bu sekmeyi kapatma.':'I turn a ready-made lesson recording into text. Everything runs on your device and the audio is never uploaded. The model is downloaded once on first use. Do not close this tab while it works.',
  'Ses dosyası (mp3, m4a, wav, mp4...)':'Audio file (mp3, m4a, wav, mp4...)', 'Konuşma dili':'Spoken language', 'Kalite':'Quality',
  'Hızlı (küçük model, ~40 MB, daha çok hata)':'Fast (small model, ~40 MB, more mistakes)', 'Dengeli (~80 MB)':'Balanced (~80 MB)', 'Doğru (~250 MB, yavaş)':'Accurate (~250 MB, slow)',
  'Başlat':'Start', 'Durdur':'Stop', 'Kapat':'Close', 'Tamam':'OK',
  'Klavye kısayolları':'Keyboard shortcuts', 'Boşluk':'Space', 'Kaydı başlat / duraklat / devam':'Start / pause / resume recording', 'Kaydı başlat / bitir':'Start / finish recording',
  'ya da':'or', 'Transkriptte ara':'Search the transcript', 'Dersler panelini aç/kapat':'Show / hide the lessons panel', 'Yazıyı büyüt / küçült':'Increase / decrease text size', 'Açık pencereyi kapat':'Close the open window',
  'Verilerin':'Your data', 'Derslerin, notların ve ses kayıtların sadece bu tarayıcıda saklanır, kimseye gönderilmez.':'Your lessons, notes and recordings are stored only in this browser and are never sent anywhere.',
  "Canlı transkript için ses Google'a, çeviri için metin Google ya da MyMemory'ye gider.":'For the live transcript, audio goes to Google. For translation, text goes to Google or MyMemory.',
  'Tarayıcı verilerini silersen dersler de silinir. Dosya menüsünden yedek almayı unutma.':'Clearing your browser data deletes your lessons too. Make a backup from the File menu.',
  'Tek tuşlu kısayollar not yazarken ya da kutulara yazarken çalışmaz. Bir İngilizce kelimeye tıklarsan anlamı çıkar. Cümlenin üzerine gelince oynat, önemli ve not düğmeleri görünür.':'Single-key shortcuts do not work while you type in notes or text boxes. Click a word to see its meaning. Hover a sentence to get the play, star and note buttons.',
  'Henüz kelime yok. Soldaki metinde bir kelimeye tıkla, "Defterime ekle" de. Ya da yukarıdan kendin yaz.':'No words yet. Click a word in the text on the left and press "Add to my notebook", or type one above.',
  'Dersin transkriptinden önemli noktaları çıkarır. Önemli diye yıldızladığın cümleler daha çok öne çıkar. Önce biraz transkript olmalı.':'Pulls the key points out of the lesson transcript. Sentences you starred count for more. There must be some transcript first.',
  'Dersi sil':'Delete lesson', 'Dersler panelini aç/kapat ( [ )':'Show / hide lessons ( [ )', 'Ders adını değiştirmek için tıkla':'Click to rename the lesson', 'Ders adı':'Lesson name',
  'Dil ve görünüm ayarları':'Language and display settings', 'Derste konuşulan dil':'Language spoken in the lesson', 'Çeviri dili':'Translation language',
  'Küçült ( - )':'Smaller ( - )', 'Büyüt ( + )':'Larger ( + )', 'Ara ( / )':'Search ( / )', 'Sadece önemli işaretli cümleleri göster':'Show only starred sentences', 'Sürükle':'Drag to resize',
  'Paragraf stili':'Paragraph style', 'Kalın (Ctrl+B)':'Bold (Ctrl+B)', 'İtalik (Ctrl+I)':'Italic (Ctrl+I)', 'Altı çizili (Ctrl+U)':'Underline (Ctrl+U)', 'Üstü çizili':'Strikethrough',
  'Vurgula':'Highlight', 'Madde işaretli liste':'Bulleted list', 'Numaralı liste':'Numbered list', 'İşaretli kutu':'Checkbox', 'Girintiyi azalt':'Decrease indent', 'Girintiyi artır':'Increase indent',
  'Ayırıcı çizgi':'Divider line', 'Saat ekle':'Insert time', 'Biçimi temizle':'Clear formatting', 'Geri al':'Undo', 'Yinele':'Redo',
  'Notlarını buraya yaz. Soldaki bir cümlenin yanındaki not düğmesine basarsan cümle buraya alıntı olarak eklenir.':'Write your notes here. The note button next to a sentence on the left adds it here as a quote.',
  'Kelime ekle (İngilizce)':'Add a word', 'Mikrofon seviyesi':'Microphone level', 'Ses kaydı':'Recording', 'Seçili kaydın adını değiştir':'Rename the selected recording',
  'Bu cümleyi kayıttan dinle':'Play this sentence from the recording', 'Önemli olarak işaretle':'Mark as important',
  'Chrome (çevrimdışı)':'Chrome (offline)', 'Google (internet)':'Google (online)', "Chrome'un kendi çevirisi: sınırsız, internet gerekmez":'Chrome\'s own translation: unlimited, no internet needed',
  'Chrome yapay zekâsı':'Chrome AI', 'Yerel yöntem':'Local method', 'Defterde':'In notebook', 'Defterime ekle':'Add to my notebook', 'Söyle':'Say it',
  'Dinliyor...':'Listening...', 'Duraklatıldı':'Paused', 'Ses işleniyor...':'Processing audio...', 'Dosya okunuyor...':'Reading file...', 'Yazıya dökülüyor...':'Transcribing...',
  'Yedek hazırlanıyor...':'Preparing backup...', 'Kayıt kurtarılıyor...':'Recovering recording...', 'Özet hazırlanıyor...':'Preparing summary...',
  'Mikrofon isteniyor... (Chrome izin sorarsa İzin ver)':'Asking for the microphone... (click Allow if Chrome asks)', 'Mikrofondan ses gelmiyor gibi':'No sound seems to come from the microphone',
  '(çeviri alınamadı)':'(translation failed)', '(günlük çeviri limiti doldu)':'(daily translation limit reached)', '(boş)':'(empty)',
  'Hazırsın.':'You are ready.',
  'Belge':'Document', 'Belge dili':'Document language', 'Belge aç (PDF / Word)...':'Open a document (PDF / Word)...', 'İşaretler':'Highlights', 'İŞARETLER':'HIGHLIGHTS',
  'Kelime anlamı (üstüne gelince)':'Word meaning on hover', 'Sığdır':'Fit', 'Genişliğe sığdır':'Fit to width', 'Küçült':'Zoom out', 'Büyüt':'Zoom in',
  'Kopyala':'Copy', 'Git':'Go to', 'Kopyalandı':'Copied', 'Dosyayı seç':'Choose the file', 'Çevriliyor...':'Translating...',
  'Sarı vurgula':'Highlight yellow', 'Yeşil vurgula':'Highlight green', 'Pembe vurgula':'Highlight pink',
  'Henüz işaret yok. Belgede bir cümleye tıkla ya da yazıyı seç, çıkan kutudan bir renk seç.':'No highlights yet. Click a sentence in the document or select some text, then pick a colour in the box that appears.',
  'Bu dersin belge dosyası bulunamadı (yedekte sadece yazılar olabilir). İşaretlerin ve notların duruyor. Dosyayı yeniden seçersen işaretler yerine oturur.':'The document file of this lesson was not found (the backup may only hold the text). Your highlights and notes are still here. If you pick the file again the highlights fall back into place.',
  'Sadece PDF ya da Word (.docx) açabilirim':'I can only open PDF or Word (.docx) files', 'Önce kaydı bitir':'Finish the recording first',
  'Belge dersinde kayıt yok, yeni bir ders aç':'There is no recording in a document lesson, open a new lesson',
  '(seçim çok uzun, çeviri için daha kısa seç)':'(selection too long, pick a shorter one to translate)',
  'Bu tarayıcı canlı konuşma tanımayı desteklemiyor. Chrome kullan.':'This browser does not support live speech recognition. Use Chrome.',
  'Mikrofon sadece localhost veya https adreslerinde çalışır.':'The microphone only works on localhost or https addresses.',
  'Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin ver.':'Microphone permission was denied. Allow it from the lock icon in the address bar.',
  'Ses kaydı derse eklendi':'Recording added to the lesson', 'Kayıt kurtarıldı ve derse eklendi':'Recording recovered and added to the lesson', 'Yarım kalan kayıtlar silinsin mi?':'Delete the unfinished recordings?',
  'Kayıt bitince bu cümleyi dinleyebilirsin':'You can play this sentence once the recording ends', 'Bu ses kaydı bulunamadı':'This recording was not found', 'Bu derste ses kaydı yok':'This lesson has no recording',
  'Kayıt sürerken bu ders silinemez':'This lesson cannot be deleted while recording', 'Önce kaydı bitir, sonra derse geç':'Finish the recording first, then switch lessons',
  'Konuşma dilini değiştirmek için yeni bir ders aç':'Open a new lesson to change the spoken language',
  'Bu ders zaten boş, adını yazıp başlayabilirsin':'This lesson is already empty, just name it and start',
  'Aramayla eşleşen cümle yok.':'No sentence matches the search.', 'Nota eklendi':'Added to notes', 'Özet nota eklendi':'Summary added to notes', 'Kelime defterine eklendi':'Word added to the notebook',
  'Özet için biraz daha transkript lazım':'The summary needs a bit more transcript', 'Önce bir ses dosyası seç.':'Pick an audio file first.',
  'Bu dosya okunamadı. mp3, m4a, wav, webm ya da mp4 dene.':'This file could not be read. Try mp3, m4a, wav, webm or mp4.',
  'Bitti. Transkript derste.':'Done. The transcript is in the lesson.', 'Transkript hazır':'Transcript ready', 'Durduruldu. Şimdiye kadarki kısım derste kaldı.':'Stopped. What was done so far stays in the lesson.',
  'Yedek indirildi':'Backup downloaded', 'Bu dosya bir Lecmic yedeği değil':'This file is not a Lecmic backup', 'Açılan pencerede "PDF olarak kaydet" seç':'In the window that opens, choose "Save as PDF"',
  'Bu kaydın adı:':'Name of this recording:', 'Kurtarılan kayıt':'Recovered recording', 'Adsız ders':'Untitled lesson', 'Önceki ders':'Previous lesson',
  'Transkript (kalın = önemli)':'Transcript (bold = important)', 'ÖZET':'SUMMARY', 'NOTLAR':'NOTES', 'KELIMELER':'VOCABULARY', 'TRANSKRIPT':'TRANSCRIPT', 'ÇEVİRİ':'TRANSLATION',
};
// baştan eşleşenler
const EN_PRE = [
  ['Belge açılamadı: ','Could not open the document: '],
  ['Kayıt başlamadı: ','Recording failed: '], ['Mikrofon açılamadı: ','Could not open the microphone: '],
  ['Model indiriliyor (sadece ilk seferde): %','Downloading the model (first time only): %'], ['Model yüklenemedi (internet gerekli, ilk seferde). ','Could not load the model (internet needed the first time). '],
  ['Özet modeli iniyor: %','Downloading the summary model: %'], ['Dil paketi iniyor %','Downloading language pack %'], ['Yazıya dökülüyor: %','Transcribing: %'],
  ['Transkript %','Transcript %'], ['Özetleniyor ','Summarizing '], ['İnternetten çeviri','Online translation'], ['Hata: ','Error: '], ['Kayıt ','Recording ']
];
// cümlenin içinde geçen parçalar
const EN_SUB = [
  [' - Chrome bu dil için: ',' - Chrome for this language: '], [' - bu tarayıcıda yerleşik çeviri yok',' - no built-in translation in this browser'],
  [' (ekran kartı kullanılamadı, yavaş modda)',' (GPU unavailable, slow mode)'], ['Yazıya dökülüyor...','Transcribing...'],
  [' cümle',' sentences'], [' işaret',' highlights'], [' · ses',' · audio'], [' kelime',' words'],
  [' ders eklendi',' lessons added'], [' tanesi zaten vardı',' already existed'],
  ['Yarım kalan ','Unfinished: '], [' ses kaydı bulundu (sekme kapanmış olabilir).',' audio recording(s) found (the tab may have been closed).'],
  ['" silinsin mi?\nTranskript, notlar, kelimeler ve ses kaydı da silinir.','" - delete this lesson?\nIts transcript, notes, vocabulary and recording will be deleted too.']
];
function tEn(core) {
  if (EN[core] !== undefined) return EN[core];
  let out = core;
  for (const [k, v] of EN_PRE) if (out.startsWith(k)) { out = v + out.slice(k.length); break; }
  for (const [k, v] of EN_SUB) if (out.includes(k)) out = out.split(k).join(v);
  return out;
}
const T = s => UI === 'en' ? tEn(s) : s;

// kullanıcının kendi yazdığı yerler (transkript, not, ders adı) çevrilmez
const SKIP_SEL = '#enList,#trList,#enInt,#trInt,#notes,#vocabList .vw,#vocabList .vm,#vocabList .vx,#sumBody li,#lessonList .ln,#pop .pw,#pop .pm,#tip,#selbar .sbq,#selbar .sbo,#marksList .mkt,#docName';
const I18N_ATTRS = ['title', 'placeholder', 'data-placeholder'];
function i18nText(n) {
  const el = n.parentElement;
  if (!el || el.closest('script,style,' + SKIP_SEL)) return;
  if (UI !== 'en') { if (n.__o !== undefined) { n.nodeValue = n.__o; n.__o = undefined; } return; }
  const o = n.__o !== undefined && n.nodeValue === n.__en ? n.__o : n.nodeValue;
  const core = o.replace(/\s+/g, ' ').trim(); if (!core) return;
  const en = tEn(core);
  if (en === core) return;
  const lead = o.match(/^\s*/)[0], trail = o.match(/\s*$/)[0];
  n.__o = o; n.__en = lead + en + trail; n.nodeValue = n.__en;
}
function i18nEl(el) {
  if (el.parentElement && el.parentElement.closest(SKIP_SEL)) return;
  for (const a of I18N_ATTRS) {
    const cur = el.getAttribute(a); if (cur == null) continue;
    const prev = el.__a && el.__a[a];
    if (UI !== 'en') { if (prev) { el.setAttribute(a, prev.o); el.__a[a] = undefined; } continue; }
    const o = prev && cur === prev.en ? prev.o : cur;
    const en = tEn(o.replace(/\s+/g, ' ').trim());
    if (en !== o) { (el.__a ||= {})[a] = { o, en }; el.setAttribute(a, en); }
  }
}
function i18nWalk(root) {
  if (root.nodeType === 1 && root.closest(SKIP_SEL)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) i18nText(w.currentNode);
  if (root.nodeType === 1) { i18nEl(root); root.querySelectorAll('[title],[placeholder],[data-placeholder]').forEach(i18nEl); }
}
const OBS_OPTS = { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:I18N_ATTRS };
const i18nObs = new MutationObserver(recs => {
  if (UI !== 'en') return;
  i18nObs.disconnect();
  for (const r of recs) {
    if (r.type === 'characterData') i18nText(r.target);
    else if (r.type === 'attributes') i18nEl(r.target);
    else r.addedNodes.forEach(nd => nd.nodeType === 3 ? i18nText(nd) : nd.nodeType === 1 && i18nWalk(nd));
  }
  i18nObs.observe(document.body, OBS_OPTS);
});
function applyI18n() {
  i18nObs.disconnect();
  document.documentElement.lang = UI;
  i18nWalk(document.body);
  i18nObs.observe(document.body, OBS_OPTS);
}
