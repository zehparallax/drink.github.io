# Drink

Ein Wasser-Tracker als PWA. Läuft komplett im Browser, speichert alles lokal auf dem Gerät, kein Server, kein Konto.

## Dateien

```
index.html              Oberfläche
styles.css              Gestaltung
app.js                  Logik: Ziel, Mengen, Erinnerung, Teilen
sw.js                   Service Worker: offline + Benachrichtigung
manifest.webmanifest    macht die App installierbar
icons/                  App-Icon (192, 512, maskable)
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

## Auf den Startbildschirm legen

- **Android (Chrome):** Menü ⋮ → *App installieren*. Alternativ erscheint im Menü der App unter *Über & Daten* ein Knopf.
- **iPhone (Safari):** Teilen-Symbol → *Zum Home-Bildschirm*. Nur so darf die App überhaupt Benachrichtigungen schicken; im normalen Safari-Tab geht das auf iOS nicht.

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
