#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const buildConfig = require('./build-config');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyEntry(srcRelative, destRelative) {
  const src = path.join(rootDir, srcRelative);
  const dest = path.join(distDir, destRelative || srcRelative);
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
}

function main() {
  buildConfig();

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  ensureDir(distDir);

  const files = ['index.html', 'robots.txt', 'sitemap.xml'];
  files.forEach(file => copyEntry(file));

  const directories = ['assets', 'pages', 'config', 'docs'];
  directories.forEach(dir => copyEntry(dir));

  const verifyFiles = fs
    .readdirSync(rootDir)
    .filter(name => name.startsWith('MP_verify_') && name.endsWith('.txt'));
  verifyFiles.forEach(copyEntry);

  copyEntry(path.join('pages', 'commitment-letter.html'), 'commitment-letter.html');

  console.info('✅ Build output written to dist/');
}

if (require.main === module) {
  main();
}

module.exports = main;
