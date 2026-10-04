/* retrato.js - toma una foto y la hace reaccionar: parpadeo, mirada y sonrisa.
   No usa IA: el usuario marca los dos ojos y la boca, y se deforma la imagen por zonas. */
(function (global) {
  'use strict';

  const { limita, lerp, alfa, mezclar, oscurecer } = global.N;

  function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function crear() {
    const r = {
      img: null,
      ancho: 0, alto: 0,
      /* puntos en coordenadas normalizadas de la imagen (0..1) */
      puntos: { ojoI: null, ojoD: null, boca: null },
      fuerza: 1,
      /* qué parte de la distancia entre ojos ocupa cada ojo: una foto real ronda 0,26
         y un rostro de anime necesita bastante más */
      tamanoOjo: 0.3,
      desplazamiento: 0,
      muestras: null,
      cacheLienzos: {}
    };

    r.listo = function () {
      return !!(r.img && r.puntos.ojoI && r.puntos.ojoD && r.puntos.boca);
    };

    r.cargar = function (archivo) {
      return new Promise((res, rej) => {
        const url = URL.createObjectURL(archivo);
        const im = new Image();
        im.onload = () => {
          r.img = im;
          r.ancho = im.naturalWidth;
          r.alto = im.naturalHeight;
          r.puntos = { ojoI: null, ojoD: null, boca: null };
          prepararMuestras();
          res(r);
        };
        im.onerror = () => rej(new Error('no se pudo abrir la imagen'));
        im.src = url;
      });
    };

    /* Copia reducida para leer colores de piel sin releer la imagen grande. */
    function prepararMuestras() {
      const escala = Math.min(1, 480 / Math.max(r.ancho, r.alto));
      const c = lienzo(r.ancho * escala, r.alto * escala);
      const cx = c.getContext('2d');
      cx.drawImage(r.img, 0, 0, c.width, c.height);
      try {
        r.muestras = { datos: cx.getImageData(0, 0, c.width, c.height), w: c.width, h: c.height };
      } catch (e) {
        r.muestras = null; /* imagen de otro origen: se usa un tono por defecto */
      }
    }

    function colorEn(nx, ny) {
      if (!r.muestras) return '#c89b82';
      const { datos, w, h } = r.muestras;
      const x = limita(Math.round(nx * w), 1, w - 2);
      const y = limita(Math.round(ny * h), 1, h - 2);
      let sr = 0, sg = 0, sb = 0, n = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const p = ((y + j) * w + (x + i)) * 4;
          sr += datos.data[p]; sg += datos.data[p + 1]; sb += datos.data[p + 2];
          n++;
        }
      }
      return global.N.rgbAHex({ r: sr / n, g: sg / n, b: sb / n });
    }

    /* Encuadre de una imagen sin marcar: llena la pantalla con algo de holgura
       y se mueve un poco con la inclinación, sin dejar bordes a la vista. */
    function encuadreSimple(w, h, s) {
      const holgura = 1.06;
      const esc = Math.max(w / r.ancho, h / r.alto) * holgura;
      const dw = r.ancho * esc, dh = r.alto * esc;
      const margenX = (dw - w) / 2, margenY = (dh - h) / 2;
      const px = limita(s ? s.mirX : 0, -1, 1) * Math.min(margenX, w * 0.03);
      const py = limita(s ? s.mirY : 0, -1, 1) * Math.min(margenY, h * 0.02);
      return { esc, dw, dh, ox: (w - dw) / 2 - px, oy: (h - dh) / 2 - py };
    }

    /* Geometría de la escena: dónde cae la foto dentro del fondo. */
    function geometria(w, h) {
      const pI = r.puntos.ojoI, pD = r.puntos.ojoD, pB = r.puntos.boca;
      const dOjosNorm = Math.hypot((pD.x - pI.x) * r.ancho, (pD.y - pI.y) * r.alto);
      const objetivo = w * 0.36;
      let escala = objetivo / Math.max(1, dOjosNorm);
      escala = Math.max(escala, w / r.ancho, h / r.alto);
      const centro = {
        x: (pI.x + pD.x) / 2 * r.ancho,
        y: ((pI.y + pD.y) / 2 * 0.65 + pB.y * 0.35) * r.alto
      };
      const dx = w / 2 - centro.x * escala;
      const dy = h * (0.42 + r.desplazamiento) - centro.y * escala;
      const aPantalla = (p) => ({ x: p.x * r.ancho * escala + dx, y: p.y * r.alto * escala + dy });
      return {
        escala, dx, dy, aPantalla,
        ojoI: aPantalla(pI), ojoD: aPantalla(pD), boca: aPantalla(pB),
        dOjos: dOjosNorm * escala
      };
    }

    function aux(clave, w, h) {
      const k = clave + '|' + Math.round(w) + 'x' + Math.round(h);
      if (!r.cacheLienzos[k]) r.cacheLienzos[k] = lienzo(w, h);
      return r.cacheLienzos[k];
    }

    /* Difumina los bordes de un parche para que no se note el recorte. */
    function enmascarar(cx, w, h, suavidad) {
      cx.globalCompositeOperation = 'destination-in';
      const g = cx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(limita(1 - suavidad, 0, 0.95), 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g;
      ctxRect(cx, w, h);
      cx.globalCompositeOperation = 'source-over';
    }
    function ctxRect(cx, w, h) {
      cx.beginPath();
      cx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      cx.fill();
    }

    /* ---- ojos ---- */

    function dibujarOjo(ctx, g, centro, pOjo, s, lado) {
      const rOjo = g.dOjos * r.tamanoOjo;
      const lado2 = rOjo * 2;
      const c = aux('ojo' + lado, lado2, lado2);
      const cx = c.getContext('2d');
      cx.clearRect(0, 0, lado2, lado2);

      /* la zona del ojo, corrida un poco para que la mirada siga al dedo */
      const dx = s.mirX * rOjo * 0.13 * r.fuerza;
      const dy = s.mirY * rOjo * 0.10 * r.fuerza;
      const sx = (centro.x - rOjo - g.dx) / g.escala;
      const sy = (centro.y - rOjo - g.dy) / g.escala;
      const sw = lado2 / g.escala;
      cx.drawImage(r.img, sx, sy, sw, sw, dx, dy, lado2, lado2);

      /* párpado: tono de piel tomado justo por encima del parche del ojo.
         La distancia depende del tamaño del ojo; si fuera fija, en un rostro de
         anime el punto caería dentro del propio ojo y el párpado saldría azul. */
      const altoOjoNorm = (rOjo / g.escala) / r.alto;
      const piel = colorEn(pOjo.x, Math.max(0.01, pOjo.y - altoOjoNorm * 1.3));
      const cierre = limita(s.parpadeo, 0, 1);
      if (cierre > 0.02) {
        /* el párpado baja hasta tapar todo el parche: cerrado del todo es cerrado */
        const borde = lado2 * (0.06 + 0.94 * cierre);
        cx.fillStyle = piel;
        cx.fillRect(0, 0, lado2, borde);
        /* pestaña en el filo del párpado */
        cx.strokeStyle = alfa(oscurecer(piel, 0.6), 0.9);
        cx.lineWidth = Math.max(1, lado2 * 0.035);
        cx.beginPath();
        cx.moveTo(lado2 * 0.06, borde - lado2 * 0.02);
        cx.quadraticCurveTo(lado2 * 0.5, borde + lado2 * 0.05, lado2 * 0.94, borde - lado2 * 0.02);
        cx.stroke();
        /* sombra del pliegue */
        const sombra = cx.createLinearGradient(0, 0, 0, borde);
        sombra.addColorStop(0, alfa(oscurecer(piel, 0.35), 0.5));
        sombra.addColorStop(1, alfa(oscurecer(piel, 0.1), 0));
        cx.fillStyle = sombra;
        cx.fillRect(0, 0, lado2, borde);
      }

      /* poco difuminado: si el borde suave empieza muy adentro, el párpado no
         alcanza a tapar el ojo y queda un anillo del iris a la vista */
      enmascarar(cx, lado2, lado2, 0.22);
      ctx.drawImage(c, centro.x - rOjo, centro.y - rOjo);
    }

    /* ---- boca ---- */

    function dibujarBoca(ctx, g, s) {
      const anchoZ = g.dOjos * 1.5;
      const altoZ = g.dOjos * 1.0;
      const c = aux('boca', anchoZ, altoZ);
      const cx = c.getContext('2d');
      cx.clearRect(0, 0, c.width, c.height);

      const x0 = g.boca.x - anchoZ / 2;
      const y0 = g.boca.y - altoZ * 0.45;
      const amp = altoZ * 0.085 * r.fuerza;
      const cols = Math.min(240, Math.round(c.width));
      const paso = c.width / cols;

      for (let i = 0; i < cols; i++) {
        const dxDest = i * paso;
        const t = (dxDest + paso / 2) / c.width * 2 - 1;      /* -1..1 */
        const ventana = Math.cos(limita(t, -1, 1) * Math.PI / 2); /* 0 en los bordes */
        const sonrisa = -s.sonrisa * amp * (t * t) * ventana;
        const apertura = s.apertura * amp * 1.5 * (1 - t * t) * ventana;
        const dyDest = sonrisa + apertura * 0.35;
        const estira = 1 + s.apertura * 0.22 * (1 - t * t) * ventana;

        const sxCol = (x0 + dxDest - g.dx) / g.escala;
        const syCol = (y0 - g.dy) / g.escala;
        const swCol = paso / g.escala;
        const shCol = c.height / g.escala;
        cx.drawImage(r.img, sxCol, syCol, swCol, shCol,
          dxDest, dyDest, paso + 1, c.height * estira);
      }

      enmascarar(cx, c.width, c.height, 0.5);
      ctx.drawImage(c, x0, y0);
    }

    /* ---- escena completa ---- */

    r.dibujar = function (ctx, w, h, s, receta) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      if (!r.img) { ctx.restore(); return; }

      if (!r.listo()) {
        const q = encuadreSimple(w, h, s);
        ctx.drawImage(r.img, q.ox, q.oy, q.dw, q.dh);
        ctx.restore();
        return;
      }

      const g = geometria(w, h);
      const desvX = s.mirX * Math.min(w, h) * 0.010;
      const desvY = s.mirY * Math.min(w, h) * 0.006;

      /* fondo: la misma foto ampliada y difuminada, para que nunca queden bordes */
      ctx.save();
      try { ctx.filter = 'blur(' + (Math.min(w, h) * 0.05) + 'px) brightness(0.65)'; } catch (e) { /* nada */ }
      const escF = Math.max(w / r.ancho, h / r.alto) * 1.25;
      ctx.drawImage(r.img, (w - r.ancho * escF) / 2, (h - r.alto * escF) / 2, r.ancho * escF, r.alto * escF);
      ctx.restore();
      try { ctx.filter = 'none'; } catch (e) { /* nada */ }

      ctx.save();
      ctx.translate(desvX, desvY);
      ctx.drawImage(r.img, g.dx, g.dy, r.ancho * g.escala, r.alto * g.escala);
      dibujarOjo(ctx, g, g.ojoI, r.puntos.ojoI, s, 'I');
      dibujarOjo(ctx, g, g.ojoD, r.puntos.ojoD, s, 'D');
      dibujarBoca(ctx, g, s);
      ctx.restore();

      /* viñeta y aviso de ánimo visual (chispas, corazones) */
      global.N.vineta(ctx, w, h, 0.35);
      if (receta && receta.brillo) {
        const gr = ctx.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, alfa('#ffffff', 0.10));
        gr.addColorStop(1, alfa('#000000', 0.18));
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    };

    /* Convierte un clic en el lienzo a coordenadas de la imagen. */
    r.marcarDesdeLienzo = function (cual, px, py, w, h, s) {
      if (!r.img) return;
      let nx, ny;
      if (r.listo()) {
        const g = geometria(w, h);
        nx = (px - g.dx) / g.escala / r.ancho;
        ny = (py - g.dy) / g.escala / r.alto;
      } else {
        /* se deshace exactamente el mismo encuadre que se está viendo */
        const q = encuadreSimple(w, h, s);
        nx = (px - q.ox) / q.esc / r.ancho;
        ny = (py - q.oy) / q.esc / r.alto;
      }
      r.puntos[cual] = { x: limita(nx, 0, 1), y: limita(ny, 0, 1) };
    };

    r.exportarPuntos = function () {
      return JSON.parse(JSON.stringify(r.puntos));
    };

    return r;
  }

  global.Retrato = { crear };
  void lerp; void mezclar;
})(typeof window !== 'undefined' ? window : globalThis);
