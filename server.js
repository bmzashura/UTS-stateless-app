// ============================================
// SIMPLE HTTP SERVER - NODE.JS
// Server sederhana untuk menjalankan aplikasi
// tanpa perlu http-server package
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');

// Konfigurasi port
const PORT = process.env.PORT || 8000;
const HOST = 'localhost';

// MIME types untuk berbagai file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// Buat HTTP server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Default ke index.html jika path root diakses
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Hapus query string jika ada
  filePath = filePath.split('?')[0];

  // Gabung dengan direktori saat ini
  filePath = path.join(__dirname, filePath);

  // Dapatkan file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  
  // Tentukan content type berdasarkan extension
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Cek apakah file ada dan dapat dibaca
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Jika file tidak ada
      if (err.code === 'ENOENT') {
        // Coba redirect ke index.html untuk route yang tidak ada (SPA fallback)
        fs.readFile(path.join(__dirname, 'index.html'), (error, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else if (err.code === 'EISDIR') {
        // Jika path adalah folder, redirect ke index.html di folder tersebut
        fs.readFile(path.join(filePath, 'index.html'), (error, content) => {
          if (error) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>', 'utf-8');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        // Error lainnya
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>500 - Server Error</h1><p>${err}</p>`, 'utf-8');
      }
    } else {
      // File ditemukan, kirim dengan content type yang sesuai
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data, 'utf-8');
    }
  });
});

// Jalankan server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Task Management Dashboard             ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Server sedang berjalan di:`);
  console.log(`  http://${HOST}:${PORT}`);
  console.log('');
  console.log('Tekan Ctrl+C untuk menghentikan server');
  console.log('');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✗ Port ${PORT} sudah digunakan!`);
    console.error('Coba jalankan dengan port berbeda:');
    console.error(`  PORT=3000 node server.js\n`);
  } else {
    console.error('Server Error:', err);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('\n✓ Server dihentikan');
  process.exit(0);
});
