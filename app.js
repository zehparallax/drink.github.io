/* Drink — Wasser-Tracker als PWA.
   Alle Daten liegen in localStorage, nichts verlässt das Gerät. */

const KEY = 'drink.v1';
const PRESETS = [100, 200, 250, 333, 500, 750, 1000, 1500, 2000];
const WD_IDX = [1, 2, 3, 4, 5, 6, 0];        // Montag zuerst, passend zu getDay()

const DEFAULTS = {
  goalManual: 3000,
  profile: { weight: 70, age: 30, height: 175, sex: 'w' },
  extra: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  amounts: [250, 333, 500],
  notif: { on: true, time: '07:00' },
  asked: false,
  unitVol: 'ml',
  unitBody: 'metric',
  locale: null,          // null = noch nie gewählt, dann entscheidet der Browser
  log: {}                // { '2026-08-14': [250, 500, ...] }
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
const dayKey = (d = new Date()) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayKey = () => dayKey();

/* ---------------- Rechnen ---------------- */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function baseGoal() {
  return clamp(+S.goalManual || 3000, 200, 8000);
}
function goalFor(d = new Date()) {
  return baseGoal() + (+S.extra[d.getDay()] || 0);
}
function calcGoal(p) {
  const w = clamp(+p.weight || 70, 20, 250);
  const a = clamp(+p.age || 30, 10, 110);
  const h = clamp(+p.height || 175, 100, 230);
  const perKg = a < 30 ? 40 : a <= 55 ? 35 : 30;
  let ml = w * perKg;
  ml *= p.sex === 'm' ? 1.05 : p.sex === 'w' ? 0.95 : 1;
  ml *= 1 + (h - 175) / 175 * 0.08;
  return clamp(Math.round(ml / 50) * 50, 800, 5000);
}
const drunkOn = key => (S.log[key] || []).reduce((a, b) => a + b, 0);
const drunkToday = () => drunkOn(todayKey());

/* ---------------- Einheiten ----------------
   Gerechnet und gespeichert wird immer in Milliliter,
   umgestellt wird ausschließlich Anzeige und Eingabe. */
const VOL = {
  ml:      { short: 'ml',    per: 1,       dec: 0, step: 10   },
  l:       { short: 'l',     per: 1000,    dec: 2, step: 0.05 },
  floz_us: { short: 'fl oz', per: 29.5735, dec: 0, step: 1    },
  floz_uk: { short: 'fl oz', per: 28.4131, dec: 0, step: 1    },
  cup_us:  { short: 'cup',   per: 236.588, dec: 2, step: 0.25 }
};
const vu = () => VOL[S.unitVol] || VOL.ml;
const fromMl = ml => ml / vu().per;
const toMl = v => v * vu().per;
const volNum = ml => I18N.num(fromMl(ml), vu().dec);
const volLabel = ml => volNum(ml) + ' ' + vu().short;
const unitName = () => I18N.t('unit.' + S.unitVol).split('—')[0].trim();

function readNum(input) {                    // Komma und Punkt beide erlaubt
  const n = parseFloat(String(input.value).replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- Kürzel ---------------- */
const $ = s => document.querySelector(s);
const el = {
  have: $('#have'), goal: $('#goal'), bar: $('#bar'), fill: $('#barFill'),
  label: $('#barLabel'), water: $('#water'), img: $('#moodImg'),
  fallback: $('#moodFallback'), quick: $('#quick'), undo: $('#undoBtn')
};

const MOOD = ['eins', 'zwei', 'drei', 'vier', 'fuenf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
const MOOD_FALLBACK = ['😵', '🥵', '😣', '😕', '😐', '🙂', '😊', '😃', '😁', '🤩'];
const moodIndex = pct => pct <= 0 ? 1 : clamp(Math.ceil(pct * 10), 1, 10);

/* ---------------- Startbildschirm ---------------- */
function render() {
  const goal = goalFor();
  const have = drunkToday();
  const pct = goal > 0 ? have / goal : 0;
  const shown = Math.min(1, pct);

  el.have.textContent = volNum(have);
  el.goal.textContent = volNum(goal);
  $('#unitLabel').textContent = vu().short;
  el.fill.style.width = (shown * 100).toFixed(1) + '%';
  el.bar.setAttribute('aria-valuenow', Math.round(pct * 100));
  el.bar.classList.toggle('done', pct >= 1);
  el.water.style.height = (shown * 100).toFixed(1) + '%';

  const rest = goal - have;
  el.label.textContent = have === 0 ? I18N.t('home.nothing')
    : rest > 0 ? I18N.t('home.left', { v: volLabel(rest) })
    : rest === 0 ? I18N.t('home.reached')
    : I18N.t('home.over', { v: volLabel(-rest) });

  const i = moodIndex(pct);
  el.fallback.textContent = MOOD_FALLBACK[i - 1];
  const src = `emoji-${MOOD[i - 1]}.png`;
  if (el.img.dataset.src !== src) {
    el.img.dataset.src = src;
    el.img.src = src;
    /* Beim Wechsel nicht zurück aufs Textzeichen springen — das flackert bei
       jedem Eintrag. Nur solange noch nie ein Bild ankam, bleibt es stehen. */
    if (el.img.complete && el.img.naturalWidth > 0) {
      el.img.hidden = false; el.fallback.hidden = true;
    }
  }

  el.undo.disabled = (S.log[todayKey()] || []).length === 0;
  renderQuick();
  renderStreak();
  renderSummaries();
}

/* Emoji: Das Textzeichen steht sofort da, das Bild löst es erst ab, wenn es
   nachweislich geladen ist. So ist nie eine leere Fläche zu sehen — weder beim
   ersten Aufruf mit kaltem Cache noch wenn eine Datei fehlt. */
el.img.addEventListener('load', () => {
  if (el.img.naturalWidth > 0) { el.img.hidden = false; el.fallback.hidden = true; }
});
el.img.addEventListener('error', () => {
  el.img.hidden = true; el.fallback.hidden = false;
});

function renderQuick() {
  const want = S.amounts.slice(0, 5);
  const sig = want.join(',') + '|' + S.unitVol + '|' + I18N.region.code;
  if (el.quick.dataset.sig === sig) return;
  el.quick.dataset.sig = sig;
  el.quick.innerHTML = '';
  want.forEach(ml => {
    const b = document.createElement('button');
    b.className = 'sip';
    b.innerHTML = `<b>${volNum(ml)}</b><span>${vu().short}</span>`;
    b.setAttribute('aria-label', I18N.t('a11y.drink', { v: volLabel(ml) }));
    b.addEventListener('click', () => addDrink(ml));
    el.quick.appendChild(b);
  });
}

function addDrink(ml) {
  const k = todayKey();
  (S.log[k] ||= []).push(ml);
  save(); render();
  el.img.classList.add('pop'); el.fallback.classList.add('pop');
  setTimeout(() => {
    el.img.classList.remove('pop'); el.fallback.classList.remove('pop');
  }, 400);
  toast(I18N.t('toast.added', { v: volLabel(ml) }));
}
el.undo.addEventListener('click', () => {
  const k = todayKey();
  if (!S.log[k]?.length) return;
  const ml = S.log[k].pop();
  if (!S.log[k].length) delete S.log[k];
  save(); render();
  toast(I18N.t('toast.undone', { v: volLabel(ml) }));
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

/* ---------------- Streak ----------------
   Zählt die Tage in Folge, an denen das Ziel erreicht wurde.
   Der heutige Tag zählt erst mit, wenn er geschafft ist — bis dahin
   bleibt die Serie von gestern stehen, statt vormittags auf 0 zu fallen. */
function streak() {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  let n = 0;
  if (drunkOn(dayKey(d)) < goalFor(d)) d.setDate(d.getDate() - 1);   // heute noch offen
  for (let i = 0; i < 3650; i++) {
    const k = dayKey(d);
    if (!S.log[k] || drunkOn(k) < goalFor(d)) break;
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function renderStreak() {
  const n = streak();
  const btn = $('#streakBtn');
  btn.hidden = false;                       // auch bei 0 sichtbar, sonst fehlt sie einfach
  btn.classList.toggle('cold', n === 0);
  $('#streakNum').textContent = I18N.num(n);
  $('#streakLabel').textContent = n === 1 ? I18N.t('home.streakOne') : I18N.t('home.streak');
}
$('#streakBtn').addEventListener('click', () => openCal());

/* ---------------- Menü ---------------- */
const drawer = $('#drawer'), scrim = $('#scrim');
function openMenu(open) {
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  scrim.hidden = !open;
  $('#menuBtn').setAttribute('aria-expanded', String(open));
}
$('#menuBtn').addEventListener('click', () => openMenu(true));
$('#closeBtn').addEventListener('click', () => openMenu(false));
scrim.addEventListener('click', () => openMenu(false));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const id of ['#langSheet', '#calendar', '#guide']) {
    if (!$(id).hidden) { $(id).hidden = true; return; }
  }
  openMenu(false);
});

/* ---------------- Teilen ---------------- */
$('#shareBtn').addEventListener('click', async () => {
  const url = location.href.split('?')[0];
  try {
    if (navigator.share) await navigator.share({ title: 'Drink', text: I18N.t('share.text'), url });
    else { await navigator.clipboard.writeText(url); toast(I18N.t('toast.copied')); }
  } catch (e) { /* abgebrochen */ }
});

/* ---------------- Sprache ---------------- */
const langSheet = $('#langSheet');

function renderLangList(filter = '') {
  const box = $('#langList');
  const f = filter.trim().toLowerCase();
  box.innerHTML = '';
  REGIONS.filter(r => !f
    || r.country.toLowerCase().includes(f)
    || r.label.toLowerCase().includes(f)
    || (LANG_NAMES[r.lang] || '').toLowerCase().includes(f)
    || r.code.toLowerCase().includes(f)
  ).forEach(r => {
    const b = document.createElement('button');
    b.className = 'lang-row';
    b.setAttribute('aria-pressed', String(r.code === I18N.region.code));
    b.innerHTML = `<span class="flag">${r.flag}</span>
      <span class="lang-txt"><b>${r.country}</b><small>${LANG_NAMES[r.lang] || r.lang}</small></span>
      <span class="lang-code">${r.label}</span>`;
    b.addEventListener('click', () => setLocale(r.code));
    box.appendChild(b);
  });
}
$('#langBtn').addEventListener('click', () => {
  $('#langSearch').value = '';
  renderLangList();
  langSheet.hidden = false;
  const active = $('#langList [aria-pressed="true"]');
  if (active) active.scrollIntoView({ block: 'center' });
});
$('#langClose').addEventListener('click', () => langSheet.hidden = true);
langSheet.addEventListener('click', e => { if (e.target === langSheet) langSheet.hidden = true; });
$('#langSearch').addEventListener('input', e => renderLangList(e.target.value));

function setLocale(code) {
  S.locale = code; save();
  I18N.load(code);
  langSheet.hidden = true;
  applyLanguage();
}

/* Alles neu beschriften, was nicht über data-i18n läuft */
function applyLanguage() {
  I18N.apply();
  $('#langFlag').textContent = I18N.region.flag;
  $('#langCode').textContent = I18N.region.label;
  paintUnits(); fillForm(); buildWeekdays(); buildChips();
  el.quick.dataset.sig = '';
  notifState();
  if (!$('#calendar').hidden) renderCal();
  if (!$('#guide').hidden) paintGuide();
  render();
}

/* ---------------- Ziel ---------------- */
function paintCalc() {
  $('#calcOut').textContent = I18N.t('goal.rec', { v: volLabel(calcGoal(S.profile)) });
}
$('#applyCalc').addEventListener('click', () => {
  S.goalManual = calcGoal(S.profile);
  save(); fillForm(); render();
  toast(I18N.t('toast.goalSet', { v: volLabel(S.goalManual) }));
});
$('#goalManual').addEventListener('input', e => {
  const ml = toMl(readNum(e.target));
  if (ml) { S.goalManual = clamp(Math.round(ml), 200, 8000); save(); render(); }
});
$('#pWeight').addEventListener('input', e => {
  const v = readNum(e.target);
  S.profile.weight = S.unitBody === 'imperial' ? v / 2.20462 : v;
  save(); paintCalc();
});
$('#pHeight').addEventListener('input', e => {
  const v = readNum(e.target);
  S.profile.height = S.unitBody === 'imperial' ? v * 2.54 : v;
  save(); paintCalc();
});
$('#pAge').addEventListener('input', e => { S.profile.age = readNum(e.target); save(); paintCalc(); });
$('#pSex').addEventListener('change', e => { S.profile.sex = e.target.value; save(); paintCalc(); });

function buildWeekdays() {
  const box = $('#weekdays'); box.innerHTML = '';
  const u = vu(), names = I18N.weekdayShort();
  names.forEach((name, i) => {
    const day = WD_IDX[i];
    const val = S.extra[day] ? Number(fromMl(S.extra[day]).toFixed(u.dec)) : 0;
    const wrap = document.createElement('label');
    wrap.className = 'wd';
    wrap.innerHTML = `<span>${name}</span><input type="number" min="0" max="${fromMl(3000).toFixed(u.dec)}"
      step="${u.step}" inputmode="decimal" value="${val}" aria-label="${name}">`;
    wrap.querySelector('input').addEventListener('input', e => {
      S.extra[day] = clamp(Math.round(toMl(readNum(e.target))), 0, 3000);
      save(); render();
    });
    box.appendChild(wrap);
  });
  $('#weekdayUnit').textContent = I18N.t('goal.extraUnit', { v: unitName() });
}

/* ---------------- Mengen ---------------- */
function buildChips() {
  const box = $('#presetChips'); box.innerHTML = '';
  const all = [...new Set([...PRESETS, ...S.amounts])].sort((a, b) => a - b);
  all.forEach(ml => {
    const c = document.createElement('button');
    c.className = 'chip';
    c.type = 'button';
    c.setAttribute('aria-pressed', String(S.amounts.includes(ml)));
    c.textContent = volLabel(ml);
    if (!PRESETS.includes(ml)) {
      const x = document.createElement('span');
      x.className = 'x'; x.textContent = '×';
      c.appendChild(x);
    }
    c.addEventListener('click', () => toggleAmount(ml));
    box.appendChild(c);
  });
  $('#amountsHint').textContent = I18N.t('amounts.count', { n: S.amounts.length });
}
function toggleAmount(ml) {
  if (S.amounts.includes(ml)) {
    if (S.amounts.length === 1) return toast(I18N.t('toast.min'));
    S.amounts = S.amounts.filter(x => x !== ml);
  } else {
    if (S.amounts.length >= 5) return toast(I18N.t('toast.max'));
    S.amounts = [...S.amounts, ml].sort((a, b) => a - b);
  }
  save(); buildChips(); render();
}
$('#addCustom').addEventListener('click', () => {
  const inp = $('#customMl');
  const ml = clamp(Math.round(toMl(readNum(inp))), 10, 3000);
  if (!ml) return toast(I18N.t('toast.num'));
  if (S.amounts.includes(ml)) return toast(I18N.t('toast.dup'));
  if (S.amounts.length >= 5) return toast(I18N.t('toast.max'));
  S.amounts = [...S.amounts, ml].sort((a, b) => a - b);
  inp.value = '';
  save(); buildChips(); render();
});

/* ---------------- Einheiten umstellen ---------------- */
function paintUnits() {
  const u = vu(), body = S.unitBody === 'imperial';
  document.querySelectorAll('.u-vol').forEach(e => e.textContent = u.short);
  document.querySelectorAll('.u-w').forEach(e => e.textContent = body ? 'lb' : 'kg');
  document.querySelectorAll('.u-h').forEach(e => e.textContent = body ? 'in' : 'cm');

  const g = $('#goalManual'), c = $('#customMl');
  [g, c].forEach(i => { i.step = u.step; i.min = 0; });
  g.max = fromMl(8000).toFixed(u.dec);
  c.max = fromMl(3000).toFixed(u.dec);

  const w = $('#pWeight'), h = $('#pHeight');
  w.step = body ? 1 : 0.5; w.min = body ? 45 : 20; w.max = body ? 550 : 250;
  h.step = body ? 0.5 : 1; h.min = body ? 39 : 100; h.max = body ? 91 : 230;

  $('#unitSummary').textContent = unitName();
}
$('#unitVol').addEventListener('change', e => {
  S.unitVol = e.target.value; save();
  paintUnits(); fillForm(); buildChips(); buildWeekdays();
  el.quick.dataset.sig = ''; render();
  if (!$('#calendar').hidden) renderCal();
});
$('#unitBody').addEventListener('change', e => {
  S.unitBody = e.target.value; save();
  paintUnits(); fillForm(); paintCalc();
});

/* ---------------- Kalender ---------------- */
let calMonth = new Date();
let calPicked = null;

function openCal() {
  calMonth = new Date();
  calPicked = todayKey();
  $('#calendar').hidden = false;
  openMenu(false);
  renderCal();
}
$('#calOpen').addEventListener('click', openCal);
$('#calClose').addEventListener('click', () => $('#calendar').hidden = true);
$('#calDone').addEventListener('click', () => $('#calendar').hidden = true);
$('#calPrev').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCal(); });
$('#calNext').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCal(); });

/* Durchschnitt über die Tage mit Einträgen — Tage vor der Installation
   sollen den Schnitt nicht nach unten ziehen. */
function average(filter) {
  const keys = Object.keys(S.log).filter(filter);
  if (!keys.length) return null;
  const sum = keys.reduce((a, k) => a + drunkOn(k), 0);
  return { avg: sum / keys.length, days: keys.length };
}
function showAvg(id, res) {
  $(id).textContent = res ? volLabel(res.avg) : '–';
}

function renderCal() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  $('#calTitle').textContent = I18N.monthName(calMonth);

  const mPrefix = `${y}-${String(m + 1).padStart(2, '0')}-`;
  showAvg('#avgMonth', average(k => k.startsWith(mPrefix)));
  showAvg('#avgYear', average(k => k.startsWith(y + '-')));
  const all = average(() => true);
  showAvg('#avgAll', all);
  $('#calSummary').textContent = all ? I18N.t('cal.summary', { n: I18N.num(all.days) }) : '';

  const wd = $('#calWd');
  wd.innerHTML = I18N.weekdayShort().map(n => `<span>${n}</span>`).join('');

  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;                 // Woche beginnt Montag
  const days = new Date(y, m + 1, 0).getDate();
  const grid = $('#calGrid');
  grid.innerHTML = '';

  for (let i = 0; i < lead; i++) grid.appendChild(document.createElement('span'));

  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const k = dayKey(date);
    const have = drunkOn(k);
    const goal = goalFor(date);
    const pct = goal > 0 ? clamp(have / goal, 0, 1) : 0;

    const cell = document.createElement('button');
    cell.className = 'day';
    if (k === todayKey()) cell.classList.add('today');
    if (k === calPicked) cell.classList.add('picked');
    if (have >= goal && have > 0) cell.classList.add('full');
    cell.innerHTML = `<span class="fill" style="height:${(pct * 100).toFixed(0)}%"></span><b>${I18N.num(d)}</b>`;
    cell.addEventListener('click', () => { calPicked = k; renderCal(); });
    grid.appendChild(cell);
  }

  const p = calPicked ? new Date(calPicked + 'T12:00:00') : null;
  if (!p) { $('#calDetail').textContent = I18N.t('cal.hint'); return; }
  const have = drunkOn(calPicked);
  $('#calDetail').textContent = have === 0
    ? I18N.t('cal.empty', { day: I18N.dayName(p) })
    : I18N.t('cal.detail', { day: I18N.dayName(p), v: volLabel(have), goal: volLabel(goalFor(p)) });
}

/* ---------------- Erinnerung ---------------- */
function notifState() {
  const p = 'Notification' in window ? Notification.permission : 'unsupported';
  $('#notifState').textContent = I18N.t('notif.' + (p === 'default' ? 'default' : p));
}
$('#notifOn').addEventListener('change', async e => {
  if (e.target.checked && 'Notification' in window) {
    const p = await Notification.requestPermission();
    S.asked = true;
    if (p !== 'granted') { e.target.checked = false; save(); notifState(); return toast(I18N.t('toast.denied')); }
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
    S.asked = true; save();
    if (await Notification.requestPermission() !== 'granted') { notifState(); return toast(I18N.t('toast.denied')); }
  }
  (await navigator.serviceWorker?.ready)?.active?.postMessage({ type: 'test-notify' });
  notifState();
});

/* Erlaubnis beim ersten Antippen holen — Browser verlangen eine Nutzeraktion */
async function askOnce() {
  if (S.asked || !S.notif.on) return;
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  if (!$('#langSheet').hidden) return;
  S.asked = true; save();
  try {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { S.notif.on = false; save(); $('#notifOn').checked = false; }
    notifState(); renderSummaries(); scheduleLocal();
  } catch (e) {}
}
document.addEventListener('pointerdown', askOnce, { once: true });

const barText = (have, goal) => {
  const f = clamp(Math.round((have / goal) * 10), 0, 10);
  return '▰'.repeat(f) + '▱'.repeat(10 - f);
};

async function syncToWorker() {
  if (!navigator.serviceWorker?.controller) return;
  const goal = goalFor(), have = drunkToday();
  navigator.serviceWorker.controller.postMessage({
    type: 'config',
    config: {
      on: S.notif.on, time: S.notif.time,
      goal, have, bar: barText(have, goal),
      unit: vu().short, goalTxt: volNum(goal), haveTxt: volNum(have),
      restTxt: volLabel(Math.max(0, goal - have)),
      title: I18N.t('push.title'),
      rest: I18N.t('push.rest', { v: volLabel(Math.max(0, goal - have)) }),
      amounts: S.amounts.slice(0, 3),
      amountLabels: Object.fromEntries(S.amounts.slice(0, 3).map(ml => [ml, volLabel(ml)]))
    }
  });
}

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
  if (now >= due && localStorage.getItem('drink.lastNotify') !== todayKey() && now - due < 6 * 3600e3) {
    localStorage.setItem('drink.lastNotify', todayKey());
    (await navigator.serviceWorker?.ready)?.active?.postMessage({ type: 'notify-now' });
  }
}

/* ---------------- Zusammenfassungen ---------------- */
function renderSummaries() {
  $('#goalSummary').textContent = volLabel(goalFor());
  $('#amountsSummary').textContent = I18N.t('amounts.summary', { n: S.amounts.length });
  $('#notifSummary').textContent = S.notif.on ? I18N.t('notif.on', { t: S.notif.time }) : I18N.t('notif.off');
  $('#guideSummary').textContent = isStandalone() ? I18N.t('menu.setupDone') : I18N.t('menu.setupHome');
}

/* ---------------- Zurücksetzen ---------------- */
$('#resetBtn').addEventListener('click', () => {
  if (!confirm(I18N.t('about.confirm'))) return;
  const keepLocale = S.locale;
  localStorage.removeItem(KEY);
  localStorage.removeItem('drink.lastNotify');
  S = structuredClone(DEFAULTS);
  S.locale = keepLocale;
  save(); paintUnits(); fillForm(); buildChips(); buildWeekdays(); render();
  toast(I18N.t('toast.reset'));
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
const GUIDE_STEPS = { ios: 5, android: 5, desktop: 4 };

let guideOS = detectOS();
function paintGuide() {
  $('#guideTabs').querySelectorAll('.seg-btn').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.os === guideOS)));

  const n = GUIDE_STEPS[guideOS];
  const li = [];
  for (let i = 1; i <= n; i++) li.push(`<li>${I18N.t('guide.' + guideOS + i)}</li>`);
  $('#guideSteps').innerHTML = li.join('');
  $('#guideNote').textContent = I18N.t('guide.' + guideOS + 'Note');
  $('#guideInstall').hidden = !installEvent || guideOS !== detectOS();
  $('#guideIntro').textContent = I18N.t(isStandalone() ? 'guide.introDone' : 'guide.intro');
}
$('#guideTabs').querySelectorAll('.seg-btn').forEach(b =>
  b.addEventListener('click', () => { guideOS = b.dataset.os; paintGuide(); }));
$('#guideOpen').addEventListener('click', () => {
  guideOS = detectOS(); paintGuide();
  guideEl.hidden = false; openMenu(false); guideEl.scrollTop = 0;
});
$('#guideClose').addEventListener('click', () => guideEl.hidden = true);
$('#guideShare').addEventListener('click', () => $('#shareBtn').click());
$('#guideInstall').addEventListener('click', () => {
  if (!installEvent) return;
  installEvent.prompt(); installEvent = null;
  $('#guideInstall').hidden = true;
});

let installEvent;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installEvent = e;
  if (!guideEl.hidden) paintGuide();
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  $('#guideInstall').hidden = true;
  renderSummaries();
});

/* ---------------- Formular füllen ---------------- */
function fillForm() {
  const u = vu(), body = S.unitBody === 'imperial';
  const r = (n, d) => Number(n.toFixed(d));
  $('#goalManual').value = r(fromMl(S.goalManual), u.dec);
  $('#pWeight').value = r(body ? S.profile.weight * 2.20462 : S.profile.weight, body ? 0 : 1);
  $('#pHeight').value = r(body ? S.profile.height / 2.54 : S.profile.height, body ? 1 : 0);
  $('#pAge').value = S.profile.age;
  $('#pSex').value = S.profile.sex;
  $('#unitVol').value = S.unitVol;
  $('#unitBody').value = S.unitBody;
  $('#notifOn').checked = S.notif.on;
  $('#notifTime').value = S.notif.time;
  paintCalc();
}

/* ---------------- Start ---------------- */
(async function start() {
  I18N.load(S.locale || FALLBACK);            // Englisch, bis jemand umstellt
  applyLanguage();
  scheduleLocal();

  /* Aus der Benachrichtigung heraus eintragen: ?add=250 */
  const p = new URLSearchParams(location.search);
  if (p.has('add')) {
    const ml = clamp(+p.get('add') || 0, 10, 3000);
    if (ml) addDrink(ml);
    history.replaceState(null, '', location.pathname);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(async reg => {
      await navigator.serviceWorker.ready;
      syncToWorker();
      try {
        const st = await navigator.permissions?.query({ name: 'periodic-background-sync' });
        if (st?.state === 'granted' && 'periodicSync' in reg) {
          await reg.periodicSync.register('drink-reminder', { minInterval: 60 * 60 * 1000 });
        }
      } catch (e) {}
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', syncToWorker);
  }
})();

/* Tageswechsel bemerken, wenn die App im Hintergrund lag */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  render(); checkDue();
  if (!$('#calendar').hidden) renderCal();
});
