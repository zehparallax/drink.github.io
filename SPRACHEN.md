# Das Sprachelement

Drink spricht 19 Sprachen und kennt 70 Länder. Der Knopf oben rechts zeigt Flagge und Länderkürzel, ein Tippen öffnet die Liste, die Seite stellt sich sofort um. Kein Neuladen, keine Bibliothek, keine Abhängigkeit von außen.

Alles steckt in zwei Dateien:

- `languages.js` — die Übersetzungen selbst, alle 19 Sprachen in einem Objekt
- `i18n.js` — Länderliste, Umschaltung, Zahlen- und Datumsformate

---

## 1. Der Unterschied zwischen Sprache und Land

Das ist der Kern des Ganzen. Österreich, Deutschland und die Schweiz sprechen dieselbe Sprache, sollen aber getrennte Einträge mit eigener Flagge sein. Also gibt es zwei Ebenen:

**Region** — was der Nutzer sieht und auswählt. 70 Einträge, jeder mit Flagge, Kürzel, Landesname und einem Verweis auf eine Sprache.

**Sprachpaket** — die Übersetzung selbst. Nur 19 Dateien, weil sich `de-DE`, `de-AT`, `de-CH`, `de-LU`, `de-LI` und `de-BE` alle dasselbe `de.json` teilen.

```js
const REGIONS = [
  { code: 'de-DE', lang: 'de', flag: '🇩🇪', label: 'DE', country: 'Deutschland' },
  { code: 'de-AT', lang: 'de', flag: '🇦🇹', label: 'AT', country: 'Österreich' },
  { code: 'de-CH', lang: 'de', flag: '🇨🇭', label: 'CH', country: 'Schweiz' },
  …
];
```

Der Gewinn ist doppelt: Ein neues Land kostet eine Zeile statt einer Übersetzung, und `code` ist gleichzeitig ein gültiger BCP-47-Bezeichner, den `Intl` versteht. Deshalb sieht ein Schweizer „3’000 ml“, ein Deutscher „3.000 ml“ und ein Amerikaner „3,000 ml“ — bei identischem Text.

`label` ist bewusst ein eigenes Feld und nicht aus `code` abgeleitet. Sonst stünde bei `nb-NO` „NO“ nur zufällig richtig, und bei `en-GB` müsste man den Teil hinter dem Bindestrich nehmen, bei `zh-Hans-CN` aber nicht.

---

## 2. Aufbau eines Sprachpakets

Alle Pakete liegen in `languages.js` in einem einzigen Objekt, flach und mit Punkten gruppiert. Kein Verschachteln — das spart beim Nachschlagen jede Rekursion:

```js
const I18N_PACKS = {
  "en": {
    "home.left": "{v} to go",
    "amounts.count": "{n} of 5 selected. At least one has to stay.",
    "guide.ios2": "Tap the <b>share icon</b> at the bottom, the square with the arrow."
  },
  "de": {
    "home.left": "Noch {v} bis zum Ziel",
    …
  }
};
```

**Warum JavaScript und nicht JSON.** Ursprünglich lagen die Pakete als einzelne JSON-Dateien und wurden per `fetch` nachgeladen. Das war die Ursache eines hässlichen Fehlers: Kommt eine Datei nicht an — Ordner beim Hochladen vergessen, Service Worker mit altem Bestand, falscher MIME-Typ — bleibt das Wörterbuch leer und auf dem Bildschirm steht „home.left“ statt eines Satzes. Als `<script>` geladen gibt es diesen Zustand nicht: Entweder die Datei ist da und alle Sprachen mit ihr, oder die App startet gar nicht. Der Preis sind rund 116 KB, über HTTPS komprimiert etwa ein Viertel davon, einmalig beim ersten Aufruf.

Platzhalter stehen in geschweiften Klammern und werden beim Einsetzen ersetzt:

```js
I18N.t('home.left', { v: '500 ml' })   // "Noch 500 ml bis zum Ziel"
```

Alle 19 Dateien haben exakt dieselben 116 Schlüssel. Das ist keine Nettigkeit, sondern Bedingung: Fehlt ein Schlüssel, gibt `t()` den Schlüsselnamen zurück, und im Menü steht dann „amounts.count“ statt eines Satzes.

---

## 3. Beschriften über Attribute

Statisches HTML trägt sein Etikett selbst, das JavaScript muss nichts davon kennen:

```html
<h3 data-i18n="goal.calc"></h3>
<button data-i18n-aria="a11y.share">…</button>
<input data-i18n-ph="lang.search">
```

Drei Attribute, drei Ziele: Textinhalt, `aria-label`, `placeholder`. Eingesetzt werden sie in einem Rutsch:

```js
apply(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(e => e.textContent = I18N.t(e.dataset.i18n));
  root.querySelectorAll('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', I18N.t(e.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-ph]').forEach(e => e.placeholder = I18N.t(e.dataset.i18nPh));
}
```

Bewusst `textContent`, nicht `innerHTML`: Übersetzungen sind zwar eigene Dateien und keine Nutzereingabe, aber der sichere Weg kostet hier nichts. Die einzige Ausnahme sind die Anleitungsschritte mit ihren `<b>`-Auszeichnungen — die setzt `paintGuide()` einzeln und absichtlich als HTML.

Dynamische Texte, also alles was Zahlen enthält, laufen dagegen durch `t()` im Code. Nach jedem Sprachwechsel ruft `applyLanguage()` sämtliche Zeichenroutinen erneut auf.

---

## 4. Standard, Laden, Umschalten

Beim ersten Start ist **Englisch** eingestellt, `FALLBACK = 'en-GB'`. Es gibt bewusst keinen Auswahlschritt vor der App und keine automatische Erkennung: Jeder landet auf derselben Oberfläche und stellt oben rechts um, wenn er mag. Die Wahl landet dann in `S.locale` und gilt ab da.

Wer stattdessen die Browsersprache übernehmen will, ersetzt beim Start `FALLBACK` durch `I18N.detect()`. Die Funktion ist da und einsatzbereit:

```js
detect() {
  for (const w of navigator.languages || [navigator.language]) {
    const exact = REGIONS.find(r => r.code.toLowerCase() === w.toLowerCase());
    if (exact) return exact.code;                       // "de-AT" trifft genau
    const base = w.split('-')[0].toLowerCase();
    const any = REGIONS.find(r => r.lang === base);     // "de-XY" -> irgendein Deutsch
    if (any) return any.code;
  }
  return FALLBACK;
}
```

Erst die genaue Übereinstimmung, dann die Sprache allein, zuletzt Englisch. `navigator.languages` ist eine Liste nach Vorliebe sortiert — wer Norwegisch bevorzugt und Englisch als zweites gesetzt hat, bekommt Norwegisch.

Das Umschalten selbst ist danach nur noch ein Zeigerwechsel, ohne Warten:

```js
load(code) {
  const r = regionOf(code);
  this.region = r;
  this.dict = I18N_PACKS[r.lang] || I18N_PACKS.en || {};
  document.documentElement.lang = r.lang;
}
```

Fehlt einzelnen Sprachen ein Schlüssel, greift `t()` auf Englisch zurück, bevor es den Schlüsselnamen ausgibt.

`document.documentElement.lang` mitzusetzen ist kein Zierrat: Davon hängen Silbentrennung, Vorlesestimme und die Anführungszeichen des Browsers ab.

Die Wahl landet in `S.locale` und damit im localStorage. Ein Nutzer, der bewusst umstellt, soll das nicht bei jedem Besuch wiederholen.

---

## 5. Zahlen und Daten kommen nicht aus dem Sprachpaket

Monatsnamen, Wochentage und Zahlformate stehen nirgends in den JSON-Dateien. Das wären 19 × 19 weitere Einträge, alle fehleranfällig. Stattdessen `Intl`, gefüttert mit dem Regionscode:

```js
num(n, dec = 0)  { return n.toLocaleString(this.region.code, { maximumFractionDigits: dec }); }
monthName(d)     { return new Intl.DateTimeFormat(this.region.code, { month: 'long', year: 'numeric' }).format(d); }
dayName(d)       { return new Intl.DateTimeFormat(this.region.code, { weekday: 'long', day: 'numeric', month: 'long' }).format(d); }
```

Ergebnis ohne eine Zeile Übersetzungsarbeit: „16. August“, „August 16“, „2026년 8월“, „Κυριακή 16 Αυγούστου“.

Die kurzen Wochentagsnamen für Kalender und Wochenaufschläge entstehen genauso:

```js
weekdayShort() {
  const f = new Intl.DateTimeFormat(this.region.code, { weekday: 'short' });
  const out = [];
  for (let i = 1; i <= 7; i++) out.push(f.format(new Date(Date.UTC(2024, 0, i))));
  return out;
}
```

Der 1. Januar 2024 war ein Montag, sieben Tage ab dort ergeben also eine volle Woche ab Montag. Ein fester Anker im Code ist hier verlässlicher als jede Rechnerei mit dem heutigen Datum.

Drink beginnt die Woche überall am Montag. Wer den regional korrekten Wochenstart will — Sonntag in den USA, Samstag in weiten Teilen des Nahen Ostens — kann `Intl.Locale.prototype.getWeekInfo()` auslesen, das aber noch nicht überall vorhanden ist und einen Ersatzweg braucht.

---

## 6. Flaggen

Die Flaggen sind schlichte Emoji, keine Bilddateien. Das spart 70 Grafiken und skaliert von selbst.

Ein Haken bleibt: **Windows zeigt keine Flaggen-Emoji.** Statt 🇩🇪 erscheinen dort die Buchstaben „DE“ — Microsoft liefert seit Jahren bewusst keine Flaggenschriftart mit. Für Drink ist das verkraftbar, weil direkt daneben ohnehin das Kürzel steht, die Zeile also weiterhin lesbar bleibt. Wer Flaggen auf Windows braucht, muss Bilddateien einbinden, etwa die SVG-Sammlung von `flag-icons`, und handelt sich damit rund 200 KB und einen zweiten Ladeweg ein.

---

## 7. Eine Sprache ergänzen

1. In `languages.js` den englischen Block kopieren, das Sprachkürzel ändern und übersetzen. Alle Schlüssel behalten, auch die Platzhalter `{v}`, `{n}`, `{t}`, `{day}`, `{goal}`.
2. In `i18n.js` bei `LANG_NAMES` den Namen der Sprache eintragen, geschrieben in dieser Sprache selbst — nicht „Schwedisch“, sondern „Svenska“. Wer die Liste durchsucht, sucht in seiner eigenen Sprache.
3. Für jedes Land eine Zeile in `REGIONS` ergänzen.
4. Cache-Namen in `sw.js` hochzählen, sonst behalten bestehende Installationen den alten Stand.

Zum Prüfen, ob nichts fehlt:

```bash
node -e "
const m=new module.constructor();
m._compile(require('fs').readFileSync('languages.js','utf8')+';module.exports=I18N_PACKS','x.js');
const p=m.exports, ref=Object.keys(p.en);
for (const [k,v] of Object.entries(p)) {
  const fehlt = ref.filter(x => !(x in v));
  if (fehlt.length) console.log(k, '->', fehlt);
}
console.log('geprüft:', Object.keys(p).length, 'Sprachen');
"
```

---

## 8. Ein Land ergänzen

Eine Zeile, sonst nichts:

```js
{ code: 'es-HN', lang: 'es', flag: '🇭🇳', label: 'HN', country: 'Honduras' },
```

Der Landesname wird in der Landessprache geschrieben, nicht auf Deutsch. In der Auswahlliste steht „Ελλάδα“, nicht „Griechenland“ — jemand, der Griechisch sucht, erkennt das eine, das andere womöglich nicht.

---

## 9. In ein anderes Projekt übernehmen

`i18n.js` hängt an nichts aus Drink. Nötig sind:

1. `i18n.js` kopieren, `REGIONS` und `LANG_NAMES` nach Bedarf kürzen.
2. Einen Ordner `i18n/` mit mindestens einem Sprachpaket anlegen und `FALLBACK` darauf setzen.
3. Das Skript **vor** dem eigenen einbinden, es definiert `I18N` global.
4. Beim Start `await I18N.load(gespeicherteWahl || I18N.detect())`, dann `I18N.apply()`.
5. Nach jedem Sprachwechsel `apply()` erneut aufrufen und alles neu zeichnen, was Zahlen oder zusammengesetzte Sätze enthält.

Fallstricke, die erfahrungsgemäß Zeit kosten:

**Zusammengesetzte Sätze.** Niemals `t('noch') + ' ' + wert + ' ' + t('bisZumZiel')`. Die Wortstellung ist je Sprache anders, im Japanischen steht das Verb hinten, im Türkischen hängt die Endung am Wort. Ein ganzer Satz mit Platzhalter, immer.

**Feste Breiten.** „Ziel erreicht“ ist kurz, „Objetivo alcanzado“ deutlich länger, deutsche Zusammensetzungen sind die längsten von allen. Knöpfe brauchen umbruchfähigen Text statt fester Pixelmaße.

**Zahlen in Zeichenketten.** `String(3000)` ergibt überall „3000“. Nur `I18N.num(3000)` macht daraus „3.000“, „3,000“ oder „3’000“.

**Fehlende Übersetzung.** `t()` gibt den Schlüssel selbst zurück, damit man beim Testen sofort sieht, was fehlt. Auf dem Bildschirm landet er trotzdem nicht: `apply()` erkennt diesen Fall und lässt den Text stehen, der im HTML hinterlegt ist.

Deshalb steht in jedem Element mit `data-i18n` der englische Text als Grundzustand:

```html
<button data-i18n="allg.save">Save</button>
```

Das ist die Versicherung gegen eine veraltete `languages.js` — etwa wenn die Datei beim Hochladen vergessen wurde oder ein alter Service Worker sie noch festhält. Dann steht dort schlimmstenfalls Englisch statt der gewünschten Sprache, aber nie „allg.save“.


---

## 10. Eine Falle, die Zeit gekostet hat

Die Sprachliste hängt an einem `hidden`-Attribut, ihre Klasse setzt aber `display:flex`:

```css
.sheet{ display:flex; … }
```

Damit gewinnt die Klasse gegen die eingebaute Browserregel `[hidden]{display:none}` — die Liste lag beim Start offen über der App und ließ sich durch nichts schließen. Von außen sah es aus, als würden die Knöpfe nicht reagieren; tatsächlich taten sie genau das Richtige, nur ohne sichtbare Wirkung.

Die Gegenmaßnahme steht ganz oben im Stylesheet und gilt für alles:

```css
[hidden]{display:none !important}
```

Faustregel: Sobald eine Klasse `display` setzt und dasselbe Element über `hidden` gesteuert wird, braucht es diese Regel. Sonst trifft es früher oder später genau eine Stelle — und man sucht den Fehler im JavaScript, wo keiner ist.
