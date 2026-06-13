'use strict';

exports.createOrderNo = sequence => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `PO${yyyy}${mm}${dd}${String(sequence).padStart(4, '0')}`;
};
