const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const GREEN_BG = '#6FA85C';

// Read the original SVG and modify it
const svgContent = fs.readFileSync(path.join(ASSETS_DIR, 'logo.svg'), 'utf8');

// Change all black strokes to white
const whiteSvg = svgContent.replace(/stroke="#000000"/g, 'stroke="#FFFFFF"');

// Create icon SVG with green background (rounded corners for app icon feel)
function createIconSvg(size, padding) {
  const logoScale = (size - padding * 2) / 1024;
  const offset = padding;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${GREEN_BG}" rx="0" ry="0"/>
  <g transform="translate(${offset}, ${offset}) scale(${logoScale})">
    ${whiteSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`;
}

// Create adaptive icon SVG (foreground only, no background - Android adds its own)
function createAdaptiveIconSvg(size, padding) {
  const logoScale = (size - padding * 2) / 1024;
  const offset = padding;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${offset}, ${offset}) scale(${logoScale})">
    ${whiteSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`;
}

async function generate() {
  console.log('Generating app icons...');

  // 1. icon.png - 1024x1024 main app icon
  const iconSvg = createIconSvg(1024, 80);
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('  ✓ icon.png (1024x1024)');

  // 2. adaptive-icon.png - 1024x1024 foreground for Android adaptive icon
  // Adaptive icons need extra padding (~18% safe zone)
  const adaptiveIconSvg = createAdaptiveIconSvg(1024, 184);
  await sharp(Buffer.from(adaptiveIconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('  ✓ adaptive-icon.png (1024x1024)');

  // 3. splash-icon.png - 1024x1024 for splash screen (logo only, no background)
  const splashSvg = createAdaptiveIconSvg(1024, 100);
  // For splash, use the green-stroked version on transparent background
  const splashSvgGreen = splashSvg.replace(/stroke="#FFFFFF"/g, `stroke="${GREEN_BG}"`);
  await sharp(Buffer.from(splashSvgGreen))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('  ✓ splash-icon.png (1024x1024)');

  // 4. favicon.png - 48x48 for web
  const faviconSvg = createIconSvg(512, 40);
  await sharp(Buffer.from(faviconSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('  ✓ favicon.png (48x48)');

  console.log('\nAll icons generated successfully!');
}

generate().catch(console.error);
