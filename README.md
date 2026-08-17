# Drink

Ein Wasser-Tracker als PWA. Läuft komplett im Browser, speichert alles lokal auf dem Gerät, kein Server, kein Konto.

## Dateien

```
index.html              Oberfläche
styles.css              Gestaltung
app.js                  Logik: Ziel, Mengen, Erinnerung, Teilen
sw.js                   Service Worker: offline + Benachrichtigung
manifest.webmanifest    macht die App installierbar
favicon.ico             Browser-Tab, klassisch
favicon.svg             Browser-Tab, scharf in jeder Größe
icons/                  App-Icons 16 – 512, maskable und apple-touch
emoji/                  eins.png … zehn.png — Platzhalter, einfach überschreiben
EINRICHTUNG.md          wie der Einrichtungs-Dialog gebaut ist
SPRACHEN.md             wie das Sprachsystem gebaut ist
i18n.js                 Sprachmodul: Länderliste, Umschalten, Formate
languages.js            alle 19 Übersetzungen in einer Datei
```

## Auf GitHub Pages veröffentlichen

1. Neues Repository anlegen, zum Beispiel `drink`.
2. Alle Dateien in den Wurzelordner des Repos legen (nicht in einen Unterordner).
3. Im Repo auf **Settings → Pages** gehen.
4. Bei *Source* **Deploy from a branch** wählen, Branch `main`, Ordner `/ (root)`, speichern.
5. Nach ein bis zwei Minuten liegt die App unter `https://DEINNAME.github.io/drink/`.

Die Pfade sind alle relativ, ein Unterordner wie `/drink/` funktioniert also ohne Änderung. HTTPS liefert GitHub Pages mit — das ist Bedingung für Service Worker und Benachrichtigungen.

## Lokal testen

Ein Doppelklick auf `index.html` reicht nicht — über `file://` verweigert der Browser Service Worker und Benachrichtigungen. Starte im Projektordner einen kleinen Server:

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. `localhost` gilt als sicherer Kontext, dort läuft alles wie später auf GitHub Pages.

## Einrichtung

Der Menüpunkt **Einrichtung** zeigt die Installationsanleitung für den Startbildschirm, mit Reitern für iPhone, Android und Rechner. Der passende Reiter ist vorgewählt, und wo der Browser es erlaubt, steht dort ein direkter Installieren-Knopf.

Wie das programmiert ist und wie man es in ein anderes Projekt übernimmt, steht in [EINRICHTUNG.md](EINRICHTUNG.md).

Einen Ersteinrichtungs-Assistenten gibt es nicht. Die App startet mit 3 Litern als Tagesziel, drei Größen in der Schnellauswahl und einer Erinnerung um 7 Uhr — alles im Menü änderbar.

## Sprache

Der Knopf oben rechts zeigt Flagge und Länderkürzel und öffnet eine durchsuchbare Liste mit 70 Ländern in 19 Sprachen: Deutsch, Englisch, Französisch, Spanisch, Portugiesisch, Italienisch, Niederländisch, Türkisch, Griechisch, Dänisch, Schwedisch, Norwegisch, Finnisch, Tschechisch, Polnisch, Chinesisch, Hindi, Japanisch, Koreanisch.

Länder mit gleicher Sprache sind eigene Einträge — Deutschland, Österreich und die Schweiz teilen sich die Übersetzung, unterscheiden sich aber in Flagge, Kürzel und Zahlenformat. Beim ersten Start ist Englisch eingestellt; die Wahl bleibt danach gespeichert.

Details und Anleitung zum Ergänzen: [SPRACHEN.md](SPRACHEN.md).

## Kalender und Streak

Im Menü zeigt *Kalender* jeden Monat als Raster. Jeder Tag ist ein Kreis, der von unten so weit mit Wasser gefüllt ist, wie das Tagesziel erreicht wurde; ein Tippen zeigt darunter die genaue Menge. Oben stehen drei Durchschnittswerte: laufender Monat, laufendes Jahr, alle Einträge.

Gemittelt wird über Tage mit Einträgen, nicht über alle Kalendertage — sonst würde die Zeit vor der Installation den Schnitt verfälschen.

Auf dem Startbildschirm steht unten rechts die Serie: die Zahl der Tage in Folge, an denen das Ziel erreicht wurde. Der heutige Tag zählt erst, wenn er geschafft ist, reißt die Serie bis dahin aber nicht ab — sonst stünde sie jeden Vormittag auf null. Wird ein Tag verpasst, beginnt sie von vorn. Ein Tippen öffnet den Kalender.

Für vergangene Tage wird das heutige Ziel zugrunde gelegt, samt Wochentagsaufschlag; frühere Ziele werden nicht mitgespeichert.

## Einheiten

Unter *Einheit* lässt sich die Anzeige umstellen: Milliliter, Liter, Flüssigunzen US oder UK, Cups US. Körpermaße wahlweise in Kilogramm und Zentimeter oder in Pfund und Zoll.

Gespeichert wird intern immer in Milliliter. Ein Wechsel der Einheit rechnet also nur die Anzeige um und lässt bestehende Einträge unangetastet.

## Ziel

Das Tagesziel steht als eigenes Feld ganz oben im Ziel-Bereich. Die Berechnung aus Gewicht, Alter, Größe und Geschlecht darunter ist davon getrennt: Sie zeigt nur eine Empfehlung, und erst der Knopf *Als Tagesziel übernehmen* schreibt sie ins Ziel. Wer sein Ziel selbst setzt, dem verstellt die Berechnung also nichts.

## Cloudflare Web Analytics

In `index.html` steht ganz unten der Beacon von Cloudflare. Er zählt anonyme Seitenaufrufe, setzt keine Cookies und sieht keine Trinkdaten.

So kommst du an deinen Token:

1. Im Cloudflare-Dashboard auf **Analytics & Logs → Web Analytics**.
2. **Add a site** wählen und deine GitHub-Pages-Adresse eintragen, etwa `deinname.github.io/drink`.
3. Cloudflare zeigt dir das fertige Snippet mit deinem Token.
4. In `index.html` das Wort `TOKEN` durch deinen Token ersetzen.

Ein Cloudflare-Konto reicht, die Domain muss nicht bei Cloudflare liegen — genau deshalb funktioniert das auf GitHub Pages. Lässt du `TOKEN` stehen, wird nichts gezählt und die App läuft unverändert.

## Wenn das Icon beim Installieren fehlt

Fast immer liegt es daran, dass Android das Manifest nicht lesen kann — dann nimmt der Launcher einen grauen Platzhalter oder den ersten Buchstaben. Der Reihe nach prüfen:

1. **Manifest direkt aufrufen:** `https://deinname.github.io/drink/manifest.json` im Browser öffnen. Erscheint eine 404-Seite, fehlt die Datei oder heißt anders als der Verweis in `index.html`. Beide müssen `manifest.json` sagen.
2. **Ein Icon direkt aufrufen:** `…/drink/icons/icon-192.png`. Kommt kein Tropfen, wurde der Ordner `icons` nicht mitgeladen.
3. **Am Rechner prüfen:** Chrome, F12, Reiter *Application → Manifest*. Dort stehen alle Icons mit Vorschau, und Chrome nennt jeden abgelehnten Eintrag samt Grund.
4. **Neu installieren:** Android tauscht das Icon einer bereits installierten App bei einem Update **nicht** aus, auch nicht nach dem Löschen der Browserdaten. Die App vom Startbildschirm entfernen, unter *Einstellungen → Apps* auch die Reste löschen, dann neu installieren.

Häufigste Stolpersteine im Manifest, alle hier vermieden: eine angegebene Größe, die nicht den echten Pixelmaßen entspricht (Chrome verwirft solche Einträge stillschweigend), fehlende 192 und 512 mit `purpose: "any"`, und transparente Ecken bei den Launcher-Icons.

## Auf den Startbildschirm legen

- **Android (Chrome):** Menü ⋮ → *App installieren*. Alternativ erscheint im Menü der App unter *Über & Daten* ein Knopf.
- **iPhone (Safari):** Teilen-Symbol → *Zum Home-Bildschirm*. Nur so darf die App überhaupt Benachrichtigungen schicken; im normalen Safari-Tab geht das auf iOS nicht.

## Icons austauschen

Der Wassertropfen liegt als `favicon.svg` bei — änderst du den, sollten die PNGs dazu passen. Nötig sind:

| Datei | Zweck |
|---|---|
| `favicon.ico`, `favicon.svg`, `icons/favicon-16.png`, `icons/favicon-32.png` | Browser-Tab und Lesezeichen |
| `icons/apple-touch-icon-120/152/167/180.png` | iPhone, iPad und iPad Pro; randlos, iOS rundet die Ecken selbst und verträgt keine Transparenz |
| `icons/icon-48 … 512.png` | Android- und Desktop-Installation, App-Umschalter, Splash-Screen |
| `icons/maskable-48 … 512.png` | Android schneidet je nach Hersteller Kreis, Squircle oder Tropfen aus — deshalb 20 % Sicherheitsrand rundherum |

Insgesamt 25 Dateien. Die kleinen Größen 16 und 32 stehen bewusst **nicht** im Manifest, nur in den `<link rel="icon">`-Zeilen: Manche Launcher greifen sonst beim Installieren nach dem erstbesten Eintrag und legen ein 16-Pixel-Icon auf den Startbildschirm.

## Emojis austauschen

Ersetze die zehn PNGs in `emoji/` durch eigene, gleiche Dateinamen behalten:

`eins.png` = am schlechtesten (0 % getrunken) … `zehn.png` = am besten (Ziel erreicht).

Quadratisch, am besten 512 × 512 px mit transparentem Hintergrund.

Bis ein Bild geladen ist, steht an seiner Stelle ein Text-Emoji — auch dann, wenn eine Datei fehlt. So bleibt die Fläche nie leer, auch nicht beim allerersten Aufruf mit kaltem Cache.

## Zur Erinnerung um 7 Uhr — was ehrlich möglich ist

Die App schickt eine lautlose Benachrichtigung (`silent: true`, keine Vibration) mit dem noch leeren Balken. Ausgelöst wird sie über drei Wege:

1. **Periodic Background Sync** — Android/Chrome, nur bei installierter App. Das Betriebssystem entscheidet, wann es die App aufweckt; die Erinnerung kann daher etwas nach 7 Uhr kommen.
2. **Während die App offen ist** — dann prüft sie selbst minütlich.
3. **Echter Web-Push** — der `push`-Handler in `sw.js` ist schon da, es fehlt nur ein Server.

Eine reine GitHub-Pages-Seite ohne Server kann keine Benachrichtigung garantiert auf die Sekunde um 7 Uhr zustellen — das kann im Web nur Web-Push mit einem Server, der zur richtigen Zeit sendet. iOS unterstützt Periodic Background Sync gar nicht, dort brauchst du diesen Weg.

### Später auf echten Push umstellen

Nötig sind: ein VAPID-Schlüsselpaar, ein kleiner Dienst (z. B. Cloudflare Worker mit Cron-Trigger oder ein GitHub-Actions-Cron plus Serverless-Funktion), der die Subscriptions speichert und täglich sendet. In der App kommt dazu:

```js
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: '<VAPID Public Key>'
});
await fetch('https://dein-dienst/subscribe', { method: 'POST', body: JSON.stringify(sub) });
```

Der Service Worker verarbeitet eingehende Pushes bereits.

## Zielberechnung

Faustformel: Milliliter pro Kilogramm Körpergewicht, abhängig vom Alter (unter 30 → 40, bis 55 → 35, darüber → 30), leichte Anpassung nach Geschlecht und Körpergröße, gerundet auf 50 ml. Das ist eine grobe Orientierung, keine medizinische Empfehlung.
