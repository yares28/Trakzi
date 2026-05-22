const sharp = require('sharp');

async function buildOG() {
  const bgPath = 'c:/Users/Yaya/Desktop/PROJECTS/trakzi/public/Trakzi/og_bg_only.png';
  const logoPath = 'c:/Users/Yaya/Desktop/PROJECTS/trakzi/public/Trakzi/TrakzilogoB.png';
  const outputPath = 'c:/Users/Yaya/Desktop/PROJECTS/trakzi/public/Trakzi/og-image.png';

  try {
    // 1. Ensure the background is exactly 1200x630
    const bgBuffer = await sharp(bgPath)
      .resize({ width: 1200, height: 630, fit: 'cover' })
      .toBuffer();

    // 2. Resize the logo 
    const logoBuffer = await sharp(logoPath)
      .resize({ width: 500, fit: 'contain' })
      .toBuffer();

    // 3. Create SVG text layer for the tagline
    const svgText = `
      <svg width="1200" height="150">
        <text 
          x="50%" 
          y="50%" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="28" 
          font-weight="400" 
          fill="#d1d5db" 
          text-anchor="middle"
        >
          The All-in-One Budgeting Workspace
        </text>
      </svg>
    `;

    // 4. Composite everything together
    await sharp(bgBuffer)
      .composite([
        { input: logoBuffer, top: 220, left: 350 }, // Center-ish for the 500px wide logo on 1200px canvas
        { input: Buffer.from(svgText), top: 400, left: 0 }
      ])
      .toFile(outputPath);

    console.log('Successfully composited exact logo onto OG background!');
  } catch (error) {
    console.error('Error building OG image:', error);
  }
}

buildOG();
