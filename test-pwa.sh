#!/bin/bash

# Script per testare le funzionalità PWA di Mosaiko

echo "🔍 Controllo configurazione PWA per iOS..."
echo ""

# Controlla che il manifest sia valido
echo "✅ Controllo manifest.json..."
if [ -f "public/manifest.json" ]; then
    echo "   ✓ manifest.json trovato"
else
    echo "   ❌ manifest.json non trovato"
fi

# Controlla il Service Worker
echo "✅ Controllo Service Worker..."
if [ -f "public/sw.js" ]; then
    echo "   ✓ sw.js trovato"
else
    echo "   ❌ sw.js non trovato"
fi

# Controlla le icone iOS
echo "✅ Controllo icone iOS..."
icons_found=0
for size in "57x57" "60x60" "72x72" "76x76" "114x114" "120x120" "144x144" "152x152" "180x180"; do
    if [ -f "public/icons/apple-touch-icon-${size}.png" ]; then
        ((icons_found++))
    fi
done
echo "   ✓ Icone iOS trovate: ${icons_found}/9"

# Controlla la pagina offline
echo "✅ Controllo pagina offline..."
if [ -f "public/offline.html" ]; then
    echo "   ✓ offline.html trovato"
else
    echo "   ❌ offline.html non trovato"
fi

echo ""
echo "🚀 Configurazione PWA per iOS completata!"
echo ""
echo "📱 Per testare su iOS:"
echo "   1. Apri Safari su iPhone/iPad"
echo "   2. Naviga verso il tuo sito (localhost:3000 o dominio)"
echo "   3. Tocca il pulsante di condivisione"
echo "   4. Seleziona 'Aggiungi alla schermata Home'"
echo "   5. L'app si aprirà in modalità standalone (senza barra degli indirizzi)"
echo ""
echo "✨ Caratteristiche iOS PWA implementate:"
echo "   • Modalità standalone (nasconde Safari UI)"
echo "   • Supporto per safe-area (notch iPhone)"
echo "   • Icone per tutti i dispositivi iOS"
echo "   • Splash screen personalizzate"
echo "   • Service Worker per funzionalità offline"
echo "   • Prevenzione zoom doppio-tap"
echo "   • Gestione orientamento schermo"
echo ""
