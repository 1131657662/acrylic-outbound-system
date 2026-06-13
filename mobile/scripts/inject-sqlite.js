// 构建后注入 SQLite 模块到 manifest.json
// uni-app Vite 构建会丢弃 app-plus.modules 配置，此脚本补回

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'dist', 'build', 'app', 'manifest.json');

try {
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  data.plus = data.plus || {};
  data.plus.modules = { SQLite: {} };
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('[postbuild] SQLite module injected into manifest.json');
} catch (err) {
  console.error('[postbuild] Failed to inject SQLite:', err.message);
  process.exit(1);
}
