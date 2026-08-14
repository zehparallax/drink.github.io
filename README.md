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

Der Menüpunkt **Einrichtung** zeigt die Installationsanleitung für den Startbildschirm, mit Reitern für iPhone, Android und Rechner. Der passende Reiter ist automatisch vorgewählt, und wo der Browser es erlaubt, steht dort zusätzlich ein direkter Installieren-Knopf.

Davon getrennt läuft beim allerersten Start ein Assistent in fünf Schritten durch Ziel, Mengen und Erinnerung. Die Erlaubnis für Benachrichtigungen wird im vierten Schritt geholt, also mit einer Nutzeraktion — das verlangen Chrome und Safari. Über *Über & Daten → Ersteinrichtung erneut starten* lässt er sich wiederholen, ohne dass getrunkene Milliliter verloren gehen.

## Cloudflare Web Analytics

In `index.html` steht ganz unten der Beacon von Cloudflare. Er zählt anonyme Seitenaufrufe, setzt keine Cookies und sieht keine Trinkdaten.

So kommst du an deinen Token:

1. Im Cloudflare-Dashboard auf **Analytics & Logs → Web Analytics**.
2. **Add a site** wählen und deine GitHub-Pages-Adresse eintragen, etwa `deinname.github.io/drink`.
3. Cloudflare zeigt dir das fertige Snippet mit deinem Token.
4. In `index.html` das Wort `TOKEN` durch deinen Token ersetzen.

Ein Cloudflare-Konto reicht, die Domain muss nicht bei Cloudflare liegen — genau deshalb funktioniert das auf GitHub Pages. Lässt du `TOKEN` stehen, wird nichts gezählt und die App läuft unverändert.

## Auf den Startbildschirm legen

- **Android (Chrome):** Menü ⋮ → *App installieren*. Alternativ erscheint im Menü der App unter *Über & Daten* ein Knopf.
- **iPhone (Safari):** Teilen-Symbol → *Zum Home-Bildschirm*. Nur so darf die App überhaupt Benachrichtigungen schicken; im normalen Safari-Tab geht das auf iOS nicht.

## Icons austauschen

Der Wassertropfen liegt als `favicon.svg` bei — änderst du den, sollten die PNGs dazu passen. Nötig sind:

| Datei | Zweck |
|---|---|
| `favicon.ico`, `favicon.svg`, `icons/favicon-16.png`, `icons/favicon-32.png` | Browser-Tab und Lesezeichen |
| `icons/apple-touch-icon.png` (180 × 180, randlos) | iPhone-Startbildschirm; iOS rundet die Ecken selbst, das Bild darf keine Transparenz haben |
| `icons/icon-96 … 512.png` | Android- und Desktop-Installation, App-Umschalter |
| `icons/maskable-192.png`, `icons/maskable-512.png` | Android schneidet je nach Hersteller Kreis, Rundung oder Tropfenform aus — deshalb 20 % Sicherheitsrand rundherum |

## Emojis austauschen

Ersetze die zehn PNGs in `emoji/` durch eigene, gleiche Dateinamen behalten:

`eins.png` = am schlechtesten (0 % getrunken) … `zehn.png` = am besten (Ziel erreicht).

Quadratisch, am besten 512 × 512 px mit transparentem Hintergrund. Fehlt eine Datei, zeigt die App ersatzweise ein Text-Emoji.

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
