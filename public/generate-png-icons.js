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
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="90" fill="url(#grad1)"/>
      <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="bold" text-anchor="middle" fill="white">M</text>
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

  // Genera favicon.ico
  try {
    await sharp(Buffer.from(baseSvg))
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
