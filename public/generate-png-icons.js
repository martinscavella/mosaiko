// Script per generare le icone PNG da SVG usando Node.js
// Installa la dipendenza: npm install sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [
  // PWA sizes
  { size: 72, filename: 'icon-72x72.png' },
  { size: 96, filename: 'icon-96x96.png' },
  { size: 128, filename: 'icon-128x128.png' },
  { size: 144, filename: 'icon-144x144.png' },
  { size: 152, filename: 'icon-152x152.png' },
  { size: 192, filename: 'icon-192x192.png' },
  { size: 384, filename: 'icon-384x384.png' },
  { size: 512, filename: 'icon-512x512.png' },

  // iOS sizes
  { size: 57, filename: 'apple-touch-icon-57x57.png' },
  { size: 60, filename: 'apple-touch-icon-60x60.png' },
  { size: 72, filename: 'apple-touch-icon-72x72.png' },
  { size: 76, filename: 'apple-touch-icon-76x76.png' },
  { size: 114, filename: 'apple-touch-icon-114x114.png' },
  { size: 120, filename: 'apple-touch-icon-120x120.png' },
  { size: 144, filename: 'apple-touch-icon-144x144.png' },
  { size: 152, filename: 'apple-touch-icon-152x152.png' },
  { size: 180, filename: 'apple-touch-icon-180x180.png' }
];

async function generateIcons() {
  const baseSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <path d="M 142,101 H 236 A 8,8 0 0 1 244,109 V 185 A 8,8 0 0 1 236,193 H 110 A 8,8 0 0 1 102,185 V 141 A 40,40 0 0 1 142,101 Z" fill="#2E5EAA"/>
  <path d="M 264,101 H 370 A 40,40 0 0 1 410,141 V 185 A 8,8 0 0 1 402,193 H 264 A 8,8 0 0 1 256,185 V 109 A 8,8 0 0 1 264,101 Z" fill="#7C3AED"/>
  <path d="M 110,205 H 186 A 8,8 0 0 1 194,213 V 403 A 8,8 0 0 1 186,411 H 142 A 40,40 0 0 1 102,371 V 213 A 8,8 0 0 1 110,205 Z" fill="#059669"/>
  <rect x="206" y="205" width="96" height="97" rx="8" ry="8" fill="#F59E0B"/>
  <rect x="314" y="205" width="96" height="97" rx="8" ry="8" fill="#14B8A6"/>
  <rect x="206" y="314" width="96" height="97" rx="8" ry="8" fill="#EF4444"/>
  <path d="M 322,314 H 402 A 8,8 0 0 1 410,322 V 371 A 40,40 0 0 1 370,411 H 322 A 8,8 0 0 1 314,403 V 322 A 8,8 0 0 1 322,314 Z" fill="#6366F1"/>
</svg>
  `;

  const iconsDir = './icons';
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generazione icone in corso...');

  for (const icon of iconSizes) {
    try {
      await sharp(Buffer.from(baseSvg))
        .resize(icon.size, icon.size)
        .png({ quality: 100, compressionLevel: 6 })
        .toFile(path.join(iconsDir, icon.filename));

      console.log(`✅ ${icon.filename} generata (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Errore generando ${icon.filename}:`, error.message);
    }
  }

  // Genera favicon.ico con sfondo trasparente
  const faviconSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <path d="M 142,101 H 236 A 8,8 0 0 1 244,109 V 185 A 8,8 0 0 1 236,193 H 110 A 8,8 0 0 1 102,185 V 141 A 40,40 0 0 1 142,101 Z" fill="#2E5EAA"/>
  <path d="M 264,101 H 370 A 40,40 0 0 1 410,141 V 185 A 8,8 0 0 1 402,193 H 264 A 8,8 0 0 1 256,185 V 109 A 8,8 0 0 1 264,101 Z" fill="#7C3AED"/>
  <path d="M 110,205 H 186 A 8,8 0 0 1 194,213 V 403 A 8,8 0 0 1 186,411 H 142 A 40,40 0 0 1 102,371 V 213 A 8,8 0 0 1 110,205 Z" fill="#059669"/>
  <rect x="206" y="205" width="96" height="97" rx="8" ry="8" fill="#F59E0B"/>
  <rect x="314" y="205" width="96" height="97" rx="8" ry="8" fill="#14B8A6"/>
  <rect x="206" y="314" width="96" height="97" rx="8" ry="8" fill="#EF4444"/>
  <path d="M 322,314 H 402 A 8,8 0 0 1 410,322 V 371 A 40,40 0 0 1 370,411 H 322 A 8,8 0 0 1 314,403 V 322 A 8,8 0 0 1 322,314 Z" fill="#6366F1"/>
</svg>
  `;

  try {
    await sharp(Buffer.from(faviconSvg))
      .resize(32, 32)
      .png()
      .toFile('./favicon.ico');
    console.log('✅ favicon.ico generato');
  } catch (error) {
    console.error('❌ Errore generando favicon.ico:', error.message);
  }

  console.log('🚀 Generazione icone completata!');
}

// Verifica se sharp è disponibile
try {
  generateIcons();
} catch (error) {
  console.log('⚠️  Sharp non disponibile. Installa con: npm install sharp');
  console.log('⚠️  In alternativa, usa le icone SVG già create.');
}
