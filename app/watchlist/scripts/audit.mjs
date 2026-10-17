// scripts/audit.mjs
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

const SCAN_CONFIG = {
  requiredDirectories: [
    'app',
    'app/watchlist',
    'app/reviews',
    'components',
    'hooks'
  ],
  requiredFiles: [
    'app/watchlist/page.jsx',
    'app/reviews/page.jsx',
    'firebase.js',
    'tailwind.config.js',
    'package.json'
  ],
  envKeys: [
    'NEXT_PUBLIC_TMDB_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ]
};

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}   SCENESENSE STUDIO // AUTONOMOUS SYSTEM AUDIT SCANNER    ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}\n`);

let passedChecks = 0;
let totalChecks = 0;

function evaluate(label, condition, warnOnly = false) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(` [${colors.green}PASS${colors.reset}] ${label}`);
  } else {
    const status = warnOnly ? `${colors.yellow}WARN` : `${colors.red}FAIL`;
    console.log(` [${status}${colors.reset}] ${label}`);
  }
}

// 1. Directory Structure Scan
console.log(`${colors.bold}--- SECTOR 01: DIRECTORY TOPOLOGY ---${colors.reset}`);
SCAN_CONFIG.requiredDirectories.forEach(dir => {
  const fullPath = path.join(ROOT_DIR, dir);
  evaluate(`Directory presence: /${dir}`, fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory());
});

// 2. Critical Files Scan
console.log(`\n${colors.bold}--- SECTOR 02: CRITICAL ENTRYPOINT ARTIFACTS ---${colors.reset}`);
SCAN_CONFIG.requiredFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, file);
  evaluate(`File integrity: ${file}`, fs.existsSync(fullPath));
});

// 3. Environment Secret Variables Scan
console.log(`\n${colors.bold}--- SECTOR 03: TELEMETRY & API KEYS (.env.local) ---${colors.reset}`);
const envPath = path.join(ROOT_DIR, '.env.local');
const envExists = fs.existsSync(envPath);
evaluate('Config file existence: .env.local', envExists, true);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  SCAN_CONFIG.envKeys.forEach(k => {
    evaluate(`Environment Key definition: ${k}`, envContent.includes(k), true);
  });
}

// 4. Code Pattern Scans (Watchlist & Reviews)
console.log(`\n${colors.bold}--- SECTOR 04: REACT & TAILWIND STACK INTEGRITY ---${colors.reset}`);

const watchlistPath = path.join(ROOT_DIR, 'app/watchlist/page.jsx');
if (fs.existsSync(watchlistPath)) {
  const content = fs.readFileSync(watchlistPath, 'utf8');
  evaluate('Watchlist: Client Directive ("use client")', content.includes('"use client"') || content.includes("'use client'"));
  evaluate('Watchlist: Pagination Logic (ITEMS_PER_PAGE)', content.includes('ITEMS_PER_PAGE'));
  evaluate('Watchlist: Dual Viewport Controller (grid | list)', content.includes('viewMode'));
  evaluate('Watchlist: Clean Artwork (No absolute badge overlap)', !content.includes('top-2.5 right-10 bg-black/85'));
}

const reviewsPath = path.join(ROOT_DIR, 'app/reviews/page.jsx');
if (fs.existsSync(reviewsPath)) {
  const content = fs.readFileSync(reviewsPath, 'utf8');
  evaluate('Reviews: Client Directive ("use client")', content.includes('"use client"') || content.includes("'use client'"));
  evaluate('Reviews: High-Layer Modal Stacking (z-[9999])', content.includes('z-[9999]'));
  evaluate('Reviews: Body Scroll Lock Effect (overflow = "hidden")', content.includes("overflow = 'hidden'") || content.includes('overflow = "hidden"'));
  evaluate('Reviews: Multi-Channel Extraction (Standard Genres)', content.includes('STANDARD_GENRES'));
}

console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
console.log(` SCAN COMPLETE: ${passedChecks}/${totalChecks} Systems Verified Operational.`);
console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}\n`);