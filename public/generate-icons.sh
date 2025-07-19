#!/bin/bash

# Script per generare le icone per iOS e PWA
# Assicurati di avere ImageMagick installato: brew install imagemagick

# Colori del brand Mosaiko
BACKGROUND_COLOR="#3b82f6"
TEXT_COLOR="white"

# Crea un'icona base SVG
cat > base_icon.svg << EOF
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="90" fill="url(#grad1)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="bold" text-anchor="middle" fill="white">M</text>
</svg>
EOF

echo "🎨 Generazione icone per PWA e iOS..."

# Crea la cartella icons se non esiste
mkdir -p icons

# Dimensioni per PWA
PWA_SIZES=(72 96 128 144 152 192 384 512)

# Dimensioni per iOS
IOS_SIZES=(57 60 72 76 114 120 144 152 180)

# Genera icone PWA
for size in "${PWA_SIZES[@]}"; do
  echo "Generando icon-${size}x${size}.png..."
  magick base_icon.svg -resize "${size}x${size}" "icons/icon-${size}x${size}.png"
done

# Genera icone iOS
for size in "${IOS_SIZES[@]}"; do
  echo "Generando apple-touch-icon-${size}x${size}.png..."
  magick base_icon.svg -resize "${size}x${size}" "icons/apple-touch-icon-${size}x${size}.png"
done

# Genera favicon
echo "Generando favicon.ico..."
magick base_icon.svg -resize "32x32" favicon.ico

# Cleanup
rm base_icon.svg

echo "✅ Icone generate con successo!"
echo "📁 Le icone si trovano nella cartella 'icons/'"
echo ""
echo "Per un risultato migliore, sostituisci l'icona base con il tuo logo personalizzato."
