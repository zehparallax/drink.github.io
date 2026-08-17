# Der Einrichtungs-Dialog

Anleitung, wie man eine Web-App auf den Startbildschirm legt. Erkennt das Gerät selbst, zeigt den passenden Weg und bietet dort, wo der Browser es hergibt, einen echten Installieren-Knopf an.

Der Baustein hängt an nichts aus Drink und lässt sich in jedes andere Projekt kopieren. Gebraucht werden drei Teile: Markup, ein paar Klassen aus dem Stylesheet und ein Block in `app.js`.

---

## 1. Markup

Steht in `index.html` direkt vor dem Toast, außerhalb des Menüs. Der Auslöser ist ein normaler Knopf im Menü:

```html
<button class="panel-link" id="guideOpen">
  <span>Einrichtung</span>
  <em id="guideSummary">Auf den Startbildschirm legen</em>
</button>
```

Der Dialog selbst:

```html
<div class="setup" id="guide" hidden aria-label="Einrichtung">
  <div class="setup-inner">
    <section class="step">
      <h2>Einrichtung</h2>
      <p id="guideIntro">…</p>

      <div class="seg" id="guideTabs">
        <button class="seg-btn" data-os="ios">iPhone</button>
        <button class="seg-btn" data-os="android">Android</button>
        <button class="seg-btn" data-os="desktop">Rechner</button>
      </div>

      <ol class="guide-steps" id="guideSteps"></ol>
      <button class="btn" id="guideInstall" hidden>Jetzt installieren</button>
      <p class="hint" id="guideNote"></p>
    </section>

    <div class="setup-nav">
      <button class="btn ghost" id="guideClose">Schließen</button>
      <button class="btn" id="guideShare">App teilen</button>
    </div>
  </div>
</div>
```

`<ol id="guideSteps">` und `<p id="guideNote">` bleiben leer — beides füllt JavaScript je nach gewähltem Reiter.

---

## 2. Die Texte

Ein einziges Objekt, sonst nichts. Wer den Baustein übernimmt, ändert im Regelfall nur das hier:

```js
const GUIDE = {
  ios: {
    steps: [
      'Diese Seite in <b>Safari</b> öffnen. …',
      'Unten auf das <b>Teilen-Symbol</b> tippen …',
      …
    ],
    note: 'Ab iOS 16.4 klappen Benachrichtigungen — aber nur bei der installierten App.'
  },
  android: { steps: [ … ], note: '…' },
  desktop: { steps: [ … ], note: '…' }
};
```

Die Schritte dürfen HTML enthalten, `<b>` hebt Knopf- und Menünamen hervor. Sie werden mit `innerHTML` gesetzt, gehören also fest ins Programm und dürfen niemals aus einer Eingabe stammen.

---

## 3. Geräteerkennung

```js
function detectOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}
```

Der zweite Teil der ersten Bedingung fängt das iPad ab: Seit iPadOS 13 meldet sich Safari dort als Mac. Ein Mac mit Touch existiert nicht, `maxTouchPoints > 1` verrät das Tablet also zuverlässig.

Die Erkennung wählt nur den Reiter vor. Alle drei Wege bleiben anklickbar — jemand richtet die App vielleicht am Rechner ein und will nachlesen, wie es später am Handy geht.

Ob die App schon installiert ist:

```js
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
```

`display-mode` ist der Standard, `navigator.standalone` die ältere Eigenheit von iOS Safari. Beide zusammen decken alles ab.

---

## 4. Zeichnen

```js
let guideOS = detectOS();

function paintGuide() {
  $('#guideTabs').querySelectorAll('.seg-btn').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.os === guideOS)));

  const g = GUIDE[guideOS];
  $('#guideSteps').innerHTML = g.steps.map(t => `<li>${t}</li>`).join('');
  $('#guideNote').textContent = g.note;

  $('#guideInstall').hidden = !installEvent || guideOS !== detectOS();

  $('#guideIntro').textContent = isStandalone()
    ? 'Die App liegt schon auf deinem Startbildschirm. …'
    : 'Leg die App auf den Startbildschirm. …';
}
```

Zwei Feinheiten:

Der Installieren-Knopf erscheint nur, wenn `installEvent` vorliegt **und** der angezeigte Reiter zum tatsächlichen Gerät passt. Wer am Rechner die iPhone-Anleitung liest, soll keinen Knopf sehen, der dann den Rechner installiert.

Die Nummerierung macht CSS über `counter-increment`, nicht `<ol>` mit eigenen Zahlen. So bleibt das Markup schlicht und die Ziffern lassen sich als Kacheln gestalten.

---

## 5. Der Installieren-Knopf

Chrome und Edge feuern `beforeinstallprompt`, wenn die App installierbar ist. Das Ereignis muss aufgehoben werden, denn aufrufen darf man es später nur genau einmal und nur nach einer Nutzeraktion:

```js
let installEvent;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();          // Chromes eigenen Balken unterdrücken
  installEvent = e;
  if (!guideEl.hidden) paintGuide();   // Knopf nachträglich einblenden
});

window.addEventListener('appinstalled', () => {
  installEvent = null;
  $('#guideInstall').hidden = true;
});

$('#guideInstall').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  installEvent = null;         // verbraucht, ein zweiter Aufruf wirft
});
```

Safari kennt das Ereignis nicht und wird es absehbar auch nicht bekommen. Auf dem iPhone bleibt die bebilderte Anleitung der einzige Weg — deshalb ist der Knopf eine Zugabe und die Schritte die eigentliche Antwort. Wer nur den Knopf baut, lässt alle iPhone-Nutzer im Regen stehen.

---

## 6. Öffnen und Schließen

```js
$('#guideOpen').addEventListener('click', () => {
  guideOS = detectOS();        // bei jedem Öffnen neu, das Gerät kann wechseln
  paintGuide();
  guideEl.hidden = false;
  openMenu(false);             // Menü darunter zumachen
  guideEl.scrollTop = 0;
});

$('#guideClose').addEventListener('click', () => { guideEl.hidden = true; });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#guide').hidden) { $('#guide').hidden = true; return; }
  openMenu(false);             // sonst schließt Escape das Menü
});
```

Escape arbeitet die Ebenen von oben nach unten ab: erst der Dialog, dann das Menü.

---

## 7. Nötiges CSS

Der Dialog nutzt `.setup`, `.setup-inner`, `.step`, `.setup-nav`, `.seg`, `.seg-btn`, `.btn`, `.hint` und `.guide-steps`. Eigen ist nur die Schrittliste:

```css
.guide-steps{ margin:4px 0 0; padding:0; list-style:none; counter-reset:g; display:grid; gap:14px; }
.guide-steps li{ counter-increment:g; position:relative; padding-left:44px; }
.guide-steps li::before{
  content:counter(g);
  position:absolute; left:0; top:-1px;
  width:30px; height:30px; border-radius:10px;
  display:grid; place-items:center;
  background:rgba(53,196,214,.16); border:1px solid var(--line);
  font-weight:700; color:var(--water-2);
}
```

Der Rest hängt an den Farbvariablen aus `:root`. In einem anderen Projekt reicht es, die zu ersetzen.

---

## In ein anderes Projekt übernehmen

1. Markup aus Abschnitt 1 kopieren, den Auslöser an passender Stelle einhängen.
2. CSS aus Abschnitt 7 kopieren, dazu `.setup`, `.setup-inner`, `.step`, `.setup-nav`, `.seg`, `.seg-btn` aus `styles.css`.
3. Den Block `/* Einrichtung: Anleitung */` aus `app.js` kopieren.
4. Texte in `GUIDE` auf die eigene App umschreiben, besonders den App-Namen in den Schritten.
5. `$` ist die Abkürzung `document.querySelector`. Fehlt sie, oben ergänzen:
   `const $ = s => document.querySelector(s);`
6. `openMenu(false)` durch das eigene Menü ersetzen oder ersatzlos streichen.

Vorausgesetzt wird nur, dass die Seite über HTTPS läuft und ein gültiges `manifest.webmanifest` samt Service Worker hat — sonst gibt es kein `beforeinstallprompt` und der Startbildschirm-Eintrag bleibt ein bloßes Lesezeichen.

---

## Was bewusst fehlt

Ein mehrstufiger Assistent, der beim ersten Start Ziel, Mengen und Uhrzeit abfragt. Der stand hier einmal und ist wieder verschwunden: Wer die App öffnet, will trinken eintragen, nicht ein Formular ausfüllen. Sinnvolle Standardwerte und ein erreichbares Menü leisten dasselbe, ohne jemanden aufzuhalten.
