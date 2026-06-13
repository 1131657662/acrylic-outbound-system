'use strict';

exports.requiredString = value => typeof value === 'string' && value.trim().length > 0;

exports.positiveInteger = value => Number.isInteger(value) && value > 0;

exports.barcodeProductCode = rollCode => {
  if (!exports.requiredString(rollCode) || rollCode.trim().length < 3) return '';
  return rollCode.trim().slice(0, 3);
};
