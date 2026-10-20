const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  /AIzaSy[0-9A-Za-z_-]{33}/g, // Google API Key pattern
  /key-[0-9a-zA-Z]{32}/g,     // Generic API keys
  /sk_live_[0-9a-zA-Z]{24}/g, // Stripe Secret Key
  /firebaseio\.com/g
];

const IGNORE_DIRS = ['node_modules', '.git', '.next', 'build', 'dist'];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        scanDir(fullPath);
      }
    } else if (stat.isFile() && !file.endsWith('.lock') && !file.endsWith('.png')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          console.log(`[ALERT] Potential secret found in: ${fullPath}`);
        }
      }
    }
  }
}

console.log('Initiating repository secret scan...');
scanDir('.');
console.log('Scan complete.');