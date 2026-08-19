/* Drink — Sprachmodul.
   REGIONS listet Länder, jedes zeigt auf ein Sprachpaket in languages.js.
   Mehrere Länder dürfen sich dasselbe Paket teilen: Österreich und Deutschland
   nutzen beide "de", unterscheiden sich aber in Flagge, Kürzel und Zahlenformat. */

const REGIONS = [
  // Englisch
  { code: 'en-GB', lang: 'en', flag: '🇬🇧', label: 'GB', country: 'United Kingdom' },
  { code: 'en-US', lang: 'en', flag: '🇺🇸', label: 'US', country: 'United States' },
  { code: 'en-CA', lang: 'en', flag: '🇨🇦', label: 'CA', country: 'Canada' },
  { code: 'en-AU', lang: 'en', flag: '🇦🇺', label: 'AU', country: 'Australia' },
  { code: 'en-NZ', lang: 'en', flag: '🇳🇿', label: 'NZ', country: 'New Zealand' },
  { code: 'en-IE', lang: 'en', flag: '🇮🇪', label: 'IE', country: 'Ireland' },
  { code: 'en-ZA', lang: 'en', flag: '🇿🇦', label: 'ZA', country: 'South Africa' },
  { code: 'en-IN', lang: 'en', flag: '🇮🇳', label: 'IN', country: 'India' },
  { code: 'en-SG', lang: 'en', flag: '🇸🇬', label: 'SG', country: 'Singapore' },
  { code: 'en-NG', lang: 'en', flag: '🇳🇬', label: 'NG', country: 'Nigeria' },

  // Deutsch
  { code: 'de-DE', lang: 'de', flag: '🇩🇪', label: 'DE', country: 'Deutschland' },
  { code: 'de-AT', lang: 'de', flag: '🇦🇹', label: 'AT', country: 'Österreich' },
  { code: 'de-CH', lang: 'de', flag: '🇨🇭', label: 'CH', country: 'Schweiz' },
  { code: 'de-LU', lang: 'de', flag: '🇱🇺', label: 'LU', country: 'Luxemburg' },
  { code: 'de-LI', lang: 'de', flag: '🇱🇮', label: 'LI', country: 'Liechtenstein' },
  { code: 'de-BE', lang: 'de', flag: '🇧🇪', label: 'BE', country: 'Belgien' },

  // Französisch
  { code: 'fr-FR', lang: 'fr', flag: '🇫🇷', label: 'FR', country: 'France' },
  { code: 'fr-BE', lang: 'fr', flag: '🇧🇪', label: 'BE', country: 'Belgique' },
  { code: 'fr-CH', lang: 'fr', flag: '🇨🇭', label: 'CH', country: 'Suisse' },
  { code: 'fr-CA', lang: 'fr', flag: '🇨🇦', label: 'CA', country: 'Canada' },
  { code: 'fr-LU', lang: 'fr', flag: '🇱🇺', label: 'LU', country: 'Luxembourg' },
  { code: 'fr-MC', lang: 'fr', flag: '🇲🇨', label: 'MC', country: 'Monaco' },
  { code: 'fr-MA', lang: 'fr', flag: '🇲🇦', label: 'MA', country: 'Maroc' },
  { code: 'fr-SN', lang: 'fr', flag: '🇸🇳', label: 'SN', country: 'Sénégal' },

  // Spanisch
  { code: 'es-ES', lang: 'es', flag: '🇪🇸', label: 'ES', country: 'España' },
  { code: 'es-MX', lang: 'es', flag: '🇲🇽', label: 'MX', country: 'México' },
  { code: 'es-AR', lang: 'es', flag: '🇦🇷', label: 'AR', country: 'Argentina' },
  { code: 'es-CO', lang: 'es', flag: '🇨🇴', label: 'CO', country: 'Colombia' },
  { code: 'es-CL', lang: 'es', flag: '🇨🇱', label: 'CL', country: 'Chile' },
  { code: 'es-PE', lang: 'es', flag: '🇵🇪', label: 'PE', country: 'Perú' },
  { code: 'es-VE', lang: 'es', flag: '🇻🇪', label: 'VE', country: 'Venezuela' },
  { code: 'es-EC', lang: 'es', flag: '🇪🇨', label: 'EC', country: 'Ecuador' },
  { code: 'es-GT', lang: 'es', flag: '🇬🇹', label: 'GT', country: 'Guatemala' },
  { code: 'es-CU', lang: 'es', flag: '🇨🇺', label: 'CU', country: 'Cuba' },
  { code: 'es-BO', lang: 'es', flag: '🇧🇴', label: 'BO', country: 'Bolivia' },
  { code: 'es-DO', lang: 'es', flag: '🇩🇴', label: 'DO', country: 'República Dominicana' },
  { code: 'es-UY', lang: 'es', flag: '🇺🇾', label: 'UY', country: 'Uruguay' },
  { code: 'es-PY', lang: 'es', flag: '🇵🇾', label: 'PY', country: 'Paraguay' },
  { code: 'es-CR', lang: 'es', flag: '🇨🇷', label: 'CR', country: 'Costa Rica' },
  { code: 'es-PA', lang: 'es', flag: '🇵🇦', label: 'PA', country: 'Panamá' },

  // Portugiesisch
  { code: 'pt-PT', lang: 'pt', flag: '🇵🇹', label: 'PT', country: 'Portugal' },
  { code: 'pt-BR', lang: 'pt', flag: '🇧🇷', label: 'BR', country: 'Brasil' },
  { code: 'pt-AO', lang: 'pt', flag: '🇦🇴', label: 'AO', country: 'Angola' },
  { code: 'pt-MZ', lang: 'pt', flag: '🇲🇿', label: 'MZ', country: 'Moçambique' },

  // Italienisch
  { code: 'it-IT', lang: 'it', flag: '🇮🇹', label: 'IT', country: 'Italia' },
  { code: 'it-CH', lang: 'it', flag: '🇨🇭', label: 'CH', country: 'Svizzera' },
  { code: 'it-SM', lang: 'it', flag: '🇸🇲', label: 'SM', country: 'San Marino' },

  // Niederländisch
  { code: 'nl-NL', lang: 'nl', flag: '🇳🇱', label: 'NL', country: 'Nederland' },
  { code: 'nl-BE', lang: 'nl', flag: '🇧🇪', label: 'BE', country: 'België' },
  { code: 'nl-SR', lang: 'nl', flag: '🇸🇷', label: 'SR', country: 'Suriname' },

  // Türkisch
  { code: 'tr-TR', lang: 'tr', flag: '🇹🇷', label: 'TR', country: 'Türkiye' },
  { code: 'tr-CY', lang: 'tr', flag: '🇨🇾', label: 'CY', country: 'Kıbrıs' },

  // Griechisch
  { code: 'el-GR', lang: 'el', flag: '🇬🇷', label: 'GR', country: 'Ελλάδα' },
  { code: 'el-CY', lang: 'el', flag: '🇨🇾', label: 'CY', country: 'Κύπρος' },

  // Nordisch
  { code: 'da-DK', lang: 'da', flag: '🇩🇰', label: 'DK', country: 'Danmark' },
  { code: 'da-GL', lang: 'da', flag: '🇬🇱', label: 'GL', country: 'Kalaallit Nunaat' },
  { code: 'sv-SE', lang: 'sv', flag: '🇸🇪', label: 'SE', country: 'Sverige' },
  { code: 'sv-FI', lang: 'sv', flag: '🇫🇮', label: 'FI', country: 'Finland' },
  { code: 'nb-NO', lang: 'no', flag: '🇳🇴', label: 'NO', country: 'Norge' },
  { code: 'fi-FI', lang: 'fi', flag: '🇫🇮', label: 'FI', country: 'Suomi' },

  // Mitteleuropa
  { code: 'cs-CZ', lang: 'cs', flag: '🇨🇿', label: 'CZ', country: 'Česko' },
  { code: 'pl-PL', lang: 'pl', flag: '🇵🇱', label: 'PL', country: 'Polska' },

  // Asien
  { code: 'zh-CN', lang: 'zh', flag: '🇨🇳', label: 'CN', country: '中国' },
  { code: 'zh-TW', lang: 'zh', flag: '🇹🇼', label: 'TW', country: '台灣' },
  { code: 'zh-HK', lang: 'zh', flag: '🇭🇰', label: 'HK', country: '香港' },
  { code: 'zh-SG', lang: 'zh', flag: '🇸🇬', label: 'SG', country: '新加坡' },
  { code: 'hi-IN', lang: 'hi', flag: '🇮🇳', label: 'IN', country: 'भारत' },
  { code: 'ja-JP', lang: 'ja', flag: '🇯🇵', label: 'JP', country: '日本' },
  { code: 'ko-KR', lang: 'ko', flag: '🇰🇷', label: 'KR', country: '대한민국' }
];

/* Anzeigename der Sprache, in der Sprache selbst */
const LANG_NAMES = {
  de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', pt: 'Português',
  it: 'Italiano', nl: 'Nederlands', tr: 'Türkçe', el: 'Ελληνικά', da: 'Dansk',
  sv: 'Svenska', no: 'Norsk', fi: 'Suomi', cs: 'Čeština', pl: 'Polski',
  zh: '中文', hi: 'हिन्दी', ja: '日本語', ko: '한국어'
};

/* Standard beim allerersten Start: Englisch.
   Bewusst keine Erkennung über navigator.languages — jeder soll dieselbe
   Oberfläche sehen und selbst umstellen. I18N.detect() bleibt für den Fall,
   dass man es doch will. */
const FALLBACK = 'en-GB';
const regionOf = code =>
  REGIONS.find(r => r.code === code) || REGIONS.find(r => r.code === FALLBACK) || REGIONS[0];

const I18N = {
  region: regionOf(FALLBACK),
  dict: (typeof I18N_PACKS !== 'undefined' ? I18N_PACKS.en : {}),

  /* Passenden Eintrag zur Browsersprache finden, sonst Deutsch */
  detect() {
    const wanted = navigator.languages || [navigator.language || ''];
    for (const w of wanted) {
      const exact = REGIONS.find(r => r.code.toLowerCase() === w.toLowerCase());
      if (exact) return exact.code;
      const base = w.split('-')[0].toLowerCase();
      const any = REGIONS.find(r => r.lang === base);
      if (any) return any.code;
    }
    return FALLBACK;
  },

  load(code) {
    const r = regionOf(code);
    this.region = r;
    this.dict = I18N_PACKS[r.lang] || I18N_PACKS.en || {};
    document.documentElement.lang = r.lang;
    return r;
  },

  /* t('home.left', { v: '500 ml' }) — Platzhalter in geschweiften Klammern.

     Fehlt ein Schlüssel, wird der Reihe nach ausgewichen: gewählte Sprache,
     Englisch, Deutsch. Erst wenn auch das nichts hergibt, wird aus dem
     Schlüssel ein lesbares Wort gemacht — „menu.dayStart" wird zu „Day Start".
     Ein roher Punkt-Schlüssel soll nie auf dem Bildschirm landen. */
  t(key, vars) {
    let s = this.dict[key];
    if (s === undefined) s = (I18N_PACKS.en || {})[key];
    if (s === undefined) s = (I18N_PACKS.de || {})[key];
    if (s === undefined) {
      if (!this.vermisst.has(key)) {
        this.vermisst.add(key);
        console.warn('[i18n] Schlüssel fehlt in languages.js:', key);
      }
      s = key.split('.').pop()
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase());
    }
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  },

  vermisst: new Set(),

  /* Alle Knoten mit data-i18n neu beschriften */
  apply(root = document) {
    /* Gibt t() den Schlüssel selbst zurück, kennt ihn keine Sprache. Dann bleibt
       der im HTML hinterlegte Text stehen, statt „cal.save“ auf den Knopf zu
       schreiben. So übersteht die App auch eine veraltete languages.js. */
    root.querySelectorAll('[data-i18n]').forEach(e => {
      const wert = I18N.t(e.dataset.i18n);
      if (wert !== e.dataset.i18n) e.textContent = wert;
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', I18N.t(e.dataset.i18nAria)));
    root.querySelectorAll('[data-i18n-ph]').forEach(e => e.placeholder = I18N.t(e.dataset.i18nPh));
  },

  /* Zahlen und Datum immer im Format des gewählten Landes */
  num(n, dec = 0) {
    return n.toLocaleString(this.region.code, { maximumFractionDigits: dec, minimumFractionDigits: 0 });
  },
  monthName(d) {
    return new Intl.DateTimeFormat(this.region.code, { month: 'long', year: 'numeric' }).format(d);
  },
  dayName(d) {
    return new Intl.DateTimeFormat(this.region.code, { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  },
  /* Kurze Wochentagsnamen, Woche beginnt Montag */
  weekdayShort() {
    const f = new Intl.DateTimeFormat(this.region.code, { weekday: 'short' });
    const out = [];
    for (let i = 1; i <= 7; i++) out.push(f.format(new Date(Date.UTC(2024, 0, i))));  // 1.1.2024 war ein Montag
    return out;
  }
};
