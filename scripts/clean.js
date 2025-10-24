#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const targets = ['dist', 'release'];

targets.forEach(target => {
  const resolved = path.join(rootDir, target);
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { recursive: true, force: true });
    console.info(`🧹 Removed ${target}/`);
  }
});
