#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const args = process.argv.slice(2);

function getArg(flag, fallback) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return fallback;
}

const rootDir = path.join(__dirname, '..');
const defaultSource = path.join(
  rootDir,
  'data',
  'raw',
  '2025',
  'edition-01',
  '一块钱周末挑战-第1期-报名中!-FLlZ-表单反馈导出_2025-11-01.xlsx'
);
const defaultOutput = path.join(rootDir, 'assets', 'data', 'supporters.json');

const sourcePath = path.resolve(getArg('--source', defaultSource));
const outputPath = path.resolve(getArg('--output', defaultOutput));
const minAmount = Number.parseFloat(getArg('--min', '10')) || 10;

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Source file not found: ${sourcePath}`);
  process.exit(1);
}

const workbook = xlsx.readFile(sourcePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { range: 1, raw: false });

const SUPPORTED_STATUS = new Set(['支付成功', '已支付', '已完成']);

const aggregate = new Map();

rows.forEach(row => {
  const name = (row['姓名'] || '').trim();
  const status = (row['订单-支付状态'] || '').trim();
  const amount = Number.parseFloat(row['订单-支付金额']);
  if (!name || Number.isNaN(amount)) return;
  if (SUPPORTED_STATUS.size && !SUPPORTED_STATUS.has(status) && status) return;

  const key = name;
  const current = aggregate.get(key) || 0;
  aggregate.set(key, current + amount);
});

const supporters = Array.from(aggregate.entries())
  .map(([name, total]) => ({ name, amount: Number(total.toFixed(2)) }))
  .filter(entry => entry.amount >= minAmount)
  .sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.name.localeCompare(b.name, 'zh-Hans', { sensitivity: 'base' });
  });

fs.writeFileSync(outputPath, `${JSON.stringify(supporters, null, 2)}\n`, 'utf-8');

console.info(`✅ Generated ${supporters.length} supporters → ${outputPath}`);
