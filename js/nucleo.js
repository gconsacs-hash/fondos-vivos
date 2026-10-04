/* nucleo.js - utilidades compartidas: azar con semilla, color, ruido, descargas */
(function (global) {
  'use strict';

  /* ---------- azar reproducible ---------- */

  function rng(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function semillaDe(texto) {
    let h = 2166136261 >>> 0;
    const s = String(texto);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function semillaNueva() {
    return (Math.random() * 0xFFFFFFFF) >>> 0;
  }

  /* ---------- números ---------- */

  const lerp = (a, b, t) => a + (b - a) * t;
  const limita = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* Acercamiento exponencial independiente del framerate. */
  function resorte(actual, objetivo, dt, velocidad) {
    return actual + (objetivo - actual) * limita(dt * velocidad, 0, 1);
  }

  /* ---------- color ---------- */

  function hexARgb(c) {
    if (typeof c !== 'string') return { r: 0, g: 0, b: 0 };
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const n = parseInt(h, 16);
      if (isNaN(n)) return { r: 0, g: 0, b: 0 };
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const m = c.match(/-?\d+(\.\d+)?/g);
    if (m && m.length >= 3) return { r: +m[0], g: +m[1], b: +m[2] };
    return { r: 0, g: 0, b: 0 };
  }

  function rgbAHex(o) {
    const d = (v) => limita(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + d(o.r) + d(o.g) + d(o.b);
  }

  function alfa(c, a) {
    const { r, g, b } = hexARgb(c);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + limita(a, 0, 1) + ')';
  }

  function mezclar(c1, c2, t) {
    const a = hexARgb(c1), b = hexARgb(c2);
    return rgbAHex({
      r: lerp(a.r, b.r, t),
      g: lerp(a.g, b.g, t),
      b: lerp(a.b, b.b, t)
    });
  }

  const aclarar = (c, t) => mezclar(c, '#ffffff', t);
  const oscurecer = (c, t) => mezclar(c, '#000000', t);

  /* Luminancia relativa aproximada, para decidir trazos claros u oscuros. */
  function luz(c) {
    const { r, g, b } = hexARgb(c);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  /* ---------- ruido Perlin 2D con semilla ---------- */

  function ruido2D(semilla) {
    const r = rng(semilla);
    const orden = [];
    for (let i = 0; i < 256; i++) orden.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = orden[i]; orden[i] = orden[j]; orden[j] = t;
    }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = orden[i & 255];

    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    function grad(h, x, y) {
      switch (h & 3) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        default: return -x - y;
      }
    }
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const X = xi & 255, Y = yi & 255;
      const xf = x - xi, yf = y - yi;
      const u = fade(xf), v = fade(yf);
      const aa = p[p[X] + Y], ab = p[p[X] + Y + 1];
      const ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
      const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
      return limita((lerp(x1, x2, v) + 1.5) / 3, 0, 1);
    };
  }

  /* ---------- grano / textura de papel ---------- */

  let patronGrano = null;
  function grano(ctx, w, h, fuerza, rnd) {
    if (typeof document === 'undefined' || !fuerza) return;
    if (!patronGrano) {
      const lado = 160;
      const c = document.createElement('canvas');
      c.width = c.height = lado;
      const cx = c.getContext('2d');
      const img = cx.createImageData(lado, lado);
      const r = rnd || rng(1234);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 110 + Math.floor(r() * 90);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      patronGrano = ctx.createPattern(c, 'repeat');
    }
    if (!patronGrano) return;
    ctx.save();
    ctx.globalAlpha = fuerza;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = patronGrano;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* Viñeta suave en los bordes: ayuda a que los iconos se lean. */
  function vineta(ctx, w, h, fuerza) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + fuerza + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* ---------- descargas ---------- */

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function marcaTiempo() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  const N = {
    rng, semillaDe, semillaNueva,
    lerp, limita, resorte,
    hexARgb, rgbAHex, alfa, mezclar, aclarar, oscurecer, luz,
    ruido2D, grano, vineta,
    descargar, marcaTiempo
  };

  global.N = N;
  if (typeof module !== 'undefined' && module.exports) module.exports = N;
})(typeof window !== 'undefined' ? window : globalThis);
