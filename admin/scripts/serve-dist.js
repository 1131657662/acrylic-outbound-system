const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const port = Number(process.env.PORT || 8000);
const distDir = path.join(__dirname, '..', 'dist');

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url || '/', `http://127.0.0.1:${port}`).pathname;
  const filePath = pathname === '/' ? path.join(distDir, 'index.html') : path.join(distDir, pathname);
  const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(distDir, 'index.html');

  response.setHeader('Content-Type', contentType(target));
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  fs.createReadStream(target).pipe(response);
});

server.listen(port, () => {
  console.log(`Admin static server listening at http://127.0.0.1:${port}`);
});

function contentType(filePath) {
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}
