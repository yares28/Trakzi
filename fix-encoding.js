const fs = require('fs');

const files = [
  'app/analytics/_page/components/SpendingActivityRings.tsx',
  'app/fridge/_client/components/ReviewDialog.tsx',
  'components/subscription-dialog/plan-info.ts'
];

files.forEach(file => {
  try {
    console.log(`Processing ${file}...`);
    
    // Read as buffer
    const buffer = fs.readFileSync(file);
    
    // Convert to string, replacing invalid UTF-8 sequences
    // We'll read as latin1 and then clean up
    let content = buffer.toString('latin1');
    
    // Remove or replace problematic characters
    // 0x83 appears to be an invalid character, we'll remove it
    content = content.replace(/\x83/g, '');
    
    // Write back as UTF-8
    fs.writeFileSync(file, content, 'utf8');
    
    console.log(`✓ Fixed ${file}`);
  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err.message);
  }
});

console.log('\nDone!');
