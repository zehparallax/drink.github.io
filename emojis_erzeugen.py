"""Die zehn Zustände als Wassertropfen mit Gesicht.

Form: ein Kreis, an den zwei Tangenten zur Spitze laufen — so entsteht die
klassische Tropfenkontur ohne Knick. Die Mienen folgen den bekannten Emoji:
😵 🥵 😣 😕 😐 🙂 😊 😃 😁 🤩
"""

from PIL import Image, ImageDraw, ImageFilter
import math

S = 512
SS = 3
K = S * SS

HELL   = (126, 231, 244)      # oben im Tropfen
MITT   = (40, 186, 208)       # unten im Tropfen
RAND   = (14, 108, 126)
DUNKEL = (8, 36, 46)
WEISS  = (246, 254, 255)
WANGE  = (255, 96, 150)
HITZE  = (245, 70, 70)
ZUNGE  = (233, 104, 126)
GLANZ  = (255, 255, 255)

# Geometrie des Tropfens
CX, CY = K / 2, K * 0.605
R = K * 0.355
SPITZE = K * 0.055


def kontur():
    """Punkte des Tropfens: Spitze, rechte Tangente, Kreisbogen, linke Tangente."""
    d = CY - SPITZE
    kb = R / d                       # cos der Tangentenrichtung
    sb = math.sqrt(max(0.0, 1 - kb * kb))
    rechts = (CX + R * sb, CY - R * kb)
    links = (CX - R * sb, CY - R * kb)

    start = math.atan2(rechts[1] - CY, rechts[0] - CX)
    ende = math.atan2(links[1] - CY, links[0] - CX)
    if ende < start:
        ende += 2 * math.pi

    punkte = [(CX, SPITZE), rechts]
    schritte = 220
    for i in range(1, schritte + 1):
        w = start + (ende - start) * i / schritte
        punkte.append((CX + R * math.cos(w), CY + R * math.sin(w)))
    return punkte


def tropfenkoerper(blass):
    """Tropfen mit senkrechtem Verlauf, Rand und einem Glanzpunkt."""
    verlauf = Image.new("RGBA", (K, K))
    d = ImageDraw.Draw(verlauf)
    for y in range(K):
        t = min(1.0, max(0.0, (y - SPITZE) / (CY + R - SPITZE)))
        f = [HELL[k] + (MITT[k] - HELL[k]) * t for k in range(3)]
        f = tuple(round(f[k] + (158 - f[k]) * blass) for k in range(3))
        d.line([(0, y), (K, y)], fill=f + (255,))

    maske = Image.new("L", (K, K), 0)
    ImageDraw.Draw(maske).polygon(kontur(), fill=255)

    bild = Image.new("RGBA", (K, K), (0, 0, 0, 0))
    bild.paste(verlauf, (0, 0), maske)

    d2 = ImageDraw.Draw(bild)
    d2.line(kontur() + [kontur()[0]], fill=RAND + (255,), width=int(K * 0.014), joint="curve")

    # Glanzlicht auf der linken Flanke, wie es Wassertropfen haben
    glanz = Image.new("RGBA", (K, K), (0, 0, 0, 0))
    ImageDraw.Draw(glanz).ellipse(
        [CX - R * 0.62, CY - R * 0.92, CX - R * 0.34, CY - R * 0.46], fill=GLANZ + (78,))
    glanz = glanz.filter(ImageFilter.GaussianBlur(K * 0.020))
    bild.alpha_composite(Image.composite(glanz, Image.new("RGBA", (K, K), (0, 0, 0, 0)), maske))
    return bild


def wangen(bild, abstand, y, radius, farbe, deckung):
    schicht = Image.new("RGBA", (K, K), (0, 0, 0, 0))
    d = ImageDraw.Draw(schicht)
    for x in (CX - abstand, CX + abstand):
        d.ellipse([x - radius, y - radius * 0.66, x + radius, y + radius * 0.66],
                  fill=farbe + (deckung,))
    schicht = schicht.filter(ImageFilter.GaussianBlur(K * 0.011))
    maske = Image.new("L", (K, K), 0)
    ImageDraw.Draw(maske).polygon(kontur(), fill=255)
    bild.alpha_composite(Image.composite(schicht, Image.new("RGBA", (K, K), (0, 0, 0, 0)), maske))


def auge(d, x, y, r, art="rund"):
    if art == "rund":
        d.ellipse([x - r, y - r * 1.20, x + r, y + r * 1.20], fill=DUNKEL)
        d.ellipse([x - r * 0.44, y - r * 0.92, x + r * 0.02, y - r * 0.32], fill=WEISS)
    elif art == "punkt":
        d.ellipse([x - r * 0.78, y - r * 0.90, x + r * 0.78, y + r * 0.90], fill=DUNKEL)
    elif art == "kreuz":
        b = int(r * 0.60)
        d.line([(x - r, y - r), (x + r, y + r)], fill=DUNKEL, width=b)
        d.line([(x - r, y + r), (x + r, y - r)], fill=DUNKEL, width=b)
    elif art == "lachbogen":                       # 😊 😁: nach oben gewölbt
        d.arc([x - r * 1.30, y - r * 0.85, x + r * 1.30, y + r * 1.60],
              start=200, end=340, fill=DUNKEL, width=int(r * 0.60))
    elif art == "kniff":                           # 😣: fest zusammengekniffen
        d.arc([x - r * 1.25, y - r * 1.45, x + r * 1.25, y + r * 0.85],
              start=20, end=160, fill=DUNKEL, width=int(r * 0.60))
    elif art == "muede":                           # 🥵: schwere Lider
        d.ellipse([x - r * 1.05, y - r * 0.46, x + r * 1.05, y + r * 0.46], fill=DUNKEL)
    elif art == "stern":
        p = []
        for i in range(10):
            w = math.pi / 2 + i * math.pi / 5
            rad = r * 2.05 if i % 2 == 0 else r * 0.80
            p.append((x + math.cos(w) * rad, y - math.sin(w) * rad))
        d.polygon(p, fill=WEISS)


def braue(d, x, y, laenge, neigung, gespiegelt=False):
    n = -neigung if gespiegelt else neigung
    d.line([(x - laenge, y - n), (x + laenge, y + n)], fill=DUNKEL, width=int(K * 0.019))


def bogenmund(d, y, breite, woelbung, dicke=None):
    dicke = dicke or int(K * 0.023)
    if abs(woelbung) < 0.05:
        d.line([(CX - breite, y), (CX + breite, y)], fill=DUNKEL, width=dicke)
        return
    h = breite * abs(woelbung)
    if woelbung > 0:
        d.arc([CX - breite, y - h, CX + breite, y + h], start=0, end=180, fill=DUNKEL, width=dicke)
    else:
        d.arc([CX - breite, y - h, CX + breite, y + h], start=180, end=360, fill=DUNKEL, width=dicke)


def offenermund(d, y, breite, hoehe, zunge=True, zaehne=False):
    d.pieslice([CX - breite, y - hoehe * 0.55, CX + breite, y + hoehe * 1.45],
               start=0, end=180, fill=DUNKEL)
    if zaehne:
        # 😁 zeigt obere und untere Zahnreihe: heller Mund, dunkler Rand,
        # dazwischen die Trennlinie.
        rand = hoehe * 0.16
        d.pieslice([CX - breite + rand, y - hoehe * 0.55 + rand,
                    CX + breite - rand, y + hoehe * 1.45 - rand],
                   start=0, end=180, fill=WEISS)
        d.line([(CX - breite * 0.86, y + hoehe * 0.48), (CX + breite * 0.86, y + hoehe * 0.48)],
               fill=DUNKEL, width=int(K * 0.013))
    if zunge:
        d.pieslice([CX - breite * 0.46, y + hoehe * 0.44, CX + breite * 0.46, y + hoehe * 1.32],
                   start=0, end=180, fill=ZUNGE)


def wellenmund(d, y, breite, wellen=3):
    p = []
    for i in range(41):
        t = i / 40
        p.append((CX - breite + 2 * breite * t, y + math.sin(t * math.pi * wellen) * K * 0.019))
    d.line(p, fill=DUNKEL, width=int(K * 0.022), joint="curve")


def haengezunge(d, y, breite, hoehe):
    """🥵: der Mund steht offen, die Zunge hängt breit heraus."""
    d.rounded_rectangle([CX - breite * 0.66, y + hoehe * 0.30,
                         CX + breite * 0.66, y + hoehe * 2.10],
                        radius=breite * 0.62, fill=ZUNGE)
    d.line([(CX, y + hoehe * 0.95), (CX, y + hoehe * 1.85)],
           fill=(206, 82, 104), width=int(K * 0.010))
    d.pieslice([CX - breite, y - hoehe * 0.55, CX + breite, y + hoehe * 1.05],
               start=0, end=180, fill=DUNKEL)


def schweiss(d, x, y, r, farbe=(178, 234, 247)):
    d.ellipse([x - r, y - r, x + r, y + r], fill=farbe)
    d.polygon([(x, y - r * 2.2), (x - r * 0.82, y + r * 0.3), (x + r * 0.82, y + r * 0.3)], fill=farbe)


def funke(d, x, y, r):
    p = []
    for i in range(8):
        w = i * math.pi / 4
        rad = r if i % 2 == 0 else r * 0.28
        p.append((x + math.cos(w) * rad, y + math.sin(w) * rad))
    d.polygon(p, fill=WEISS)


def baue(nr):
    blass = max(0.0, (4 - nr) / 7)
    bild = tropfenkoerper(blass)

    ax = CX - R * 0.44
    bx = CX + R * 0.44
    ay = CY - R * 0.26
    ar = R * 0.145
    my = CY + R * 0.34
    mb = R * 0.42
    wy = CY + R * 0.16

    if nr == 2:  wangen(bild, R * 0.66, wy, R * 0.21, HITZE, 130)
    if nr == 7:  wangen(bild, R * 0.66, wy, R * 0.20, WANGE, 185)
    if nr == 8:  wangen(bild, R * 0.68, wy, R * 0.20, WANGE, 200)
    if nr == 9:  wangen(bild, R * 0.68, wy, R * 0.21, WANGE, 165)
    if nr == 10: wangen(bild, R * 0.68, wy, R * 0.23, WANGE, 225)

    d = ImageDraw.Draw(bild)

    if nr == 1:                                    # 😵 ausgetrocknet
        auge(d, ax, ay, ar * 1.15, "kreuz"); auge(d, bx, ay, ar * 1.15, "kreuz")
        wellenmund(d, my, mb * 0.85)
    elif nr == 2:                                  # 🥵 überhitzt
        auge(d, ax, ay + ar * 0.15, ar, "muede"); auge(d, bx, ay + ar * 0.15, ar, "muede")
        braue(d, ax, ay - ar * 1.85, ar * 1.45, -ar * 0.48)
        braue(d, bx, ay - ar * 1.85, ar * 1.45, -ar * 0.48, True)
        haengezunge(d, my - R * 0.05, mb * 0.72, R * 0.17)
        schweiss(d, CX + R * 0.80, CY - R * 0.52, R * 0.10)
    elif nr == 3:                                  # 😣 angestrengt
        auge(d, ax, ay + ar * 0.1, ar, "kniff"); auge(d, bx, ay + ar * 0.1, ar, "kniff")
        braue(d, ax, ay - ar * 1.75, ar * 1.5, ar * 0.5)
        braue(d, bx, ay - ar * 1.75, ar * 1.5, ar * 0.5, True)
        wellenmund(d, my, mb * 0.72, 2)
    elif nr == 4:                                  # 😕 unschlüssig
        auge(d, ax, ay, ar, "punkt"); auge(d, bx, ay, ar, "punkt")
        d.arc([CX - mb * 0.74, my - mb * 0.34, CX + mb * 0.62, my + mb * 0.26],
              start=185, end=355, fill=DUNKEL, width=int(K * 0.023))
    elif nr == 5:                                  # 😐 gleichmütig
        auge(d, ax, ay, ar, "punkt"); auge(d, bx, ay, ar, "punkt")
        bogenmund(d, my, mb * 0.72, 0)
    elif nr == 6:                                  # 🙂 angedeutetes Lächeln
        auge(d, ax, ay, ar, "punkt"); auge(d, bx, ay, ar, "punkt")
        bogenmund(d, my, mb * 0.78, 0.32)
    elif nr == 7:                                  # 😊 freundlich
        auge(d, ax, ay, ar, "lachbogen"); auge(d, bx, ay, ar, "lachbogen")
        bogenmund(d, my, mb * 0.88, 0.46)
    elif nr == 8:                                  # 😃 strahlend
        auge(d, ax, ay, ar * 1.05, "rund"); auge(d, bx, ay, ar * 1.05, "rund")
        offenermund(d, my - R * 0.03, mb * 0.86, R * 0.20)
    elif nr == 9:                                  # 😁 breites Grinsen
        auge(d, ax, ay, ar, "lachbogen"); auge(d, bx, ay, ar, "lachbogen")
        offenermund(d, my - R * 0.04, mb * 1.00, R * 0.21, zunge=False, zaehne=True)
    elif nr == 10:                                 # 🤩 begeistert
        auge(d, ax, ay, ar, "stern"); auge(d, bx, ay, ar, "stern")
        offenermund(d, my - R * 0.03, mb * 0.96, R * 0.20)
        funke(d, CX - R * 0.95, CY - R * 0.80, R * 0.12)
        funke(d, CX + R * 0.92, CY - R * 0.55, R * 0.09)

    return bild.resize((S, S), Image.LANCZOS)


NAMEN = ["eins", "zwei", "drei", "vier", "fuenf", "sechs", "sieben", "acht", "neun", "zehn"]
for i, n in enumerate(NAMEN, start=1):
    baue(i).save(f"emoji-{n}.png")

blatt = Image.new("RGB", (5 * 190, 2 * 190), (22, 22, 26))
for i, n in enumerate(NAMEN):
    im = Image.open(f"emoji-{n}.png").convert("RGBA").resize((178, 178), Image.LANCZOS)
    blatt.paste(im, ((i % 5) * 190 + 6, (i // 5) * 190 + 6), im)
blatt.save("/tmp/emojis.png")
print("zehn Tropfen erzeugt")
