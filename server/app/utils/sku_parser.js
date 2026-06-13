'use strict';

const { barcodeProductCode, requiredString } = require('./validators');

exports.parseSkuContent = content => {
  const lines = String(content || '').split(/\r?\n/);
  const items = [];
  const errors = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const parsed = parseLine(line);
    if (!parsed) {
      errors.push({ line: index + 1, reason: '格式应为：型号 条码 重量' });
      return;
    }
    items.push(parsed);
  });

  return { items, errors, total: lines.filter(line => line.trim()).length };
};

function parseLine(line) {
  const tabParts = line.split('\t').map(part => part.trim()).filter(Boolean);
  if (tabParts.length >= 3) return parseParts(tabParts);
  return parseParts(line.trim().split(/\s+/));
}

function parseParts(parts) {
  if (parts.length < 3) return null;
  const rawWeight = parts[parts.length - 1];
  const rollCode = parts[parts.length - 2];
  const model = parts.slice(0, -2).join(' ');
  const weight = Number(rawWeight);

  if (!isValidRow({ model, rollCode, weight })) return null;
  return {
    model,
    roll_code: rollCode,
    weight,
    product_code: barcodeProductCode(rollCode),
  };
}

function isValidRow({ model, rollCode, weight }) {
  if (!requiredString(model) || !requiredString(rollCode)) return false;
  if (!/^[A-Za-z0-9]+$/.test(rollCode) || rollCode.length < 3) return false;
  return Number.isFinite(weight) && weight > 0;
}
