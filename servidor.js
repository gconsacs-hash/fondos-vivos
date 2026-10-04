/* servidor.js - servidor estático mínimo. Hace falta para los sensores del teléfono
   (sólo funcionan en un origen seguro: localhost cuenta) y para instalar la PWA. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const PUERTO = Number(process.argv[2] || process.env.PUERTO || 3400);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const servidor = http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if (ruta === '/' || ruta === '') ruta = '/index.html';
  const destino = path.join(RAIZ, path.normalize(ruta).replace(/^([/\\])+/, ''));
  if (!destino.startsWith(RAIZ)) {
    res.writeHead(403).end('prohibido');
    return;
  }
  fs.readFile(destino, (err, datos) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('no existe: ' + ruta);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(datos);
  });
});

servidor.listen(PUERTO, () => {
  const red = [];
  try {
    const nets = require('os').networkInterfaces();
    Object.keys(nets).forEach((n) => nets[n].forEach((d) => {
      if (d.family === 'IPv4' && !d.internal) red.push(d.address);
    }));
  } catch (e) { /* sin red */ }
  console.log('Fondos Vivos en http://localhost:' + PUERTO);
  red.forEach((ip) => console.log('  desde el teléfono: http://' + ip + ':' + PUERTO));
});
