/* Drink — Wasser-Tracker als PWA
   Alle Daten liegen in localStorage, nichts verlässt das Gerät. */

const KEY = 'drink.v1';
const PRESETS = [100, 200, 250, 333, 500, 750, 1000, 1500, 2000];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];        // Anzeige
const WD_IDX = [1, 2, 3, 4, 5, 6, 0];                          // getDay()

const DEFAULTS = {
  goalMode: 'manual',
  goalManual: 2000,
  profile: { weight: 70, age: 30, height: 175, sex: 'w' },
  extra: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  amounts: [250, 333, 500],
  notif: { on: true, time: '07:00' },
  asked: false,
  setupDone: false,
  log: {}            // { '2026-08-14': [250, 500, ...] }
};

let S = load();

/* ---------------- Speicher ---------------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return Object.assign(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch (e) {
    return structuredClone(DEFAULTS);
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  syncToWorker();
}
const todayKey = (d = new Date()) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* ---------------- Rechnen ---------------- */
function baseGoal() {
  if (S.goalMode === 'calc') return calcGoal(S.profile);
  return clamp(+S.goalManual || 2000, 200, 8000);
}
function goalToday(d = new Date()) {
  return baseGoal() + (+S.extra[d.getDay()] || 0);
}
function calcGoal(p) {
  const w = clamp(+p.weight || 70, 20, 250);
  const a = clamp(+p.age || 30, 10, 110);
  const h = clamp(+p.height || 175, 100, 230);
  let perKg = a < 30 ? 40 : a <= 55 ? 35 : 30;     // ml pro kg
  let ml = w * perKg;
  ml *= p.sex === 'm' ? 1.05 : p.sex === 'w' ? 0.95 : 1;
  ml *= 1 + (h - 175) / 175 * 0.08;                 // Größe wirkt leicht mit
  return clamp(Math.round(ml / 50) * 50, 800, 5000);
}
function drunkToday() {
  return (S.log[todayKey()] || []).reduce((a, b) => a + b, 0);
}
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const fmt = n => Math.round(n).toLocaleString('de-DE');

/* ---------------- Darstellung ---------------- */
const $ = s => document.querySelector(s);
const el = {
  have: $('#have'), goal: $('#goal'), bar: $('#bar'), fill: $('#barFill'),
  label: $('#barLabel'), water: $('#water'), img: $('#moodImg'),
  fallback: $('#moodFallback'), quick: $('#quick'), undo: $('#undoBtn')
};
const MOOD_FILES = ['eins', 'zwei', 'drei', 'vier', 'fuenf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
const MOOD_FALLBACK = ['😵', '🥵', '😣', '😕', '😐', '🙂', '😊', '😃', '😁', '🤩'];

function moodIndex(pct) {                     // 1 … 10
  if (pct <= 0) return 1;
  return clamp(Math.ceil(pct * 10), 1, 10);
}

function render() {
  const goal = goalToday();
  const have = drunkToday();
  const pct = goal > 0 ? have / goal : 0;
  const shown = Math.min(1, pct);

  el.have.textContent = fmt(have);
  el.goal.textContent = fmt(goal);
  el.fill.style.width = (shown * 100).toFixed(1) + '%';
  el.bar.setAttribute('aria-valuenow', Math.round(pct * 100));
  el.bar.classList.toggle('done', pct >= 1);
  el.water.style.height = (shown * 100).toFixed(1) + '%';

  const rest = goal - have;
  el.label.textContent = have === 0
    ? 'Noch nichts getrunken heute'
    : rest > 0 ? `Noch ${fmt(rest)} ml bis zum Ziel`
      : rest === 0 ? 'Ziel erreicht' : `Ziel erreicht, ${fmt(-rest)} ml darüber`;

  const i = moodIndex(pct);
  const src = `emoji/${MOOD_FILES[i - 1]}.png`;
  if (!el.img.src.endsWith(src)) el.img.src = src;
  el.fallback.textContent = MOOD_FALLBACK[i - 1];

  el.undo.disabled = (S.log[todayKey()] || []).length === 0;
  renderQuick();
  renderSummaries();
}

el.img.addEventListener('error', () => {      // Platzhalter fehlt? Dann Text-Emoji.
  el.img.hidden = true;
  el.fallback.hidden = false;
});

function renderQuick() {
  const want = S.amounts.slice(0, 5);
  if (el.quick.dataset.sig === want.join(',')) return;
  el.quick.dataset.sig = want.join(',');
  el.quick.innerHTML = '';
  want.forEach(ml => {
    const b = document.createElement('button');
    b.className = 'sip';
    b.innerHTML = `<b>${ml >= 1000 ? fmt(ml / 1000).replace('.', ',') : ml}</b><span>${ml >= 1000 ? 'Liter' : 'ml'}</span>`;
    b.setAttribute('aria-label', `${fmt(ml)} Milliliter trinken`);
    b.addEventListener('click', () => addDrink(ml));
    el.quick.appendChild(b);
  });
}

function addDrink(ml) {
  const k = todayKey();
  (S.log[k] ||= []).push(ml);
  save(); render();
  el.img.classList.add('pop');
  setTimeout(() => el.img.classList.remove('pop'), 400);
  toast(`+${fmt(ml)} ml`);
}
el.undo.addEventListener('click', () => {
  const k = todayKey();
  if (!S.log[k]?.length) return;
  const ml = S.log[k].pop();
  save(); render();
  toast(`${fmt(ml)} ml zurückgenommen`);
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

/* ---------------- Menü ---------------- */
const drawer = $('#drawer'), scrim = $('#scrim');
function openMenu(open) {
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  scrim.hidden = !open;
  $('#menuBtn').setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
$('#menuBtn').addEventListener('click', () => openMenu(true));
$('#closeBtn').addEventListener('click', () => openMenu(false));
scrim.addEventListener('click', () => openMenu(false));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#guide').hidden) { $('#guide').hidden = true; return; }
  openMenu(false);
});

/* ---------------- Teilen ---------------- */
$('#shareBtn').addEventListener('click', async () => {
  const url = location.href.split('?')[0];
  const data = { title: 'Drink', text: 'Drink — die App, die dafür sorgt, dass du genug trinkst.', url };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(url); toast('Link kopiert'); }
  } catch (e) { /* abgebrochen */ }
});

/* ---------------- Ziel ---------------- */
const segs = document.querySelectorAll('.seg-btn');
function paintMode() {
  segs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === S.goalMode)));
  $('#modeManual').hidden = S.goalMode !== 'manual';
  $('#modeCalc').hidden = S.goalMode !== 'calc';
  $('#calcOut').textContent = 'Empfehlung: ' + fmt(calcGoal(S.profile)) + ' ml';
}
segs.forEach(b => b.addEventListener('click', () => {
  S.goalMode = b.dataset.mode;
  if (S.goalMode === 'calc') S.goalManual = calcGoal(S.profile);
  save(); paintMode(); render();
}));

$('#goalManual').addEventListener('input', e => {
  S.goalManual = clamp(+e.target.value || 0, 200, 8000);
  save(); render();
});
['pWeight', 'pAge', 'pHeight'].forEach(id => $('#' + id).addEventListener('input', e => {
  S.profile[{ pWeight: 'weight', pAge: 'age', pHeight: 'height' }[id]] = +e.target.value;
  save(); paintMode(); render();
}));
$('#pSex').addEventListener('change', e => { S.profile.sex = e.target.value; save(); paintMode(); render(); });

function buildWeekdays() {
  const box = $('#weekdays'); box.innerHTML = '';
  WD.forEach((name, i) => {
    const day = WD_IDX[i];
    const wrap = document.createElement('label');
    wrap.className = 'wd';
    wrap.innerHTML = `<span>${name}</span><input type="number" min="0" max="3000" step="50"
      inputmode="numeric" value="${S.extra[day] || 0}" aria-label="Aufschlag ${name} in Milliliter">`;
    wrap.querySelector('input').addEventListener('input', e => {
      S.extra[day] = clamp(+e.target.value || 0, 0, 3000);
      save(); render();
    });
    box.appendChild(wrap);
  });
}

/* ---------------- Mengen ---------------- */
function buildChips() {
  [$('#presetChips'), $('#setupChips')].forEach(box => {
    if (!box) return;
    box.innerHTML = '';
    const all = [...new Set([...PRESETS, ...S.amounts])].sort((a, b) => a - b);
    all.forEach(ml => {
      const on = S.amounts.includes(ml);
      const c = document.createElement('button');
      c.className = 'chip';
      c.type = 'button';
      c.setAttribute('aria-pressed', String(on));
      c.textContent = ml >= 1000 ? fmt(ml / 1000).replace('.', ',') + ' l' : ml + ' ml';
      if (!PRESETS.includes(ml)) {
        const x = document.createElement('span');
        x.className = 'x'; x.textContent = '×';
        c.appendChild(x);
      }
      c.addEventListener('click', () => toggleAmount(ml));
      box.appendChild(c);
    });
  });
  $('#amountsHint').textContent = `${S.amounts.length} von 5 ausgewählt. Mindestens eine Größe muss aktiv bleiben.`;
}
function toggleAmount(ml) {
  const on = S.amounts.includes(ml);
  if (on) {
    if (S.amounts.length === 1) return toast('Eine Größe muss bleiben');
    S.amounts = S.amounts.filter(x => x !== ml);
  } else {
    if (S.amounts.length >= 5) return toast('Mehr als 5 gehen nicht');
    S.amounts = [...S.amounts, ml].sort((a, b) => a - b);
  }
  save(); buildChips(); render();
}
$('#addCustom').addEventListener('click', () => {
  const inp = $('#customMl');
  const ml = clamp(Math.round(+inp.value || 0), 10, 3000);
  if (!ml) return toast('Zahl eingeben');
  if (S.amounts.includes(ml)) return toast('Schon in der Auswahl');
  if (S.amounts.length >= 5) return toast('Mehr als 5 gehen nicht');
  S.amounts = [...S.amounts, ml].sort((a, b) => a - b);
  inp.value = '';
  save(); buildChips(); render();
});

/* ---------------- Erinnerung ---------------- */
function notifState() {
  const p = 'Notification' in window ? Notification.permission : 'unsupported';
  const box = $('#notifState');
  if (p === 'unsupported') box.textContent = 'Dieser Browser kennt keine Benachrichtigungen. Auf dem iPhone klappt es erst, wenn die App über „Zum Home-Bildschirm" installiert ist.';
  else if (p === 'denied') box.textContent = 'Benachrichtigungen sind für diese Seite blockiert. Das lässt sich nur in den Browser-Einstellungen wieder freigeben.';
  else if (p === 'granted') box.textContent = 'Erlaubt. Die Erinnerung kommt, sobald das Gerät die App im Hintergrund aufweckt — auf manchen Systemen erst mit etwas Verzögerung.';
  else box.textContent = 'Die Erinnerung ist an, der Browser fragt beim ersten Antippen noch nach der Erlaubnis.';
}
$('#notifOn').addEventListener('change', async e => {
  if (e.target.checked) {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { e.target.checked = false; notifState(); return toast('Nicht erlaubt'); }
  }
  S.notif.on = e.target.checked;
  save(); notifState(); renderSummaries(); scheduleLocal();
});
$('#notifTime').addEventListener('change', e => {
  S.notif.time = e.target.value || '07:00';
  save(); renderSummaries(); scheduleLocal();
});
$('#testNotif').addEventListener('click', async () => {
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return toast('Nicht erlaubt');
  }
  const reg = await navigator.serviceWorker?.ready;
  reg ? reg.active?.postMessage({ type: 'test-notify' }) : null;
  notifState();
});

/* Balken für die Benachrichtigung: leer um 7 Uhr */
function barText(have, goal) {
  const n = 10, f = clamp(Math.round((have / goal) * n), 0, n);
  return '▰'.repeat(f) + '▱'.repeat(n - f);
}

/* Konfiguration an den Service Worker geben (der kann kein localStorage lesen) */
async function syncToWorker() {
  if (!navigator.serviceWorker?.controller) return;
  const goal = goalToday(), have = drunkToday();
  navigator.serviceWorker.controller.postMessage({
    type: 'config',
    config: {
      on: S.notif.on, time: S.notif.time,
      goal, have, bar: barText(have, goal),
      amounts: S.amounts.slice(0, 3)
    }
  });
}

/* Zusätzlich: solange die App offen ist, selbst nachsehen */
let localTimer;
function scheduleLocal() {
  clearInterval(localTimer);
  localTimer = setInterval(checkDue, 30000);
  checkDue();
}
async function checkDue() {
  if (!S.notif.on || Notification.permission !== 'granted') return;
  const now = new Date();
  const [h, m] = (S.notif.time || '07:00').split(':').map(Number);
  const due = new Date(now); due.setHours(h, m, 0, 0);
  const last = localStorage.getItem('drink.lastNotify');
  if (now >= due && last !== todayKey() && now - due < 6 * 3600e3) {
    localStorage.setItem('drink.lastNotify', todayKey());
    const reg = await navigator.serviceWorker?.ready;
    reg?.active?.postMessage({ type: 'notify-now' });
  }
}

/* ---------------- Zusammenfassungen im Menü ---------------- */
function renderSummaries() {
  $('#goalSummary').textContent = fmt(goalToday()) + ' ml';
  $('#guideSummary').textContent = isStandalone() ? 'Installiert' : 'Auf den Startbildschirm legen';
  $('#amountsSummary').textContent = S.amounts.length + ' ausgewählt';
  $('#notifSummary').textContent = S.notif.on ? S.notif.time + ' Uhr' : 'Aus';
}

/* ---------------- Zurücksetzen / Installieren ---------------- */
$('#resetBtn').addEventListener('click', () => {
  if (!confirm('Ziel, Mengen und alle getrunkenen Milliliter löschen?')) return;
  localStorage.removeItem(KEY);
  localStorage.removeItem('drink.lastNotify');
  S = structuredClone(DEFAULTS);
  save(); fillForm(); render(); buildChips(); buildWeekdays();
  openSetup();
});

let installEvent;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installEvent = e;
  $('#installBtn').hidden = false;
  if (!guideEl.hidden) paintGuide();
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  $('#installBtn').hidden = true;
  $('#guideInstall').hidden = true;
});
$('#installBtn').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt(); installEvent = null;
  $('#installBtn').hidden = true;
});

/* ---------------- Einrichtung ---------------- */
const setupEl = $('#setup');
const steps = [...document.querySelectorAll('.step')];
let step = 0;

function openSetup(fresh = false) {
  step = 0;
  fillSetup();
  setupEl.hidden = false;
  openMenu(false);
  paintStep();
}
function closeSetup() {
  setupEl.hidden = true;
  S.setupDone = true; save();
  fillForm(); render(); buildChips();
}
function paintStep() {
  steps.forEach((s, i) => s.hidden = i !== step);
  $('#setupDots').innerHTML = steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
  $('#setupBack').hidden = step === 0;
  $('#setupNext').textContent = step === 0 ? "Los geht's" : step === steps.length - 1 ? 'Fertig' : 'Weiter';
  if (step === steps.length - 1) finishStep();
  setupEl.scrollTop = 0;
}
$('#setupOpen').addEventListener('click', () => openSetup());
$('#setupBack').addEventListener('click', () => { step = Math.max(0, step - 1); paintStep(); });
$('#setupNext').addEventListener('click', async () => {
  if (step === 3) await requestNotif();          // Erlaubnis genau hier, mit Nutzeraktion
  if (step >= steps.length - 1) return closeSetup();
  step++; paintStep();
});

function fillSetup() {
  $('#sGoal').value = S.goalManual;
  $('#sWeight').value = S.profile.weight;
  $('#sAge').value = S.profile.age;
  $('#sHeight').value = S.profile.height;
  $('#sSex').value = S.profile.sex;
  $('#sTime').value = S.notif.time;
  $('#sNotifOn').checked = S.notif.on;
  paintSetupMode();
  buildChips();
}
function paintSetupMode() {
  $('#sSeg').querySelectorAll('.seg-btn').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.mode === S.goalMode)));
  $('#sManual').hidden = S.goalMode !== 'manual';
  $('#sCalc').hidden = S.goalMode !== 'calc';
  $('#sCalcOut').textContent = 'Empfehlung: ' + fmt(calcGoal(S.profile)) + ' ml';
}
$('#sSeg').querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
  S.goalMode = b.dataset.mode;
  if (S.goalMode === 'calc') S.goalManual = calcGoal(S.profile);
  save(); paintSetupMode(); paintMode(); fillForm(); render();
}));
$('#sGoal').addEventListener('input', e => { S.goalManual = clamp(+e.target.value || 0, 200, 8000); save(); render(); });
[['sWeight', 'weight'], ['sAge', 'age'], ['sHeight', 'height']].forEach(([id, k]) =>
  $('#' + id).addEventListener('input', e => { S.profile[k] = +e.target.value; save(); paintSetupMode(); render(); }));
$('#sSex').addEventListener('change', e => { S.profile.sex = e.target.value; save(); paintSetupMode(); render(); });
$('#sTime').addEventListener('change', e => { S.notif.time = e.target.value || '07:00'; save(); fillForm(); renderSummaries(); scheduleLocal(); });
$('#sNotifOn').addEventListener('change', async e => {
  S.notif.on = e.target.checked; save();
  if (e.target.checked) await requestNotif();
  fillForm(); renderSummaries(); scheduleLocal();
});

async function requestNotif() {
  if (!S.notif.on || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    S.asked = true; save();
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { S.notif.on = false; save(); $('#sNotifOn').checked = false; }
    } catch (e) {}
  }
  $('#sNotifState').textContent = Notification.permission === 'granted'
    ? 'Erlaubt.'
    : Notification.permission === 'denied'
      ? 'Blockiert — das lässt sich nur in den Browser-Einstellungen freigeben.'
      : 'Der Browser fragt gleich nach der Erlaubnis.';
  notifState(); scheduleLocal();
}

function finishStep() {
  const goal = fmt(baseGoal());
  const extras = Object.values(S.extra).some(v => +v > 0);
  $('#setupRecap').textContent =
    `${goal} ml am Tag, ${S.amounts.length === 1 ? 'eine Größe' : S.amounts.length + ' Größen'} in der Schnellauswahl`
    + (S.notif.on ? `, Erinnerung um ${S.notif.time} Uhr.` : ', ohne Erinnerung.')
    + (extras ? ' An deinen Sporttagen kommt der Aufschlag dazu.' : '');
  $('#sInstall').hidden = !installEvent;
}
$('#sInstall').addEventListener('click', () => {
  if (!installEvent) return;
  installEvent.prompt(); installEvent = null;
  $('#sInstall').hidden = true;
});

/* ---------------- Einrichtung: Anleitung ---------------- */
const guideEl = $('#guide');
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function detectOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

const GUIDE = {
  ios: {
    steps: [
      'Diese Seite in <b>Safari</b> öffnen. Andere Browser dürfen auf dem iPhone keine Erinnerungen schicken.',
      'Unten auf das <b>Teilen-Symbol</b> tippen, das Quadrat mit dem Pfeil nach oben.',
      'In der Liste nach unten wischen zu <b>Zum Home-Bildschirm</b>.',
      'Rechts oben <b>Hinzufügen</b> tippen.',
      'Drink vom Home-Bildschirm starten und die Erinnerung erlauben.'
    ],
    note: 'Ab iOS 16.4 klappen Benachrichtigungen — aber wirklich nur bei der installierten App, nicht im Safari-Tab.'
  },
  android: {
    steps: [
      'Diese Seite in <b>Chrome</b> öffnen.',
      'Oben rechts auf die <b>drei Punkte</b> tippen.',
      '<b>App installieren</b> wählen, je nach Version heißt es <b>Zum Startbildschirm hinzufügen</b>.',
      'Mit <b>Installieren</b> bestätigen.',
      'Drink vom Startbildschirm starten und die Erinnerung erlauben.'
    ],
    note: 'Erst als installierte App darf Drink im Hintergrund aufwachen und dich morgens erinnern.'
  },
  desktop: {
    steps: [
      'Diese Seite in <b>Chrome</b> oder <b>Edge</b> öffnen.',
      'Rechts in der Adresszeile auf das <b>Installieren-Symbol</b> klicken, den Bildschirm mit dem Pfeil.',
      'Mit <b>Installieren</b> bestätigen.',
      'Drink startet danach in einem eigenen Fenster.'
    ],
    note: 'Am Rechner erscheint die Erinnerung als Systembenachrichtigung, solange Drink läuft.'
  }
};

let guideOS = detectOS();
function paintGuide() {
  $('#guideTabs').querySelectorAll('.seg-btn').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.os === guideOS)));
  const g = GUIDE[guideOS];
  $('#guideSteps').innerHTML = g.steps.map(t => `<li>${t}</li>`).join('');
  $('#guideNote').textContent = g.note;
  $('#guideInstall').hidden = !installEvent || guideOS !== detectOS();
  $('#guideIntro').textContent = isStandalone()
    ? 'Drink liegt schon auf deinem Startbildschirm. Hier steht, wie es auf einem weiteren Gerät geht.'
    : 'Leg Drink auf den Startbildschirm. Nur so öffnet die App im Vollbild und darf dich erinnern, wenn sie geschlossen ist.';
}
$('#guideTabs').querySelectorAll('.seg-btn').forEach(b =>
  b.addEventListener('click', () => { guideOS = b.dataset.os; paintGuide(); }));
$('#guideOpen').addEventListener('click', () => {
  guideOS = detectOS(); paintGuide();
  guideEl.hidden = false; openMenu(false); guideEl.scrollTop = 0;
});
$('#guideClose').addEventListener('click', () => { guideEl.hidden = true; });
$('#guideShare').addEventListener('click', () => $('#shareBtn').click());
$('#guideInstall').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt(); installEvent = null;
  $('#guideInstall').hidden = true;
});

/* ---------------- Formular füllen ---------------- */
function fillForm() {
  $('#goalManual').value = S.goalManual;
  $('#pWeight').value = S.profile.weight;
  $('#pAge').value = S.profile.age;
  $('#pHeight').value = S.profile.height;
  $('#pSex').value = S.profile.sex;
  $('#notifOn').checked = S.notif.on;
  $('#notifTime').value = S.notif.time;
  paintMode();
}

/* ---------------- Start ---------------- */
fillForm(); buildWeekdays(); buildChips(); render(); notifState(); scheduleLocal();

/* Beim allerersten Start durch die Einrichtung führen */
if (!S.setupDone) openSetup(true);

/* Erlaubnis holen: Browser verlangen dafür eine Nutzeraktion,
   deshalb beim ersten Antippen — nicht erst im Menü. */
async function askOnce() {
  if (S.asked || !S.notif.on || !setupEl.hidden) return;
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  S.asked = true; save();
  try {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { S.notif.on = false; save(); $('#notifOn').checked = false; }
    notifState(); renderSummaries(); scheduleLocal();
  } catch (e) {}
}
document.addEventListener('pointerdown', askOnce, { once: true });
document.addEventListener('keydown', askOnce, { once: true });

/* Tageswechsel bemerken, wenn die App im Hintergrund lag */
let lastDay = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (todayKey() !== lastDay) { lastDay = todayKey(); }
  render(); checkDue();
});

/* Aus der Benachrichtigung heraus direkt eintragen: ?add=250 */
const p = new URLSearchParams(location.search);
if (p.has('add')) {
  const ml = clamp(+p.get('add') || 0, 10, 3000);
  if (ml) addDrink(ml);
  history.replaceState(null, '', location.pathname);
}

/* Service Worker */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(async reg => {
    await navigator.serviceWorker.ready;
    syncToWorker();
    try {
      const status = await navigator.permissions?.query({ name: 'periodic-background-sync' });
      if (status?.state === 'granted' && 'periodicSync' in reg) {
        await reg.periodicSync.register('drink-reminder', { minInterval: 60 * 60 * 1000 });
      }
    } catch (e) {}
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', syncToWorker);
}
