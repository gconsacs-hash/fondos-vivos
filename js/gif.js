/* gif.js - codificador GIF89a animado (corte por medianas + LZW).
   Sin dependencias: funciona en el navegador y en Node (para las pruebas). */
(function (global) {
  'use strict';

  /* ---------- cuantización por corte de medianas ---------- */

  function muestrear(frames, maxMuestras) {
    const total = frames.reduce((n, f) => n + f.length / 4, 0);
    const paso = Math.max(1, Math.floor(total / maxMuestras));
    const muestras = [];
    let i = 0;
    frames.forEach((f) => {
      for (let p = 0; p < f.length; p += 4, i++) {
        if (i % paso === 0) muestras.push([f[p], f[p + 1], f[p + 2]]);
      }
    });
    return muestras;
  }

  function cajaDe(muestras) {
    const min = [255, 255, 255], max = [0, 0, 0];
    for (let i = 0; i < muestras.length; i++) {
      for (let c = 0; c < 3; c++) {
        const v = muestras[i][c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }
    const rangos = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const eje = rangos.indexOf(Math.max.apply(null, rangos));
    return { muestras, eje, rango: rangos[eje] };
  }

  function cortarMedianas(muestras, maxColores) {
    if (!muestras.length) return [[0, 0, 0]];
    let cajas = [cajaDe(muestras)];
    while (cajas.length < maxColores) {
      let mejor = -1, mejorRango = 0;
      for (let i = 0; i < cajas.length; i++) {
        if (cajas[i].muestras.length > 1 && cajas[i].rango > mejorRango) {
          mejorRango = cajas[i].rango; mejor = i;
        }
      }
      if (mejor < 0) break;
      const caja = cajas[mejor];
      const eje = caja.eje;
      caja.muestras.sort((a, b) => a[eje] - b[eje]);
      const medio = caja.muestras.length >> 1;
      const a = caja.muestras.slice(0, medio);
      const b = caja.muestras.slice(medio);
      if (!a.length || !b.length) { caja.rango = 0; continue; }
      cajas.splice(mejor, 1, cajaDe(a), cajaDe(b));
    }
    return cajas.map((c) => {
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < c.muestras.length; i++) {
        r += c.muestras[i][0]; g += c.muestras[i][1]; b += c.muestras[i][2];
      }
      const n = c.muestras.length || 1;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    });
  }

  /* Convierte los cuadros RGBA a índices sobre una paleta común. */
  function cuantizar(frames, maxColores) {
    const max = Math.min(256, maxColores || 256);
    const colores = cortarMedianas(muestrear(frames, 40000), max);
    const paleta = new Uint8Array(768);
    colores.forEach((c, i) => {
      paleta[i * 3] = c[0]; paleta[i * 3 + 1] = c[1]; paleta[i * 3 + 2] = c[2];
    });
    const cache = new Int16Array(32768).fill(-1);
    function indiceDe(r, g, b) {
      const clave = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let idx = cache[clave];
      if (idx >= 0) return idx;
      let mejor = 0, mejorD = Infinity;
      for (let i = 0; i < colores.length; i++) {
        const dr = r - colores[i][0], dg = g - colores[i][1], db = b - colores[i][2];
        const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (d < mejorD) { mejorD = d; mejor = i; }
      }
      cache[clave] = mejor;
      return mejor;
    }
    const indices = frames.map((f) => {
      const out = new Uint8Array(f.length / 4);
      for (let p = 0, i = 0; p < f.length; p += 4, i++) {
        out[i] = indiceDe(f[p], f[p + 1], f[p + 2]);
      }
      return out;
    });
    return { paleta, indices, nColores: colores.length };
  }

  /* ---------- LZW del GIF ---------- */

  function lzw(indices, minCode) {
    const salida = [];
    const limpiar = 1 << minCode;
    const fin = limpiar + 1;
    let tamCodigo = minCode + 1;
    let siguiente = fin + 1;
    let tabla = new Map();
    let acum = 0, bits = 0;

    function emitir(codigo) {
      acum |= codigo << bits;
      bits += tamCodigo;
      while (bits >= 8) {
        salida.push(acum & 255);
        acum >>= 8;
        bits -= 8;
      }
    }

    emitir(limpiar);
    if (!indices.length) {
      emitir(fin);
      if (bits > 0) salida.push(acum & 255);
      return salida;
    }
    let previo = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const clave = (previo << 8) | k;
      const encontrado = tabla.get(clave);
      if (encontrado !== undefined) {
        previo = encontrado;
        continue;
      }
      emitir(previo);
      if (siguiente === 4096) {
        emitir(limpiar);
        tabla = new Map();
        siguiente = fin + 1;
        tamCodigo = minCode + 1;
      } else {
        if (siguiente >= (1 << tamCodigo)) tamCodigo++;
        tabla.set(clave, siguiente++);
      }
      previo = k;
    }
    emitir(previo);
    emitir(fin);
    if (bits > 0) salida.push(acum & 255);
    return salida;
  }

  /* ---------- armado del archivo ---------- */

  function codificar(op) {
    const ancho = op.ancho, alto = op.alto;
    const retardo = Math.max(2, Math.round((op.retardoMs || 80) / 10)); /* centésimas */
    const { paleta, indices } = cuantizar(op.frames, op.maxColores || 256);
    const bytes = [];
    const u8 = (v) => bytes.push(v & 255);
    const u16 = (v) => { bytes.push(v & 255); bytes.push((v >> 8) & 255); };
    const texto = (s) => { for (let i = 0; i < s.length; i++) u8(s.charCodeAt(i)); };

    texto('GIF89a');
    u16(ancho); u16(alto);
    u8(0xF7);          /* tabla global, 256 colores */
    u8(0); u8(0);

    for (let i = 0; i < 768; i++) u8(paleta[i]);

    /* repetición infinita */
    u8(0x21); u8(0xFF); u8(11);
    texto('NETSCAPE2.0');
    u8(3); u8(1); u16(op.repetir === undefined ? 0 : op.repetir); u8(0);

    indices.forEach((idx) => {
      u8(0x21); u8(0xF9); u8(4);
      u8(0x04);            /* sin transparencia, descartar al fondo anterior */
      u16(retardo);
      u8(0); u8(0);

      u8(0x2C);
      u16(0); u16(0); u16(ancho); u16(alto);
      u8(0);

      u8(8);
      const datos = lzw(idx, 8);
      for (let p = 0; p < datos.length; p += 255) {
        const trozo = datos.slice(p, p + 255);
        u8(trozo.length);
        for (let i = 0; i < trozo.length; i++) u8(trozo[i]);
      }
      u8(0);
    });

    u8(0x3B);
    return new Uint8Array(bytes);
  }

  const GIF = { codificar, cuantizar, lzw, cortarMedianas };
  global.GIF = GIF;
  if (typeof module !== 'undefined' && module.exports) module.exports = GIF;
})(typeof window !== 'undefined' ? window : globalThis);
