# Setup Font Debbie BC

## Passi per configurare il font Debbie BC:

### 1. Scarica i file del font
Devi scaricare i file del font Debbie BC nei seguenti formati:
- `DebbieBC-Regular.woff2`
- `DebbieBC-Bold.woff2`

### 2. Posiziona i file
Copia i file del font nella cartella:
```
src/app/fonts/
├── DebbieBC-Regular.woff2
└── DebbieBC-Bold.woff2
```

### 3. Utilizzo del font
Il font è ora configurato e può essere utilizzato con le classi Tailwind:

```tsx
// Font principale Debbie BC
<h1 className="font-debbie">Titolo con Debbie BC</h1>

// Font sans-serif predefinito (Geist)
<p className="font-sans">Testo normale</p>

// Font monospace (Geist Mono)
<code className="font-mono">Codice</code>
```

### 4. Alternative
Se non riesci a trovare il font Debbie BC, puoi utilizzare:
- Google Fonts con un font simile
- Un font locale già presente nel sistema
- Un altro font decorativo

### 5. Font CSS personalizzato
Se preferisci, puoi anche aggiungere il font tramite CSS:

```css
@font-face {
  font-family: 'Debbie BC';
  src: url('./fonts/DebbieBC-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.debbie-bc {
  font-family: 'Debbie BC', sans-serif;
}
```

## Note
- I file del font devono essere in formato `.woff2` per prestazioni ottimali
- Il font è configurato con `font-display: swap` per migliorare le prestazioni di caricamento
- La variabile CSS `--font-debbie-bc` è disponibile globalmente
