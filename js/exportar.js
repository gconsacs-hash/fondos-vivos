/* exportar.js - PNG para fondo fijo, GIF y WebM para fondo animado. */
(function (global) {
  'use strict';

  const { descargar, marcaTiempo } = global.N;

  const resoluciones = [
    { id: 'a52', nombre: 'Galaxy A52 · 1080×2400', w: 1080, h: 2400 },
    { id: 'fhd', nombre: 'Full HD · 1080×1920', w: 1080, h: 1920 },
    { id: 'qhd', nombre: 'QHD+ · 1440×3200', w: 1440, h: 3200 },
    { id: 'iphone', nombre: 'iPhone · 1284×2778', w: 1284, h: 2778 },
    { id: 'tablet', nombre: 'Tablet · 1600×2560', w: 1600, h: 2560 }
  ];

  function resolucionPantalla() {
    const d = global.devicePixelRatio || 1;
    return {
      id: 'pantalla',
      nombre: 'Esta pantalla · ' + Math.round(screen.width * d) + '×' + Math.round(screen.height * d),
      w: Math.round(screen.width * d),
      h: Math.round(screen.height * d)
    };
  }

  function nuevoLienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function esperar(ms) {
    return new Promise((r) => setTimeout(r, ms || 0));
  }

  /* dibujarEn(ctx, w, h, t) con t en 0..1 */
  function png(dibujarEn, w, h, nombre) {
    const c = nuevoLienzo(w, h);
    dibujarEn(c.getContext('2d'), w, h, 0);
    return new Promise((res) => {
      c.toBlob((b) => {
        descargar(b, (nombre || 'fondo') + '-' + marcaTiempo() + '.png');
        res(b);
      }, 'image/png');
    });
  }

  async function gif(op) {
    const w = op.w, h = op.h;
    const cuadros = op.cuadros || 18;
    const c = nuevoLienzo(w, h);
    const ctx = c.getContext('2d');
    const frames = [];
    for (let i = 0; i < cuadros; i++) {
      op.dibujarEn(ctx, w, h, i / cuadros);
      frames.push(ctx.getImageData(0, 0, w, h).data);
      if (op.onProgreso) op.onProgreso((i + 1) / cuadros * 0.6, 'cuadro ' + (i + 1) + '/' + cuadros);
      await esperar(0);
    }
    if (op.onProgreso) op.onProgreso(0.65, 'reduciendo colores…');
    await esperar(16);
    const bytes = global.GIF.codificar({
      ancho: w, alto: h, frames,
      retardoMs: op.retardoMs || 80,
      maxColores: op.maxColores || 200
    });
    if (op.onProgreso) op.onProgreso(1, 'listo');
    const blob = new Blob([bytes], { type: 'image/gif' });
    descargar(blob, (op.nombre || 'fondo') + '-' + marcaTiempo() + '.gif');
    return blob;
  }

  function soportaWebm() {
    return typeof global.MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  function webm(op) {
    return new Promise((res, rej) => {
      if (!soportaWebm()) { rej(new Error('este navegador no puede grabar vídeo')); return; }
      const w = op.w, h = op.h;
      const c = nuevoLienzo(w, h);
      const ctx = c.getContext('2d');
      const fps = op.fps || 30;
      const segundos = op.segundos || 5;
      const total = fps * segundos;
      const flujo = c.captureStream(fps);
      const tipos = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const tipo = tipos.find((t) => global.MediaRecorder.isTypeSupported(t)) || '';
      const grab = new global.MediaRecorder(flujo, tipo ? { mimeType: tipo, videoBitsPerSecond: 8000000 } : undefined);
      const trozos = [];
      grab.ondataavailable = (e) => { if (e.data && e.data.size) trozos.push(e.data); };
      grab.onstop = () => {
        const blob = new Blob(trozos, { type: 'video/webm' });
        descargar(blob, (op.nombre || 'fondo') + '-' + marcaTiempo() + '.webm');
        res(blob);
      };
      grab.start();
      let i = 0;
      const paso = () => {
        op.dibujarEn(ctx, w, h, i / total);
        if (op.onProgreso) op.onProgreso(i / total, 'grabando ' + Math.round(i / fps) + 's/' + segundos + 's');
        i++;
        if (i <= total) setTimeout(paso, 1000 / fps);
        else setTimeout(() => grab.stop(), 200);
      };
      paso();
    });
  }

  global.Exportar = { resoluciones, resolucionPantalla, png, gif, webm, soportaWebm, nuevoLienzo };
})(typeof window !== 'undefined' ? window : globalThis);
