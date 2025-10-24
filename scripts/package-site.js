#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const buildSite = require('./build-site');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('');
}

async function main() {
  if (!fs.existsSync(distDir)) {
    buildSite();
  }

  ensureDir(releaseDir);

  const archiveName = `weekend-challenge-${timestamp()}.zip`;
  const archivePath = path.join(releaseDir, archiveName);
  const output = fs.createWriteStream(archivePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', err => {
    if (err.code === 'ENOENT') {
      console.warn(err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', err => {
    throw err;
  });

  archive.directory(distDir, false);
  archive.pipe(output);

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.finalize().catch(reject);
  });

  console.info(`📦 Package created: ${archivePath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
