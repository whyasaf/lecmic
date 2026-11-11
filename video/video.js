// Lecmic tanıtım videosu. her şey zamana bağlı: seek(t) videonun t. saniyesini çizer, başka durum tutulmaz.
// böylece render.mjs kareleri tek tek, takılmadan alır. adres: index.html?w=1080&h=1920&lang=tr
const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 1080, H = +Q.get('h') || 1920, LANG = Q.get('lang') === 'en' ? 'en' : 'tr';
const U = Math.min(W, H) / 100, LAND = W > H;
const root = document.documentElement.style;
root.setProperty('--w', W + 'px'); root.setProperty('--h', H + 'px'); root.setProperty('--u', U + 'px');
document.body.classList.toggle('land', LAND);
document.documentElement.lang = LANG;
const $ = id => document.getElementById(id);

// kesmeler dakikada 120 vuruşa göre: bir vuruş 0,5 sn. müzik eklenince hareketler vuruşa oturur
const BEAT = 0.5;

// --- metinler ---
const TX = {
  tr: {
    hook:['Hoca', 'İngilizce', 'anlatıyor.'], you:'Sen?', youSub:'hâlâ ilk slayttasın.',
    tag:'Dersi dinle. <em>Yazısı</em> ve <em>çevirisi</em> yanında.',
    rec:'Kaydediliyor',
    l1:['Hiçbir cümleyi', '<em>kaçırma.</em>'], l1p:'Hoca konuştukça yazıya döker, anında Türkçeye çevirir.',
  },
  en: {
    hook:['The', 'lecture\'s', 'in English.'], you:'You?', youSub:'still on slide one.',
    tag:'Hear the lecture. <em>Read</em> it in your language.',
    rec:'Recording',
    l1:['Don\'t miss', 'a <em>sentence.</em>'], l1p:'Every sentence is written down as it\'s spoken, and translated right away.',
  },
}[LANG];
// uygulamanın gerçek demo dersi: İngilizce ders, Türkçe çeviri
const LINES = [
  ['If you don\'t pay attention, the information never gets encoded.', 'Dikkat etmezsen bilgi hiç kodlanmaz.'],
  ['That\'s why rereading your notes feels productive but often isn\'t.', 'Bu yüzden notları yeniden okumak verimli hissettirir ama çoğu zaman değildir.'],
  ['Retrieval practice makes memories much stronger.', 'Geri getirme pratiği anıları çok daha güçlü kılar.'],
];

// --- zaman yardımcıları ---
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// t, a ile b arasında nerede (0..1)
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const out3 = x => 1 - Math.pow(1 - x, 3);
const outExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const in3 = x => x * x * x;
// yaylı: hedefi biraz geçip geri oturur
const spring = (x, k = 6, f = 13) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-k * x) * Math.cos(f * x));
// öğeye konum, ölçek, dönme, saydamlık, bulanıklık ver. uzunluklar --u cinsinden
function S(el, { x = 0, y = 0, s = 1, sx, sy, r = 0, rx = 0, ry = 0, o = 1, b = 0, z = 0 } = {}) {
  el.style.transform = `translate3d(${x * U}px,${y * U}px,${z * U}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${r}deg) scale(${sx ?? s},${sy ?? s})`;
  el.style.opacity = o;
  el.style.filter = b ? `blur(${b * U}px)` : '';
}
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
// kelimelere ve harflere bölme
const words = (box, text) => text.split(' ').map((w, i, a) => box.appendChild(el('span', '', w + (i < a.length - 1 ? ' ' : ''))));
// el yapımı, tekrarlanabilir gürültü (ses dalgası için)
const noise = (i, t) => Math.abs(Math.sin(i * 1.71 + t * 8.3) * 0.55 + Math.sin(i * 0.63 + t * 13.7) * 0.3 + Math.sin(i * 2.9 + t * 5.1) * 0.25);

// --- sahne kayıtları ---
const scenes = [];
const scene = (id, a, b, f) => scenes.push({ el:$(id), a, b, f });

// kâğıt: çizgiler soldan sağa çizilir, kırmızı kenar çizgisi yukarıdan düşer. hep arkada
const rules = [];
for (let y = 6; y < H / U; y += 6) { const i = el('i'); i.style.top = y * U + 'px'; $('rules').append(i); rules.push(i); }
function paper(t) {
  rules.forEach((i, k) => { const x = out3(P(t, 0.02 * k, 0.02 * k + 0.55)); i.style.transform = `scaleX(${x})`; });
  $('margin').style.transform = `scaleY(${outExpo(P(t, 0.35, 1.0))})`;
}

// 1) açılış (0-3 sn): kelimeler vuruşlarda çarpar, sonra "Sen?"
const hk = words($('hk1'), TX.hook.join(' '));
$('hk2').textContent = TX.you; $('hk3').textContent = TX.youSub;
scene('s-hook', 0, 3.1, t => {
  hk.forEach((w, i) => {
    const x = P(t, 0.5 + i * BEAT * 0.5, 0.5 + i * BEAT * 0.5 + 0.35);
    S(w, { s:lerp(2.2, 1, outExpo(x)), o:x > 0 ? 1 : 0, b:lerp(1.2, 0, out3(x)), y:lerp(-2, 0, out3(x)) });
  });
  // ilk satır yukarı kaçar, "Sen?" çarpar
  const up = inOut(P(t, 1.75, 2.15));
  S($('hk1'), { y:lerp(0, -40, up), o:1 - up, s:lerp(1, 0.9, up) });
  const y = P(t, 1.9, 2.4);
  S($('hk2'), { s:spring(y), o:y > 0 ? 1 : 0, r:lerp(-14, -4, out3(y)) });
  const sub = out3(P(t, 2.25, 2.6));
  S($('hk3'), { y:lerp(3, 0, sub), o:sub });
  // çıkış: her şey merkeze çöker, oradan ses dalgası doğar
  const ex = in3(P(t, 2.7, 3.05));
  S($('s-hook'), { s:lerp(1, 0.2, ex), o:1 - ex });
});

// 2) logo (3-6 sn): ses dalgası atar, ortada birleşir, içinden L çıkar
const NB = 23, bars = Array.from({ length:NB }, () => $('wave').appendChild(el('i')));
const word = [...'Lecmic'].map(c => $('word').appendChild(el('span', '', c)));
$('tag').innerHTML = TX.tag;
scene('s-logo', 3, 6.15, t => {
  const grow = outExpo(P(t, 0, 0.5)), merge = inOut(P(t, 0.9, 1.35));
  bars.forEach((b, i) => {
    const c = i - (NB - 1) / 2, env = 1 - Math.abs(c) / (NB / 2) * 0.55;
    const h = lerp(1.5, 4 + noise(i, t) * 30 * env, grow) * (1 - merge) + 1.5 * merge;
    b.style.height = h * U + 'px';
    S(b, { x:-c * 2.8 * merge, o:1 - P(t, 1.25, 1.4) });
  });
  const tp = P(t, 1.15, 1.95);
  S($('tile'), { s:spring(tp, 5, 11), r:lerp(-50, 0, outExpo(tp)), o:tp > 0 ? 1 : 0 });
  // L logonun içinde aşağıdan yukarı çizilir
  $('tile').querySelector('svg').style.clipPath = `inset(${(1 - out3(P(t, 1.35, 1.8))) * 100}% 0 0 0)`;
  word.forEach((c, i) => { const x = outExpo(P(t, 1.55 + i * 0.05, 2.05 + i * 0.05)); S(c, { y:lerp(26, 0, x) }); });
  const tg = out3(P(t, 2.0, 2.4));
  S($('tag'), { y:lerp(3, 0, tg), o:tg });
  // logo hafifçe nefes alır, sonra yukarı çekilip çıkar
  const ex = inOut(P(t, 2.6, 3.1));
  S($('s-logo'), { s:lerp(1, 1.04, P(t, 1.2, 2.6)) * lerp(1, 0.75, ex), y:lerp(0, -30, ex), o:1 - P(t, 2.75, 3.1) });
});

// 3) dinle (6-13 sn): kart eğik gelir, cümleler kelime kelime yazılır, çevirisi mavi süpürmeyle gelir
const lab1 = $('l-lab');
lab1.querySelector('h2').innerHTML = TX.l1.map(s => `<span class="ln"><span>${s}</span></span>`).join('');
lab1.querySelector('p').textContent = TX.l1p;
$('l-rec').textContent = TX.rec;
const pairs = LINES.map(([en, tr]) => {
  const pr = $('l-lines').appendChild(el('div', 'pr'));
  const e = pr.appendChild(el('div', 'en')), ws = words(e, en);
  const t = pr.appendChild(el('div', 'tr', '<i class="bg"></i><i class="bar"></i><span class="tx"></span>'));
  t.querySelector('.tx').textContent = tr;
  return { pr, ws, tr:t };
});
const lwave = Array.from({ length:LAND ? 70 : 60 }, () => $('l-wave').appendChild(el('i')));
function label(lab, t) {
  S(lab.querySelector('.num'), { o:out3(P(t, 0.1, 0.4)), x:lerp(-4, 0, out3(P(t, 0.1, 0.5))) });
  lab.querySelectorAll('h2 .ln > span').forEach((s, i) => S(s, { y:lerp(14, 0, outExpo(P(t, 0.2 + i * 0.12, 0.8 + i * 0.12))) }));
  const p = out3(P(t, 0.55, 1.0));
  S(lab.querySelector('p'), { o:p, y:lerp(2, 0, p) });
}
scene('s-listen', 6, 13.1, t => {
  label(lab1, t);
  const en = P(t, 0, 0.9);
  S($('l-card'), { rx:lerp(32, 0, outExpo(en)), y:lerp(60, 0, outExpo(en)), o:en > 0 ? 1 : 0 });
  // kamera yavaşça yaklaşır
  S($('l-cam'), { s:lerp(1, 1.05, inOut(P(t, 0.6, 7))) });
  $('l-time').textContent = '23:4' + Math.min(9, Math.floor(t));
  $('l-card').querySelector('.rec').style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 / BEAT / 2));
  pairs.forEach((p, k) => {
    const st = 0.9 + k * 1.75;
    p.ws.forEach((w, i) => { const x = P(t, st + i * 0.065, st + i * 0.065 + 0.22); S(w, { o:x, y:lerp(1.5, 0, out3(x)), b:lerp(0.4, 0, x) }); });
    const te = st + p.ws.length * 0.065 + 0.1;
    S(p.tr.querySelector('.bg'), { sx:outExpo(P(t, te, te + 0.45)), sy:1 });
    S(p.tr.querySelector('.bar'), { sy:outExpo(P(t, te, te + 0.3)), sx:1 });
    const tx = P(t, te + 0.12, te + 0.5);
    const tx2 = p.tr.querySelector('.tx'); tx2.style.clipPath = `inset(0 ${(1 - out3(tx)) * 100}% 0 0)`;
    S(tx2, { x:lerp(-1.5, 0, out3(tx)) });
  });
  lwave.forEach((b, i) => { b.style.height = (0.8 + noise(i, t) * 5.6) * U + 'px'; });
  // çıkış: hızlı sola kayma, hareket bulanıklığı
  const ex = in3(P(t, 6.6, 7.05));
  S($('s-listen'), { x:lerp(0, -130, ex), b:ex * 2.2, o:1 - P(t, 6.9, 7.05) });
});

// --- 4-9. sahnelerin metinleri ---
const TX2 = {
  tr: {
    r:['Takıldığın kelime,', '<em>cümlesindeki</em> anlamıyla.'], rp:'Kelimenin üstüne gel, sözlükteki ilk anlamı değil, o cümlede ne demek olduğunu gör.',
    ctx:'bu cümlede', oth:'diğer: ayı, taşımak, dayanmak', add:'+ Defterime ekle', chip:'<i>✓</i>Kelime defterine eklendi',
    n:['Notun', '<em>dersin</em> yanında.'], np:'Her derse, her PDF\'e ayrı not. Yanında çeviri kutusu.',
    nh:'Bellek: 3 aşama', nl:[['Kodlama', ': dikkat yoksa kodlama yok'], ['Depolama', ''], ['Geri getirme', ': kendini sına']],
    nq:'Okumak yetmez, hatırlamaya çalış.', nc:['3. okuma parçasını bitir', 'Kartlarla kelimeleri çalış'], npill:'Notlar', ntr:'Çeviri',
    c:['Sınavdan önce', '<em>tekrar et.</em>'], cp:'Kelimeler kartlara dönüşür. Bilmediğin sık, bildiğin seyrek gelir.',
    cf:'kelime defteri', cb:'anlamı', again:'Tekrar', know:'Biliyorum',
    mont:['Ücretsiz.', 'Hesap <em>yok.</em>', 'Reklam <em>yok.</em>', '<em>İnternetsiz</em> de çalışır.', 'Telefona <em>kurulur.</em>', 'PDF. Word. <em>Ses.</em>', 'Ders <em>özeti</em> tek tıkla.', 'Açık <em>kaynak.</em>'],
    ph:'Her şey <em>senin</em> cihazında.', rd:'senin cihazın · bugün',
    rl:[['Sunucuya giden ders', '0'], ['Hesap, şifre', 'yok'], ['Reklam, takip', 'yok'], ['Aylık ücret', '0,00 ₺']], tot:['TOPLAM', '0,00 ₺'], stamp:'Ücretsiz',
    meta:'Ücretsiz · Hesap yok · Açık kaynak',
  },
  en: {
    r:['Stuck on', 'a <em>word?</em>'], rp:'Hover it to see what it means in that sentence, not just the first dictionary entry.',
    ctx:'in this sentence', oth:'other: ayı, taşımak, dayanmak', add:'+ Add to notebook', chip:'<i>✓</i>Added to your word notebook',
    n:['Notes right', '<em>next</em> to the lecture.'], np:'A notes page for every lecture and PDF, with a translate box beside it.',
    nh:'Memory: 3 stages', nl:[['Encoding', ': no attention, no encoding'], ['Storage', ''], ['Retrieval', ': test yourself']],
    nq:'Rereading isn\'t enough. Try to recall.', nc:['Finish reading 3', 'Study the word cards'], npill:'Notes', ntr:'Translate',
    c:['Review', '<em>before</em> the exam.'], cp:'Saved words become flashcards. The ones you miss come back sooner.',
    cf:'word notebook', cb:'meaning', again:'Again', know:'I know it',
    mont:['Free.', 'No <em>account.</em>', 'No <em>ads.</em>', 'Works <em>offline.</em>', 'Installs on your <em>phone.</em>', 'PDF. Word. <em>Audio.</em>', 'Lecture <em>summaries.</em>', 'Open <em>source.</em>'],
    ph:'It all stays on <em>your</em> device.', rd:'your device · today',
    rl:[['Lectures sent to a server', '0'], ['Account, password', 'none'], ['Ads, tracking', 'none'], ['Monthly fee', '$0.00']], tot:['TOTAL', '$0.00'], stamp:'Free',
    meta:'Free · No account · Open source',
  },
}[LANG];
function setLab(id, h, p) { const l = $(id); l.querySelector('h2').innerHTML = h.map(s => `<span class="ln"><span>${s}</span></span>`).join(''); l.querySelector('p').textContent = p; return l; }

// 4) oku (13-19 sn): PDF sağdan döner gelir, imleç "bear"e gider, kutu açılır, kamera yaklaşır, cümle işaretlenir
const labR = setLab('r-lab', TX2.r, TX2.rp);
$('r-p2').innerHTML = 'Short-term memory holds only a few items at a time. <span class="hlw" id="r-hl">Most people cannot <span id="r-w">bear</span> long lists of unrelated facts</span> for more than a few seconds.';
$('r-ctx').textContent = TX2.ctx; $('r-oth').textContent = TX2.oth; $('r-add').textContent = TX2.add; $('r-chip').innerHTML = TX2.chip;
let RW = null;  // kelimenin sayfadaki yeri (yazı tipleri yüklenince ölçülür)
function layoutRead() {
  const w = $('r-w'), tip = $('r-tip'), pdf = $('r-pdf');
  RW = { x:w.offsetLeft + w.offsetWidth / 2, y:w.offsetTop, h:w.offsetHeight };
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = clamp(RW.x - tw / 2, 2 * U, pdf.offsetWidth - tw - 2 * U) + 'px';
  tip.style.top = RW.y - th - 2.2 * U + 'px';
  tip.style.transformOrigin = (RW.x - parseFloat(tip.style.left)) + 'px 100%';
  pdf.style.transformOrigin = RW.x + 'px ' + RW.y + 'px';
}
scene('s-read', 13, 19.15, t => {
  label(labR, t);
  const en = outExpo(P(t, 0, 0.8));
  S($('r-cam'), { x:lerp(110, 0, en), ry:lerp(-40, 0, en), o:t > 0 ? 1 : 0 });
  // imleç sağ alttan kelimeye gider
  const cp = inOut(P(t, 0.9, 1.8)), sx = 72 * U, sy = 110 * U;
  const cx = lerp(sx, RW.x - 0.6 * U, cp), cy = lerp(sy, RW.y + RW.h * 0.55, cp) - Math.sin(cp * Math.PI) * 10 * U;
  const press = P(t, 1.85, 2.0) - P(t, 2.0, 2.15);
  $('r-cur').style.transform = `translate(${cx}px,${cy}px) scale(${1 - press * 0.15})`;
  $('r-cur').style.opacity = 1 - P(t, 4.6, 4.9);
  $('r-w').style.setProperty('--ul', outExpo(P(t, 1.75, 2.1)));
  $('r-w').style.background = `rgba(59,108,245,${0.14 * P(t, 1.8, 2.0)})`;
  const tp = P(t, 2.0, 2.7);
  S($('r-tip'), { s:spring(tp, 6, 12), o:tp > 0 ? 1 : 0, y:lerp(2, 0, out3(tp)) });
  // kamera kutuya yaklaşır, sonra geri çekilir
  const zin = inOut(P(t, 2.1, 3.0)), zout = inOut(P(t, 3.9, 4.6));
  const Z = LAND ? 0.2 : 0.32;
  S($('r-pdf'), { s:1 + Z * zin - Z * zout });
  $('r-hl').style.setProperty('--hs', outExpo(P(t, 3.2, 4.0)) * 100 + '%');
  // "Defterime ekle"ye basılır
  const bp = P(t, 4.25, 4.35) - P(t, 4.35, 4.5);
  S($('r-add'), { s:1 - bp * 0.1 });
  const ch = P(t, 4.45, 5.0);
  S($('r-chip'), { s:spring(ch), o:ch > 0 ? 1 - P(t, 5.5, 5.8) : 0, y:lerp(3, 0, out3(ch)) });
  // çıkış: kameranın içinden geçer gibi büyüyüp bulanıklaşır
  const ex = in3(P(t, 5.6, 6.1));
  S($('s-read'), { s:lerp(1, 2.4, ex), b:ex * 3, o:1 - P(t, 5.85, 6.1) });
});

// 5) not al (19-24 sn): başlık yazılır, maddeler gelir, kutu tiklenir, yan kutuda çeviri
const labN = setLab('n-lab', TX2.n, TX2.np);
$('n-pill').textContent = TX2.npill; $('n-trh').textContent = TX2.ntr;
const nb = $('n-body');
const nh = nb.appendChild(el('h4'));
const nli = TX2.nl.map(([b, r]) => nb.appendChild(el('div', 'li', `<span><b>${b}</b>${r}</span>`)));
const nq = nb.appendChild(el('div', 'quote', TX2.nq));
const nck = TX2.nc.map(c => nb.appendChild(el('div', 'li ck', `<span class="box"><svg viewBox="0 0 24 24"><path pathLength="1" d="M6 12.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1"/></svg></span><span class="ckt">${c}<i></i></span>`)));
const typeTo = (e, s, x, caret) => { const n = Math.round(s.length * x); e.innerHTML = esc(s.slice(0, n)) + (caret ? '<span class="caret"></span>' : ''); };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const TRIN = 'testing effect', TROUT = 'test etkisi';
scene('s-notes', 19, 24.15, t => {
  label(labN, t);
  const en = outExpo(P(t, 0, 0.8));
  S($('n-card'), { rx:lerp(-30, 0, en), y:lerp(-50, 0, en), o:t > 0 ? 1 : 0 });
  const blink = Math.floor(t * 4) % 2 === 0;
  const hx = P(t, 0.6, 1.3);
  typeTo(nh, TX2.nh, hx, hx < 1 || (t < 1.6 && blink));
  nli.forEach((li, i) => { const x = P(t, 1.3 + i * 0.22, 1.6 + i * 0.22); S(li, { o:x, x:lerp(-4, 0, outExpo(x)) }); });
  const q = P(t, 2.0, 2.35); S(nq, { o:q, x:lerp(-4, 0, outExpo(q)) });
  nck.forEach((li, i) => { const x = P(t, 2.25 + i * 0.2, 2.55 + i * 0.2); S(li, { o:x, x:lerp(-4, 0, outExpo(x)) }); });
  // ilk kutu tiklenir, yazının üstü çizilir
  const ck = P(t, 2.9, 3.2), box = nck[0].querySelector('.box');
  box.classList.toggle('on', ck > 0);
  S(box, { s:1 + 0.25 * Math.sin(ck * Math.PI) });
  box.querySelector('path').style.strokeDashoffset = 1 - out3(P(t, 2.95, 3.25));
  S(nck[0].querySelector('.ckt i'), { sx:outExpo(P(t, 3.1, 3.5)), sy:1 });
  nck[0].querySelector('.ckt').style.color = P(t, 3.1, 3.3) > 0 ? 'var(--muted)' : '';
  // çeviri kutusu kayarak gelir, yazılan metin anında çevrilir
  const tb = outExpo(P(t, 3.0, 3.6));
  S($('n-tr'), { x:lerp(40, 0, tb), r:lerp(6, -1.5, tb), o:tb > 0 ? 1 : 0 });
  const ti = P(t, 3.5, 4.2);
  typeTo($('n-in'), TRIN, ti, ti < 1 || blink);
  const to = P(t, 4.0, 4.4);
  $('n-out').textContent = to > 0 ? TROUT : '';
  S($('n-out'), { o:to > 0 ? 1 : 0, b:lerp(0.6, 0, out3(to)) });
  // çıkış: yukarı kayar
  const ex = in3(P(t, 4.65, 5.1));
  S($('s-notes'), { y:lerp(0, -120, ex), b:ex * 2, o:1 - P(t, 4.95, 5.1) });
});

// 6) çalış (24-29 sn): kart döner, "Biliyorum", kart uçar, sıradaki öne gelir
const labC = setLab('c-lab', TX2.c, TX2.cp);
$('c-again').textContent = TX2.again; $('c-know').textContent = TX2.know;
const CARDS = [['retrieval', 'geri getirme', 'Retrieval practice makes memories stronger.'], ['encode', 'kodlamak', 'The information never gets encoded.'], ['bear', 'katlanmak', 'Most people cannot bear long lists.']];
const fcs = CARDS.map(([w, m, ex]) => {
  const c = el('div', 'fc', `<div class="fa"><small>${TX2.cf}</small><div class="w">${w}</div></div><div class="fb"><small>${TX2.cb}</small><div class="m serif">${m}</div><div class="ex">${ex}</div></div>`);
  $('c-deck').prepend(c);  // ilk kart en üstte
  return c;
});
const CS = [0.9, 2.15, 3.4];  // her kartın sırası
scene('s-cards', 24, 29.15, t => {
  label(labC, t);
  // kaç kart uçtu (yumuşak geçişli)
  const gone = [0, 1].reduce((a, i) => a + inOut(P(t, CS[i] + 1.0, CS[i] + 1.35)), 0);
  fcs.forEach((c, i) => {
    const d = i - gone, inn = outExpo(P(t, 0.05 * (2 - i), 0.05 * (2 - i) + 0.8));
    const flip = inOut(P(t, CS[i] + 0.2, CS[i] + 0.75));
    const fly = i < 2 ? in3(P(t, CS[i] + 1.0, CS[i] + 1.35)) : 0;
    const dd = Math.max(0, d);
    // saydamlık kartın kendisine verilmez: 1'in altına inince 3B düzleşir ve arka yüz ters görünür
    S(c, { y:lerp(70, -dd * 4, inn), s:1 - dd * 0.06, r:(i % 2 ? 2.5 : -2.5) * Math.min(dd, 1) + fly * 22, ry:flip * 180, x:fly * 110 });
    c.querySelectorAll('.fa, .fb').forEach(f => { f.style.opacity = inn * (1 - fly); });
  });
  const pr = [0, 1, 2].reduce((a, i) => a + outExpo(P(t, CS[i] + 0.9, CS[i] + 1.2)), 0) / 3;
  S($('c-bar'), { sx:pr, sy:1 });
  const bp = [0, 1, 2].reduce((a, i) => a + (P(t, CS[i] + 0.82, CS[i] + 0.9) - P(t, CS[i] + 0.9, CS[i] + 1.02)), 0);
  S($('c-know'), { s:1 - bp * 0.12 });
  const bt = outExpo(P(t, 0.4, 1.0)); S($('c-know').parentNode, { o:bt, y:lerp(6, 0, bt) });
  // çıkış: hızlı sağa kayma
  const ex = in3(P(t, 4.65, 5.1));
  S($('s-cards'), { x:lerp(0, 130, ex), b:ex * 2.2, o:1 - P(t, 4.95, 5.1) });
});

// 7) montaj (29-33 sn): her vuruşta bir kelime, arka plan bir yandan silinerek değişir
const STY = ['paper', 'ink', 'blue', 'paper', 'ink', 'blue', 'paper', 'ink'];
const mts = TX2.mont.map((h, i) => {
  const m = $('s-mont').appendChild(el('div', 'mt ' + STY[i], `<h2>${h}</h2><div class="sm">0${i + 1} / 08</div>`));
  return m;
});
const WIPES = ['inset(0 0 0 100%)', 'inset(100% 0 0 0)', 'inset(0 100% 0 0)', 'inset(0 0 100% 0)'];
scene('s-mont', 29, 33.15, t => {
  mts.forEach((m, i) => {
    const st = i * BEAT, on = t >= st && t < st + BEAT + 0.15;
    // visibility değil display: çocuktaki 'visible', gizli sahneyi delip görünür kalıyordu
    m.style.display = on ? '' : 'none';
    if (!on) return;
    const x = outExpo(P(t, st, st + 0.2));
    // girişte bir kenardan silinerek gelir
    const w = WIPES[i % 4].replace(/100%/, (1 - x) * 100 + '%');
    m.style.clipPath = w;
    m.style.zIndex = i;
    const h = m.querySelector('h2');
    S(h, { s:lerp(1.45, 1, outExpo(P(t, st, st + 0.3))) * lerp(1, 1.06, P(t, st + 0.3, st + BEAT)), b:lerp(0.8, 0, out3(P(t, st, st + 0.18))), r:i % 2 ? -1.5 : 1.5 });
  });
  // son panel aşağı kayıp kâğıdı açar
  const ex = in3(P(t, 3.75, 4.1));
  S($('s-mont'), { y:lerp(0, 105, ex) });
});

// 8) fiş (33-36 sn): yarıktan basılarak çıkar, "Ücretsiz" damgası vurulur
$('p-h').innerHTML = TX2.ph;
$('p-rc').innerHTML = `<div class="h">LECMIC</div><div class="d">${TX2.rd}</div>` + TX2.rl.map(([a, b]) => `<div class="ln"><span>${a}</span><span>${b}</span></div>`).join('') + `<hr><div class="ln tot"><span>${TX2.tot[0]}</span><span>${TX2.tot[1]}</span></div><hr>`;
$('p-stamp').textContent = TX2.stamp;
scene('s-rcpt', 33, 36.15, t => {
  const h = outExpo(P(t, 0, 0.5)); S($('p-h'), { y:lerp(-8, 0, h), o:h });
  S(document.querySelector('.slot'), { sx:outExpo(P(t, 0.15, 0.5)), sy:1 });
  // fiş kesik kesik basılır, yazıcı gibi
  const pr = P(t, 0.45, 1.6), stepped = Math.floor(pr * 14) / 14 * 0.6 + pr * 0.4;
  // yukarıdan aşağı açılır: önce başlık, en son toplam
  $('p-rc').style.clipPath = `inset(0 0 ${(1 - stepped) * 100}% 0)`;
  S($('p-rc'), { y:lerp(-4, 0, out3(pr)), o:pr > 0 ? 1 : 0 });
  const sp = P(t, 1.8, 2.05);
  S($('p-stamp'), { s:lerp(2.6, 1, out3(sp)), r:-10, o:sp > 0 ? 0.92 : 0 });
  // damga vurulunca fiş sarsılır
  const sh = P(t, 2.0, 2.25);
  S($('p-rc').parentNode, { x:Math.sin(sh * Math.PI * 4) * (1 - sh) * 1.4 });
  const ex = inOut(P(t, 2.6, 3.1));
  S($('s-rcpt'), { s:lerp(1, 0.86, ex), o:1 - ex, y:lerp(0, -10, ex) });
});

// 9) kapanış (36-40 sn): logo, isim, adres el çizimi çizgiyle
const ew = [...'Lecmic'].map(c => $('e-word').appendChild(el('span', '', c)));
$('e-tag').innerHTML = TX.tag; $('e-meta').textContent = TX2.meta;
const URLT = 'lecmic.whyasaf.com';
scene('s-end', 36, 40.01, t => {
  const tp = P(t, 0.05, 0.85);
  S($('e-tile'), { s:spring(tp, 5, 11), r:lerp(-60, 0, outExpo(tp)), o:tp > 0 ? 1 : 0 });
  $('e-tile').querySelector('svg').style.clipPath = `inset(${(1 - out3(P(t, 0.3, 0.75))) * 100}% 0 0 0)`;
  ew.forEach((c, i) => { const x = outExpo(P(t, 0.4 + i * 0.05, 0.9 + i * 0.05)); S(c, { y:lerp(26, 0, x) }); });
  const tg = out3(P(t, 0.9, 1.3)); S($('e-tag'), { o:tg, y:lerp(3, 0, tg) });
  const ux = P(t, 1.3, 2.0);
  $('e-urlt').textContent = URLT.slice(0, Math.round(URLT.length * ux));
  $('e-line').style.strokeDasharray = 1; $('e-line').style.strokeDashoffset = 1 - inOut(P(t, 2.0, 2.5));
  const mt = out3(P(t, 2.4, 2.8)); S($('e-meta'), { o:mt, y:lerp(2, 0, mt) });
  S($('s-end'), { s:lerp(0.97, 1.02, P(t, 0, 4)) });
});

const DURATION = 40;

// --- oynatma ---
function seek(t) {
  paper(t);
  for (const s of scenes) {
    const on = t >= s.a && t < s.b;
    s.el.style.visibility = on ? 'visible' : 'hidden';
    if (on) s.f(t - s.a);
  }
}
window.seek = seek; window.DURATION = DURATION;
window.ready = document.fonts.ready.then(() => { layoutRead(); seek(0); return true; });

// tarayıcıda açılınca kendi kendine oynar. render.mjs ?render ile açar, o zaman oynamaz
if (!Q.has('render')) {
  let t0 = performance.now(), paused = false, at = 0;
  const loop = now => { if (!paused) { at = ((now - t0) / 1000) % DURATION; seek(at); } requestAnimationFrame(loop); };
  window.ready.then(() => requestAnimationFrame(loop));
  addEventListener('keydown', e => {
    if (e.key === ' ') { paused = !paused; t0 = performance.now() - at * 1000; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { at = clamp(at + (e.key === 'ArrowRight' ? 0.5 : -0.5), 0, DURATION); t0 = performance.now() - at * 1000; seek(at); }
  });
  // pencereye sığdır
  const fit = () => { const k = Math.min(innerWidth / W, innerHeight / H); $('stage').style.transform = `scale(${k})`; $('stage').style.transformOrigin = '0 0'; };
  fit(); addEventListener('resize', fit);
}
