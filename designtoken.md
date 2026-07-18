# designtoken.md — Mosaiko Design System

## Product Context
Mosaiko è un gestionale finanziario con moduli multipli per la vita quotidiana
(finanza personale + altri moduli). Priorità: fiducia, chiarezza dei dati,
leggibilità in dashboard data-heavy. Evitare estetiche generiche da template.

---

## Color Tokens (Light Mode)

### Primitive Colors
```css
:root {
  --blue-600: #1D4ED8;
  --blue-700: #1E40AF;
  --blue-100: #DBEAFE;

  --green-500: #10B981;
  --green-100: #D1FAE5;

  --red-600: #DC2626;
  --red-100: #FEE2E2;

  --amber-600: #D97706;
  --amber-100: #FEF3C7;

  --teal-600: #0D9488;
  --violet-600: #7C3AED;
  --orange-600: #EA580C;
  --lime-600: #65A30D;

  --slate-900: #0F172A;
  --slate-700: #334155;
  --slate-400: #94A3B8;
  --slate-100: #F1F5F9;
  --slate-50: #F8FAFC;
  --white: #FFFFFF;
}
```

### Semantic Tokens
```css
:root {
  /* Brand */
  --color-primary: var(--blue-600);
  --color-primary-hover: var(--blue-700);
  --color-primary-subtle: var(--blue-100);

  /* Status */
  --color-success: var(--green-500);
  --color-success-subtle: var(--green-100);
  --color-danger: var(--red-600);
  --color-danger-subtle: var(--red-100);
  --color-warning: var(--amber-600);
  --color-warning-subtle: var(--amber-100);

  /* Text */
  --color-text-primary: var(--slate-900);
  --color-text-secondary: var(--slate-700);
  --color-text-muted: var(--slate-400);
  --color-text-inverse: var(--white);

  /* Background */
  --color-bg-canvas: var(--slate-50);
  --color-bg-surface: var(--white);
  --color-bg-elevated: var(--white);
  --color-bg-inset: var(--slate-100);   /* fill di hover, input disabilitati, skeleton */
  --color-border: #E2E8F0;              /* slate-200: visibile su canvas slate-50 */
  --color-border-subtle: var(--slate-100); /* divider interni alle card */

  /* Status (testo su superfici chiare) */
  --color-success-strong: #059669;      /* verde per testo: contrasto migliore di green-500 */

  /* Module accents */
  --color-module-finance: var(--blue-600);
  --color-module-tasks: var(--teal-600);
  --color-module-health: var(--violet-600);
  --color-module-learning: var(--amber-600);
  --color-module-house: var(--orange-600);   /* T6.2: calore domestico, distinto dall'amber di Learning */
  --color-module-grocery: var(--lime-600);   /* T6.2: freschezza; lime ≠ green di stato (già in palette chart) */
  /* Ogni accent ha la variante -subtle (bg-100) per chip e icone */
}
```

### Mappatura Tailwind
I token sono esposti come classi semantiche in `tailwind.config.js` — usare
sempre queste, mai la palette Tailwind di default:

| Classe | Token |
|---|---|
| `bg-canvas` / `bg-surface` / `bg-elevated` / `bg-inset` | background |
| `text-ink` / `text-ink-secondary` / `text-ink-muted` / `text-ink-inverse` | testo |
| `border-edge` / `border-edge-subtle` (o `border` nudo) | bordi |
| `bg-primary` / `hover:bg-primary-hover` / `bg-primary-subtle` | brand |
| `text-success-strong`, `bg-success`, `bg-success-subtle` | positivo |
| `text-danger`, `bg-danger`, `bg-danger-subtle` | negativo/alert |
| `text-warning`, `bg-warning`, `bg-warning-subtle` | attenzione |
| `bg-module-finance` … `bg-module-grocery` (+ `-subtle`) | accent moduli (finance, tasks, health, learning, house, grocery) |
| `shadow-card` / `shadow-elevated` | elevazione |
| `font-amount` (classe CSS) | importi: JetBrains Mono + tabular-nums |

---

## Color Tokens (Dark Mode)
```css
[data-theme="dark"] {
  --color-bg-canvas: #0B1220;
  --color-bg-surface: #131B2E;
  --color-bg-elevated: #1A2438;
  --color-border: #24304A;

  --color-text-primary: #F1F5F9;
  --color-text-secondary: #CBD5E1;
  --color-text-muted: #64748B;

  --color-primary: #3B82F6;
  --color-primary-hover: #60A5FA;
  --color-primary-subtle: #1E3A8A;

  --color-success: #34D399;
  --color-success-subtle: #064E3B;
  --color-danger: #F87171;
  --color-danger-subtle: #7F1D1D;
  --color-warning: #FBBF24;
  --color-warning-subtle: #78350F;

  --color-module-finance: #60A5FA;
  --color-module-tasks: #2DD4BF;
  --color-module-health: #A78BFA;
  --color-module-learning: #FBBF24;
  --color-module-house: #FB923C;
  --color-module-grocery: #A3E635;
}
```

Il tema si attiva con `data-theme="dark"` sull'elemento `<html>`, gestito da
`src/lib/theme.tsx` (preferenza light/dark/system, persistita in localStorage,
script anti-flash nel layout). Tutti i componenti usano i token semantici,
quindi non servono varianti `dark:` nelle classi.

---

## Chart Tokens (Recharts)
Definiti in `src/lib/chartTheme.ts` + variabili CSS. Palette categorica
validata (CVD-safe, contrasto ≥3:1 su surface, light e dark):

```css
/* light */                     /* dark */
--chart-cat-1: #1D4ED8;         --chart-cat-1: #3B82F6;
--chart-cat-2: #0D9488;         --chart-cat-2: #0D9488;
--chart-cat-3: #7C3AED;         --chart-cat-3: #8B5CF6;
--chart-cat-4: #D97706;         --chart-cat-4: #D97706;
--chart-cat-5: #DB2777;         --chart-cat-5: #EC4899;
--chart-cat-6: #65A30D;         --chart-cat-6: #65A30D;
--chart-cat-7: #0891B2;         --chart-cat-7: #0891B2;
--chart-cat-8: #4F46E5;         --chart-cat-8: #6366F1;
```

Regole: assegnare in ordine fisso, mai ciclare oltre 8 (la nona serie va in
"Altro"); verde/rosso nei chart solo per entrate/uscite (semantica di stato),
mai come colori di serie generiche.

---

## Typography Tokens
```css
:root {
  --font-heading: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --text-h1-size: 26px;
  --text-h1-weight: 700;
  --text-h1-line: 32px;

  --text-h2-size: 20px;
  --text-h2-weight: 600;
  --text-h2-line: 28px;

  --text-body-size: 15px;
  --text-body-weight: 400;
  --text-body-line: 22px;

  --text-caption-size: 13px;
  --text-caption-weight: 400;
  --text-caption-line: 18px;

  --text-amount-size: 32px;
  --text-amount-weight: 700;
  --text-amount-line: 38px;
}
```

---

## Spacing Tokens
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
}
```

---

## Radius & Elevation Tokens
```css
:root {
  --radius-sm: 4px;   /* badge, tag */
  --radius-md: 6px;   /* button, input */
  --radius-lg: 8px;   /* card */
  --radius-full: 999px;

  --shadow-card: 0px 2px 8px rgba(15, 23, 42, 0.06);
  --shadow-elevated: 0px 4px 16px rgba(15, 23, 42, 0.10);
}
```

---

## Usage Rules for Claude Code
1. Usa sempre i token semantici (es. `var(--color-primary)`), mai valori hex hardcoded.
2. Verde solo per stati positivi (entrate, saldo attivo, obiettivi raggiunti).
3. Rosso solo per alert, spese eccessive, scadenze.
4. Ogni modulo mantiene il proprio accent color (`--color-module-*`) per la navigazione e gli header di sezione.
5. Numeri/importi: usa `--font-mono` o `--text-amount-*` per allineamento tabellare.
6. Ombre sempre sottili (`--shadow-card`), mai box-shadow generici pesanti.
7. Border radius coerente: card 8px, bottoni/input 6px, badge 4px o pill.
