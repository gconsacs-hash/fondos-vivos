/* rostros.js - caras dibujadas por código, con un pequeño motor de ánimo.
   El estado es un objeto plano: se puede actualizar sin navegador (hay pruebas).
   El dibujo supone una luz principal arriba a la izquierda: de ahí salen el
   volumen del cuerpo, la luz de borde, los reflejos del ojo y las sombras. */
(function (global) {
  'use strict';

  const { alfa, mezclar, aclarar, oscurecer, limita, resorte, luz } = global.N;

  const TAU = Math.PI * 2;
  const LUZ = { x: -0.45, y: -0.6 };

  /* ---------- estado y ánimo ---------- */

  function crearEstado() {
    return {
      t: 0,
      parpadeo: 0, proxParpadeo: 2.5,
      mirX: 0, mirY: 0,
      sonrisa: 0.35, apertura: 0,
      rubor: 0, ceja: 0,
      inclin: 0, flotar: 0,
      sorpresa: 0, mareo: 0, amor: 0, dormido: 0, chispa: 0,
      animo: 'neutral',
      particulas: []
    };
  }

  function decidirAnimo(s, e) {
    if (s.mareo > 0.25) return 'mareado';
    if (s.amor > 0.2) return 'enamorado';
    if (s.sorpresa > 0.35) return 'sorprendido';
    if (e.cargando) return 'energico';
    if (e.bateria !== null && e.bateria !== undefined && e.bateria < 0.18 && !e.cargando) return 'bajon';
    if (e.volumen > 0.22) return 'cantando';
    const noche = e.hora >= 23 || e.hora < 6;
    if ((noche && e.inactivo > 4) || e.inactivo > 25) return 'dormido';
    if (e.puntero && e.puntero.activo) return 'feliz';
    if (e.inactivo > 10) return 'aburrido';
    return 'neutral';
  }

  function actualizar(s, dt, entradas) {
    const e = Object.assign({
      inclinX: 0, inclinY: 0, puntero: null, toqueNuevo: false, toqueDoble: false,
      agitado: false, hora: 12, bateria: null, cargando: false, volumen: 0, inactivo: 0
    }, entradas || {});

    dt = limita(dt, 0, 0.1);
    s.t += dt;

    /* impulsos */
    if (e.agitado) s.mareo = 1;
    if (e.toqueNuevo) {
      s.sorpresa = 1;
      s.proxParpadeo = s.t + 0.9;
      if (e.toqueDoble) s.amor = 1;
    }
    s.sorpresa = Math.max(0, s.sorpresa - dt * 1.1);
    s.mareo = Math.max(0, s.mareo - dt * 0.45);
    s.amor = Math.max(0, s.amor - dt * 0.45);

    s.animo = decidirAnimo(s, e);
    const a = s.animo;

    /* objetivos por ánimo */
    let objSonrisa = 0.35, objApertura = 0, objCeja = 0, objRubor = 0, objDormido = 0;
    switch (a) {
      case 'feliz': objSonrisa = 0.9; objRubor = 0.35; objCeja = 0.25; break;
      case 'sorprendido': objSonrisa = 0.1; objApertura = 0.75; objCeja = 1; break;
      case 'enamorado': objSonrisa = 1; objRubor = 1; objCeja = 0.4; break;
      case 'energico': objSonrisa = 0.8; objApertura = 0.25; objCeja = 0.6; break;
      case 'bajon': objSonrisa = -0.7; objCeja = -0.5; break;
      case 'cantando': objSonrisa = 0.6; objApertura = limita(e.volumen * 2.2, 0.1, 1); objCeja = 0.3; break;
      case 'mareado': objSonrisa = -0.2; objApertura = 0.35; objCeja = -0.2; break;
      case 'dormido': objSonrisa = 0.2; objApertura = 0.12; objDormido = 1; break;
      case 'aburrido': objSonrisa = -0.1; objCeja = -0.15; break;
      default: objSonrisa = 0.35;
    }

    s.sonrisa = resorte(s.sonrisa, objSonrisa, dt, 5);
    s.apertura = resorte(s.apertura, objApertura, dt, a === 'cantando' ? 16 : 7);
    s.ceja = resorte(s.ceja, objCeja, dt, 6);
    s.rubor = resorte(s.rubor, objRubor, dt, 3.5);
    s.dormido = resorte(s.dormido, objDormido, dt, 1.6);

    /* mirada: dedo > inclinación > paseo lento */
    let tx, ty;
    if (e.puntero && e.puntero.activo) {
      tx = limita(e.puntero.x, -1, 1);
      ty = limita(e.puntero.y, -1, 1);
    } else if (Math.abs(e.inclinX) > 0.04 || Math.abs(e.inclinY) > 0.04) {
      tx = limita(e.inclinX * 1.4, -1, 1);
      ty = limita(e.inclinY * 1.4, -1, 1);
    } else {
      tx = Math.sin(s.t * 0.45) * 0.55 * (a === 'aburrido' ? 1 : 0.4);
      ty = Math.sin(s.t * 0.31 + 1.2) * 0.3 * (a === 'aburrido' ? 1 : 0.4);
    }
    if (a === 'mareado') {
      tx = Math.sin(s.t * 7) * 0.7;
      ty = Math.cos(s.t * 7) * 0.5;
    }
    if (a === 'dormido') { tx = 0; ty = 0.3; }
    s.mirX = resorte(s.mirX, tx, dt, a === 'sorprendido' ? 14 : 6);
    s.mirY = resorte(s.mirY, ty, dt, 6);

    /* inclinación del cuerpo y flote */
    const objInclin = limita(e.inclinX, -1, 1) * 0.18 + (a === 'mareado' ? Math.sin(s.t * 5) * 0.12 : 0);
    s.inclin = resorte(s.inclin, objInclin, dt, 4);
    s.flotar = Math.sin(s.t * (a === 'energico' ? 2.6 : 1.2)) * (a === 'dormido' ? 0.4 : 1);

    /* parpadeo */
    if (a === 'dormido') {
      s.parpadeo = resorte(s.parpadeo, 1, dt, 3);
    } else {
      if (s.t > s.proxParpadeo) {
        s.cerrando = true;
        s.proxParpadeo = s.t + 2.2 + Math.random() * 3.4;
      }
      if (s.cerrando) {
        s.parpadeo += dt * 14;
        if (s.parpadeo >= 1) { s.parpadeo = 1; s.cerrando = false; }
      } else {
        s.parpadeo = Math.max(0, s.parpadeo - dt * 9);
      }
      if (a === 'sorprendido') s.parpadeo = Math.min(s.parpadeo, 0.05);
    }

    /* partículas: corazones, zzz, chispas */
    const nuevas = [];
    for (let i = 0; i < s.particulas.length; i++) {
      const q = s.particulas[i];
      q.vida -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.vida > 0) nuevas.push(q);
    }
    s.particulas = nuevas;
    s.acumPart = (s.acumPart || 0) + dt;
    const cada = a === 'enamorado' ? 0.18 : a === 'dormido' ? 1.4 : a === 'energico' ? 0.5 : 0;
    if (cada && s.acumPart > cada && s.particulas.length < 24) {
      s.acumPart = 0;
      s.particulas.push({
        tipo: a === 'enamorado' ? 'corazon' : a === 'dormido' ? 'zzz' : 'chispa',
        /* nacen por encima de la cabeza, no sobre la cara */
        x: (Math.random() - 0.5) * 1.5,
        y: -0.85 - Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.35 - Math.random() * 0.25,
        vida: 2.2, total: 2.2,
        esc: 0.7 + Math.random() * 0.6
      });
    }
    return s;
  }

  /* ---------- utilidades de dibujo ---------- */

  function sinSombra(ctx) {
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function elipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
  }

  /* Curva con grosor variable: gruesa al centro y afilada en las puntas.
     Queda mucho mejor que un trazo de grosor constante en bocas y cejas. */
  function trazoAfilado(ctx, x0, y0, xc, yc, x1, y1, grosor, pasos) {
    const n = pasos || 16;
    const pt = (u) => ({
      x: (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * xc + u * u * x1,
      y: (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * yc + u * u * y1
    });
    const arriba = [], abajo = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = pt(u);
      const d = pt(Math.min(1, u + 0.001));
      const dx = d.x - p.x, dy = d.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const gr = grosor * Math.sin(Math.PI * limita(u, 0, 1)) * 0.5 + grosor * 0.08;
      arriba.push([p.x - (dy / len) * gr, p.y + (dx / len) * gr]);
      abajo.push([p.x + (dy / len) * gr, p.y - (dx / len) * gr]);
    }
    ctx.beginPath();
    arriba.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    for (let i = abajo.length - 1; i >= 0; i--) ctx.lineTo(abajo[i][0], abajo[i][1]);
    ctx.closePath();
  }

  function gradienteCuerpo(ctx, g, color) {
    const gr = ctx.createRadialGradient(
      g.cx + LUZ.x * g.R * 0.55, g.cy + LUZ.y * g.R * 0.55, g.R * 0.08,
      g.cx, g.cy, g.R * 1.45);
    gr.addColorStop(0, aclarar(color, 0.26));
    gr.addColorStop(0.42, color);
    gr.addColorStop(1, oscurecer(color, 0.34));
    return gr;
  }

  /* Cuerpo con volumen: sombra proyectada, rampa de luz, luz de borde y brillo. */
  function pintarCuerpo(ctx, g, color, trazar, op) {
    op = op || {};
    ctx.save();
    ctx.shadowColor = alfa('#000000', 0.45);
    ctx.shadowBlur = g.R * 0.42;
    ctx.shadowOffsetY = g.R * 0.1;
    trazar();
    ctx.fillStyle = gradienteCuerpo(ctx, g, color);
    ctx.fill();
    ctx.restore();

    ctx.save();
    trazar();
    ctx.clip();

    /* rampa luz → sombra en la dirección de la luz */
    const ramp = ctx.createLinearGradient(
      g.cx + LUZ.x * g.R, g.cy + LUZ.y * g.R,
      g.cx - LUZ.x * g.R * 1.1, g.cy - LUZ.y * g.R * 1.1);
    ramp.addColorStop(0, alfa(aclarar(color, 0.55), 0.38));
    ramp.addColorStop(0.45, alfa(color, 0));
    ramp.addColorStop(1, alfa(oscurecer(color, 0.65), 0.5));
    ctx.fillStyle = ramp;
    ctx.fillRect(g.cx - g.R * 2, g.cy - g.R * 2.4, g.R * 4, g.R * 4.8);

    /* luz de borde en el lado oscuro */
    const rim = ctx.createLinearGradient(
      g.cx + LUZ.x * g.R, g.cy + LUZ.y * g.R,
      g.cx - LUZ.x * g.R, g.cy - LUZ.y * g.R);
    rim.addColorStop(0, alfa(op.rim || '#ffffff', 0));
    rim.addColorStop(0.55, alfa(op.rim || '#ffffff', 0));
    rim.addColorStop(1, alfa(op.rim || '#ffffff', 0.45));
    ctx.strokeStyle = rim;
    ctx.lineWidth = g.R * 0.09;
    trazar();
    ctx.stroke();

    /* brillo especular */
    if (op.brillo !== false) {
      const bx = g.cx + LUZ.x * g.R * 0.62;
      const by = g.cy + LUZ.y * g.R * 0.62;
      const br = ctx.createRadialGradient(bx, by, 0, bx, by, g.R * 0.45);
      br.addColorStop(0, alfa('#ffffff', 0.3));
      br.addColorStop(1, alfa('#ffffff', 0));
      ctx.fillStyle = br;
      elipse(ctx, bx, by, g.R * 0.45, g.R * 0.32, -0.5);
      ctx.fill();
    }
    ctx.restore();
    sinSombra(ctx);
  }

  /* ---------- ojo ---------- */

  function espiral(ctx, x, y, r, color, t) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.18) {
      const rr = (a / (Math.PI * 5)) * r * 1.25;
      const xx = x + Math.cos(a + t * 4) * rr;
      const yy = y + Math.sin(a + t * 4) * rr;
      if (a === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }

  function corazon(ctx, x, y, r, color, brillo) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.75);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.35, x - r * 0.35, y - r * 1.15, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.35, y - r * 1.15, x + r * 1.4, y - r * 0.35, x, y + r * 0.75);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, aclarar(color, 0.35));
    g.addColorStop(1, oscurecer(color, 0.25));
    ctx.fillStyle = g;
    ctx.fill();
    if (brillo !== false) {
      ctx.fillStyle = alfa('#ffffff', 0.6);
      elipse(ctx, x - r * 0.35, y - r * 0.42, r * 0.22, r * 0.14, -0.6);
      ctx.fill();
    }
  }

  /* Ojo completo: cuenca, esclerótica, iris con anillo, pupila, reflejos,
     sombra del párpado y párpado que baja hasta cerrar del todo. */
  function ojo(ctx, x, y, rx, ry, s, op) {
    op = op || {};
    const piel = op.piel || '#d8d8d8';
    const trazo = op.trazo || '#17171b';
    const iris = op.iris || '#2f6f9e';
    const cierre = limita(s.parpadeo, 0, 1);
    const sorpresa = s.sorpresa || 0;
    const h = ry * (1 + sorpresa * 0.18);
    const w = rx * (1 + sorpresa * 0.08);

    /* cuenca: sombra suave alrededor del ojo */
    ctx.save();
    const cuenca = ctx.createRadialGradient(x, y, h * 0.6, x, y, h * 1.9);
    cuenca.addColorStop(0, alfa(oscurecer(piel, 0.45), 0.4));
    cuenca.addColorStop(1, alfa(oscurecer(piel, 0.45), 0));
    ctx.fillStyle = cuenca;
    elipse(ctx, x, y, w * 2, h * 1.9);
    ctx.fill();
    ctx.restore();

    /* esclerótica */
    ctx.save();
    elipse(ctx, x, y, w, h);
    ctx.clip();
    const esc = ctx.createLinearGradient(x, y - h, x, y + h);
    esc.addColorStop(0, '#d9dde4');
    esc.addColorStop(0.45, '#fbfbfa');
    esc.addColorStop(1, '#eceef0');
    ctx.fillStyle = esc;
    ctx.fillRect(x - w, y - h, w * 2, h * 2);

    if (s.mareo > 0.3) {
      espiral(ctx, x, y, Math.min(w, h) * 0.9, trazo, s.t);
    } else if (s.amor > 0.4) {
      corazon(ctx, x + s.mirX * w * 0.2, y + s.mirY * h * 0.2, Math.min(w, h) * 1.05, '#e8365b');
    } else {
      /* iris */
      const ri = Math.min(w, h) * (op.iris === 'ninguno' ? 0 : 0.78) * (1 - sorpresa * 0.1);
      const ix = x + s.mirX * (w - ri) * 0.92;
      const iy = y + s.mirY * (h - ri) * 0.92;
      const gi = ctx.createRadialGradient(ix + ri * 0.22, iy + ri * 0.22, ri * 0.1, ix, iy, ri);
      gi.addColorStop(0, aclarar(iris, 0.45));
      gi.addColorStop(0.55, iris);
      gi.addColorStop(1, oscurecer(iris, 0.5));
      ctx.fillStyle = gi;
      elipse(ctx, ix, iy, ri, ri);
      ctx.fill();
      /* fibras del iris */
      ctx.save();
      ctx.strokeStyle = alfa(aclarar(iris, 0.55), 0.35);
      ctx.lineWidth = Math.max(0.5, ri * 0.07);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + 0.3;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(a) * ri * 0.4, iy + Math.sin(a) * ri * 0.4);
        ctx.lineTo(ix + Math.cos(a) * ri * 0.92, iy + Math.sin(a) * ri * 0.92);
        ctx.stroke();
      }
      ctx.restore();
      /* anillo exterior */
      ctx.strokeStyle = alfa(oscurecer(iris, 0.7), 0.75);
      ctx.lineWidth = Math.max(1, ri * 0.14);
      elipse(ctx, ix, iy, ri * 0.95, ri * 0.95);
      ctx.stroke();
      /* pupila */
      const rp = ri * (op.pupilaAlta ? 0.42 : 0.5) * (1 - sorpresa * 0.25);
      ctx.fillStyle = '#0d0f13';
      elipse(ctx, ix, iy, rp, op.pupilaAlta ? rp * 1.9 : rp);
      ctx.fill();
      /* reflejos */
      ctx.fillStyle = alfa('#ffffff', 0.92);
      elipse(ctx, ix - ri * 0.34, iy - ri * 0.38, ri * 0.3, ri * 0.22, -0.5);
      ctx.fill();
      ctx.fillStyle = alfa('#ffffff', 0.45);
      elipse(ctx, ix + ri * 0.3, iy + ri * 0.34, ri * 0.14, ri * 0.11, -0.5);
      ctx.fill();
    }

    /* sombra que proyecta el párpado sobre el ojo */
    const sp = ctx.createLinearGradient(x, y - h, x, y + h * 0.2);
    sp.addColorStop(0, alfa('#2a2320', 0.42));
    sp.addColorStop(1, alfa('#2a2320', 0));
    ctx.fillStyle = sp;
    ctx.fillRect(x - w, y - h, w * 2, h * 1.2);
    ctx.restore();

    /* párpado */
    if (cierre > 0.015) {
      ctx.save();
      elipse(ctx, x, y + (h * 0.06) * cierre, w * 1.06, h * 1.06);
      ctx.clip();
      const borde = y - h + (2 * h * 1.08) * cierre;
      const gp = ctx.createLinearGradient(x, y - h * 1.1, x, borde);
      gp.addColorStop(0, oscurecer(piel, 0.22));
      gp.addColorStop(0.65, piel);
      gp.addColorStop(1, aclarar(piel, 0.12));
      ctx.fillStyle = gp;
      ctx.fillRect(x - w * 1.2, y - h * 1.3, w * 2.4, borde - (y - h * 1.3));
      /* filo del párpado */
      trazoAfilado(ctx, x - w * 0.98, borde - h * 0.04, x, borde + h * 0.1, x + w * 0.98, borde - h * 0.04, h * 0.17);
      ctx.fillStyle = alfa(oscurecer(trazo, 0.1), 0.9);
      ctx.fill();
      ctx.restore();
    }

    /* línea de pestañas superior, siempre presente: da acabado */
    ctx.save();
    const ly = y - h * (0.92 - cierre * 1.6);
    if (cierre < 0.9) {
      trazoAfilado(ctx, x - w * 1.02, y - h * 0.55, x, ly, x + w * 1.02, y - h * 0.5, h * 0.2);
      ctx.fillStyle = alfa(trazo, 0.85);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- ceja ---------- */

  function ceja(ctx, x, y, w, s, lado, color) {
    const alto = -s.ceja * w * 0.3;
    const incl = s.ceja < 0 ? lado * w * 0.14 : 0;
    ctx.save();
    trazoAfilado(ctx,
      x - w * 0.52, y + alto * 0.25 + incl,
      x + lado * w * 0.05, y + alto - w * 0.1,
      x + w * 0.52, y + alto * 0.45 - incl,
      w * 0.22);
    const g = ctx.createLinearGradient(x - w * 0.5, y, x + w * 0.5, y);
    g.addColorStop(0, alfa(color, 0.55));
    g.addColorStop(0.4, alfa(color, 0.95));
    g.addColorStop(1, alfa(color, 0.7));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /* ---------- boca ---------- */

  function boca(ctx, x, y, w, s, op) {
    op = op || {};
    const color = op.trazo || '#17171b';
    const labio = op.labio || '#b8575f';
    const curva = limita(s.sonrisa, -1, 1);
    const ap = limita(s.apertura, 0, 1);

    if (ap > 0.07) {
      const h = w * 0.72 * ap;
      const yArriba = y - w * 0.03 - curva * w * 0.05;
      ctx.save();
      /* interior */
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, yArriba);
      ctx.quadraticCurveTo(x, yArriba - curva * w * 0.14, x + w * 0.5, yArriba);
      ctx.quadraticCurveTo(x, yArriba + h, x - w * 0.5, yArriba);
      ctx.closePath();
      ctx.clip();
      const gi = ctx.createLinearGradient(x, yArriba, x, yArriba + h);
      gi.addColorStop(0, '#3b1216');
      gi.addColorStop(0.5, '#6b1f26');
      gi.addColorStop(1, '#8c2a30');
      ctx.fillStyle = gi;
      ctx.fillRect(x - w, yArriba - h, w * 2, h * 2.5);
      /* dientes arriba */
      if (ap > 0.3) {
        const gd = ctx.createLinearGradient(x, yArriba, x, yArriba + h * 0.3);
        gd.addColorStop(0, '#ffffff');
        gd.addColorStop(1, '#dfe3e6');
        ctx.fillStyle = gd;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.46, yArriba);
        ctx.quadraticCurveTo(x, yArriba - curva * w * 0.12, x + w * 0.46, yArriba);
        ctx.quadraticCurveTo(x, yArriba + h * 0.34, x - w * 0.46, yArriba);
        ctx.closePath();
        ctx.fill();
      }
      /* lengua */
      const gl = ctx.createRadialGradient(x, yArriba + h * 0.72, h * 0.05, x, yArriba + h * 0.75, h * 0.6);
      gl.addColorStop(0, '#e8707f');
      gl.addColorStop(1, '#b8414f');
      ctx.fillStyle = gl;
      elipse(ctx, x, yArriba + h * 0.82, w * 0.3, h * 0.36);
      ctx.fill();
      ctx.restore();

      /* labios */
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, yArriba);
      ctx.quadraticCurveTo(x, yArriba - curva * w * 0.14, x + w * 0.5, yArriba);
      ctx.quadraticCurveTo(x, yArriba + h, x - w * 0.5, yArriba);
      ctx.closePath();
      ctx.strokeStyle = alfa(oscurecer(labio, 0.35), 0.9);
      ctx.lineWidth = Math.max(1, w * 0.055);
      ctx.stroke();
      ctx.restore();
      return;
    }

    /* boca cerrada: curva afilada con un labio inferior insinuado */
    ctx.save();
    trazoAfilado(ctx,
      x - w * 0.47, y - curva * w * 0.12,
      x, y + curva * w * 0.56,
      x + w * 0.47, y - curva * w * 0.12,
      w * 0.14);
    const g = ctx.createLinearGradient(x, y - w * 0.1, x, y + w * 0.2);
    g.addColorStop(0, oscurecer(color, 0.1));
    g.addColorStop(1, mezclar(color, labio, 0.45));
    ctx.fillStyle = g;
    ctx.fill();
    /* luz bajo el labio inferior */
    if (curva > 0.15) {
      trazoAfilado(ctx,
        x - w * 0.3, y + curva * w * 0.2,
        x, y + curva * w * 0.5 + w * 0.08,
        x + w * 0.3, y + curva * w * 0.2,
        w * 0.05);
      ctx.fillStyle = alfa('#ffffff', 0.18);
      ctx.fill();
    }
    ctx.restore();
  }

  function rubor(ctx, x, y, r, intensidad, color) {
    if (intensidad < 0.05) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, alfa(color || '#ff5f7e', 0.45 * intensidad));
    g.addColorStop(0.6, alfa(color || '#ff5f7e', 0.2 * intensidad));
    g.addColorStop(1, alfa(color || '#ff5f7e', 0));
    ctx.fillStyle = g;
    elipse(ctx, x, y, r, r * 0.72);
    ctx.fill();
  }

  function particulas(ctx, g, s, color) {
    s.particulas.forEach((q) => {
      const vida = q.vida / q.total;
      const x = g.cx + q.x * g.R * 1.5;
      const y = g.cy + q.y * g.R * 1.5;
      const r = g.R * 0.09 * q.esc;
      ctx.save();
      ctx.globalAlpha = limita(vida, 0, 1) * 0.9;
      if (q.tipo === 'corazon') {
        ctx.shadowColor = alfa('#f0476a', 0.7);
        ctx.shadowBlur = r * 1.5;
        corazon(ctx, x, y, r, '#f0476a');
      } else if (q.tipo === 'zzz') {
        ctx.fillStyle = color;
        ctx.font = '600 ' + (r * 2.4).toFixed(0) + 'px system-ui, sans-serif';
        ctx.fillText('z', x, y);
      } else {
        ctx.shadowColor = alfa('#ffe066', 0.9);
        ctx.shadowBlur = r * 2;
        ctx.fillStyle = '#fff2b0';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + s.t;
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a + Math.PI / 4) * r * 0.35, y + Math.sin(a + Math.PI / 4) * r * 0.35);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      sinSombra(ctx);
    });
  }

  /* ---------- montaje de la cara ---------- */

  function colores(p) {
    const cuerpo = p.colores[4];
    const trazo = luz(cuerpo) > 0.55 ? oscurecer(p.colores[1], 0.25) : '#1b1a20';
    /* el iris tiene que leerse sí o sí: se busca un color de la paleta ni muy
       oscuro ni muy lavado, y si no hay ninguno se usa un azul de respaldo */
    let iris = null;
    [p.colores[2], p.colores[3], p.colores[1]].forEach((c) => {
      if (iris) return;
      const l = luz(c);
      if (l > 0.28 && l < 0.78) iris = c;
    });
    if (!iris) iris = '#3f7fae';
    /* que contraste con el cuerpo: si son casi el mismo color, se separa */
    if (Math.abs(luz(iris) - luz(cuerpo)) < 0.12) {
      iris = luz(cuerpo) > 0.5 ? oscurecer(iris, 0.35) : aclarar(iris, 0.35);
    }
    return { cuerpo, trazo, iris };
  }

  /* Coloca ojos, cejas, boca y rubor con las proporciones de cada estilo. */
  function caraBase(ctx, g, s, c, op) {
    op = op || {};
    const sep = g.R * (op.sep || 0.44);
    const ojoY = g.cy - g.R * (op.ojoY === undefined ? 0.08 : op.ojoY);
    const rx = g.R * (op.ojoRx || 0.19);
    const ry = rx * (op.ojoAspecto || 1.12);
    const comun = {
      piel: c.cuerpo, trazo: c.trazo, iris: op.iris || c.iris, pupilaAlta: op.pupilaAlta
    };

    ceja(ctx, g.cx - sep, ojoY - ry * 1.95, g.R * 0.4, s, -1, c.trazo);
    ceja(ctx, g.cx + sep, ojoY - ry * 1.95, g.R * 0.4, s, 1, c.trazo);
    ojo(ctx, g.cx - sep, ojoY, rx, ry, s, comun);
    ojo(ctx, g.cx + sep, ojoY, rx, ry, s, comun);

    if (s.rubor > 0.05) {
      const ry2 = ojoY + ry * 2.1;
      rubor(ctx, g.cx - sep * 1.35, ry2, g.R * 0.3, s.rubor, op.rubor);
      rubor(ctx, g.cx + sep * 1.35, ry2, g.R * 0.3, s.rubor, op.rubor);
    }
    boca(ctx, g.cx, g.cy + g.R * (op.bocaY || 0.46), g.R * (op.bocaW || 0.68), s,
      { trazo: c.trazo, labio: op.labio });
  }

  function rectRedondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------- estilos de rostro ---------- */

  const estilos = [];

  estilos.push({
    id: 'gota', nombre: 'Gota',
    dibujar(ctx, g, s, p) {
      const c = colores(p);
      const trazar = () => {
        /* contorno ondulado suavizado por puntos medios */
        const n = 36, pts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const k = 1 + 0.026 * Math.sin(a * 3 + s.t * 1.1) + 0.015 * Math.sin(a * 5 - s.t * 0.7);
          pts.push([g.cx + Math.cos(a) * g.R * k, g.cy + Math.sin(a) * g.R * 1.07 * k]);
        }
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
        for (let i = 0; i < n; i++) {
          const a = pts[i], b = pts[(i + 1) % n];
          ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
        ctx.closePath();
      };
      pintarCuerpo(ctx, g, c.cuerpo, trazar, { rim: aclarar(p.colores[3], 0.4) });
      caraBase(ctx, g, s, c, {});
      particulas(ctx, g, s, c.trazo);
    }
  });

  estilos.push({
    id: 'kawaii', nombre: 'Bolita',
    dibujar(ctx, g, s, p) {
      const c = colores(p);
      /* orejas detrás del cuerpo */
      [-1, 1].forEach((l) => {
        const ex = g.cx + l * g.R * 0.76, ey = g.cy - g.R * 0.74;
        pintarCuerpo(ctx, { cx: ex, cy: ey, R: g.R * 0.26 }, c.cuerpo,
          () => elipse(ctx, ex, ey, g.R * 0.26, g.R * 0.26), { brillo: false });
        ctx.fillStyle = alfa('#ff8fa6', 0.45);
        elipse(ctx, ex, ey + g.R * 0.02, g.R * 0.13, g.R * 0.13);
        ctx.fill();
      });
      pintarCuerpo(ctx, g, c.cuerpo, () => elipse(ctx, g.cx, g.cy, g.R, g.R * 0.98),
        { rim: aclarar(p.colores[3], 0.45) });
      caraBase(ctx, g, s, c, { ojoRx: 0.23, ojoAspecto: 1.2, sep: 0.46, bocaY: 0.52, bocaW: 0.56 });
      rubor(ctx, g.cx - g.R * 0.62, g.cy + g.R * 0.2, g.R * 0.32, 0.45 + s.rubor * 0.55);
      rubor(ctx, g.cx + g.R * 0.62, g.cy + g.R * 0.2, g.R * 0.32, 0.45 + s.rubor * 0.55);
      particulas(ctx, g, s, c.trazo);
    }
  });

  estilos.push({
    id: 'robot', nombre: 'Robot',
    dibujar(ctx, g, s, p) {
      const c = colores(p);
      const metal = mezclar(c.cuerpo, '#aeb8c2', 0.3);
      const acento = s.animo === 'bajon' ? '#ff6b6b' : s.animo === 'energico' ? '#7cff9b' : '#5de2ff';

      /* antena */
      const ax = g.cx + Math.sin(s.t * 1.6) * g.R * 0.12;
      ctx.save();
      ctx.strokeStyle = oscurecer(metal, 0.35);
      ctx.lineWidth = g.R * 0.055;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy - g.R * 0.86);
      ctx.quadraticCurveTo(g.cx, g.cy - g.R * 1.15, ax, g.cy - g.R * 1.32);
      ctx.stroke();
      ctx.shadowColor = acento;
      ctx.shadowBlur = g.R * 0.35;
      ctx.fillStyle = acento;
      elipse(ctx, ax, g.cy - g.R * 1.35, g.R * 0.1, g.R * 0.1);
      ctx.fill();
      ctx.restore();
      sinSombra(ctx);

      /* cabeza metálica */
      const r = g.R * 0.3;
      const trazar = () => rectRedondo(ctx, g.cx - g.R * 0.96, g.cy - g.R * 0.88, g.R * 1.92, g.R * 1.78, r);
      pintarCuerpo(ctx, g, metal, trazar, { rim: '#ffffff', brillo: false });

      ctx.save();
      trazar();
      ctx.clip();
      /* bisel superior */
      const bis = ctx.createLinearGradient(0, g.cy - g.R * 0.88, 0, g.cy - g.R * 0.4);
      bis.addColorStop(0, alfa('#ffffff', 0.35));
      bis.addColorStop(1, alfa('#ffffff', 0));
      ctx.fillStyle = bis;
      ctx.fillRect(g.cx - g.R, g.cy - g.R * 0.9, g.R * 2, g.R * 0.6);
      /* tornillos */
      [[-0.78, -0.7], [0.78, -0.7], [-0.78, 0.72], [0.78, 0.72]].forEach((o) => {
        const sx = g.cx + o[0] * g.R, sy = g.cy + o[1] * g.R;
        ctx.fillStyle = oscurecer(metal, 0.4);
        elipse(ctx, sx, sy, g.R * 0.055, g.R * 0.055);
        ctx.fill();
        ctx.strokeStyle = alfa('#ffffff', 0.35);
        ctx.lineWidth = g.R * 0.016;
        ctx.beginPath();
        ctx.moveTo(sx - g.R * 0.035, sy - g.R * 0.035);
        ctx.lineTo(sx + g.R * 0.035, sy + g.R * 0.035);
        ctx.stroke();
      });
      ctx.restore();

      /* visor de cristal */
      ctx.save();
      const vx = g.cx - g.R * 0.74, vy = g.cy - g.R * 0.46;
      const vw = g.R * 1.48, vh = g.R * 0.86;
      rectRedondo(ctx, vx, vy, vw, vh, g.R * 0.2);
      const gv = ctx.createLinearGradient(vx, vy, vx, vy + vh);
      gv.addColorStop(0, '#0b1016');
      gv.addColorStop(1, '#16202b');
      ctx.fillStyle = gv;
      ctx.fill();
      rectRedondo(ctx, vx, vy, vw, vh, g.R * 0.2);
      ctx.clip();

      /* ojos luminosos */
      const sep = g.R * 0.38, oy = vy + vh * 0.5;
      [-1, 1].forEach((l) => {
        const ex = g.cx + l * sep;
        const abierto = limita(1 - s.parpadeo, 0, 1);
        ctx.shadowColor = acento;
        ctx.shadowBlur = g.R * 0.3;
        ctx.fillStyle = acento;
        if (abierto < 0.12) {
          rectRedondo(ctx, ex - g.R * 0.2, oy - g.R * 0.025, g.R * 0.4, g.R * 0.05, g.R * 0.025);
          ctx.fill();
        } else {
          const ox = ex + s.mirX * g.R * 0.08;
          const oyy = oy + s.mirY * g.R * 0.06;
          elipse(ctx, ox, oyy, g.R * 0.17, g.R * 0.2 * abierto);
          ctx.fill();
          ctx.fillStyle = alfa('#ffffff', 0.9);
          elipse(ctx, ox - g.R * 0.05, oyy - g.R * 0.06 * abierto, g.R * 0.05, g.R * 0.05 * abierto);
          ctx.fill();
        }
      });
      sinSombra(ctx);
      /* líneas de barrido y reflejo del cristal */
      ctx.strokeStyle = alfa(acento, 0.1);
      ctx.lineWidth = Math.max(1, g.R * 0.012);
      for (let y = vy; y < vy + vh; y += g.R * 0.06) {
        ctx.beginPath();
        ctx.moveTo(vx, y);
        ctx.lineTo(vx + vw, y);
        ctx.stroke();
      }
      const refl = ctx.createLinearGradient(vx, vy, vx + vw * 0.7, vy + vh);
      refl.addColorStop(0, alfa('#ffffff', 0.22));
      refl.addColorStop(0.45, alfa('#ffffff', 0.03));
      refl.addColorStop(1, alfa('#ffffff', 0));
      ctx.fillStyle = refl;
      ctx.fillRect(vx, vy, vw, vh);
      ctx.restore();

      /* marco del visor */
      ctx.strokeStyle = alfa(oscurecer(metal, 0.5), 0.9);
      ctx.lineWidth = g.R * 0.035;
      rectRedondo(ctx, vx, vy, vw, vh, g.R * 0.2);
      ctx.stroke();

      /* boca: rejilla luminosa */
      const by = g.cy + g.R * 0.58;
      ctx.save();
      if (s.apertura > 0.12) {
        ctx.shadowColor = acento;
        ctx.shadowBlur = g.R * 0.2;
        ctx.fillStyle = alfa(acento, 0.85);
        const bh = g.R * 0.26 * s.apertura;
        rectRedondo(ctx, g.cx - g.R * 0.26, by - bh / 2, g.R * 0.52, bh, bh * 0.4);
        ctx.fill();
      } else {
        ctx.strokeStyle = alfa(acento, 0.8);
        ctx.lineWidth = g.R * 0.05;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(g.cx - g.R * 0.24, by - s.sonrisa * g.R * 0.05);
        ctx.quadraticCurveTo(g.cx, by + s.sonrisa * g.R * 0.22, g.cx + g.R * 0.24, by - s.sonrisa * g.R * 0.05);
        ctx.stroke();
      }
      ctx.restore();
      sinSombra(ctx);
      particulas(ctx, g, s, '#cfe9ff');
    }
  });

  estilos.push({
    id: 'gato', nombre: 'Gato',
    dibujar(ctx, g, s, p) {
      const c = colores(p);
      /* orejas */
      [-1, 1].forEach((l) => {
        ctx.save();
        ctx.shadowColor = alfa('#000000', 0.4);
        ctx.shadowBlur = g.R * 0.25;
        ctx.beginPath();
        ctx.moveTo(g.cx + l * g.R * 0.26, g.cy - g.R * 0.72);
        ctx.quadraticCurveTo(g.cx + l * g.R * 0.62, g.cy - g.R * 1.3, g.cx + l * g.R * 0.86, g.cy - g.R * 1.3);
        ctx.quadraticCurveTo(g.cx + l * g.R * 0.95, g.cy - g.R * 0.86, g.cx + l * g.R * 0.92, g.cy - g.R * 0.5);
        ctx.closePath();
        const go = ctx.createLinearGradient(g.cx, g.cy - g.R * 1.3, g.cx, g.cy - g.R * 0.5);
        go.addColorStop(0, aclarar(c.cuerpo, 0.1));
        go.addColorStop(1, oscurecer(c.cuerpo, 0.2));
        ctx.fillStyle = go;
        ctx.fill();
        ctx.restore();
        sinSombra(ctx);
        /* interior rosado */
        ctx.beginPath();
        ctx.moveTo(g.cx + l * g.R * 0.44, g.cy - g.R * 0.78);
        ctx.quadraticCurveTo(g.cx + l * g.R * 0.66, g.cy - g.R * 1.14, g.cx + l * g.R * 0.8, g.cy - g.R * 1.12);
        ctx.quadraticCurveTo(g.cx + l * g.R * 0.84, g.cy - g.R * 0.86, g.cx + l * g.R * 0.82, g.cy - g.R * 0.66);
        ctx.closePath();
        const gi = ctx.createLinearGradient(g.cx, g.cy - g.R * 1.1, g.cx, g.cy - g.R * 0.66);
        gi.addColorStop(0, alfa('#ffb3c6', 0.85));
        gi.addColorStop(1, alfa('#d4798f', 0.5));
        ctx.fillStyle = gi;
        ctx.fill();
      });

      pintarCuerpo(ctx, g, c.cuerpo, () => elipse(ctx, g.cx, g.cy, g.R * 1.03, g.R * 0.94),
        { rim: aclarar(p.colores[3], 0.5) });

      /* mechones del pelaje */
      ctx.save();
      ctx.strokeStyle = alfa(oscurecer(c.cuerpo, 0.3), 0.5);
      ctx.lineWidth = g.R * 0.02;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU;
        const x0 = g.cx + Math.cos(a) * g.R * 0.98;
        const y0 = g.cy + Math.sin(a) * g.R * 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(a + 0.25) * g.R * 0.09, y0 + Math.sin(a + 0.25) * g.R * 0.09);
        ctx.stroke();
      }
      ctx.restore();

      caraBase(ctx, g, s, c, {
        ojoRx: 0.2, ojoAspecto: 1.15, sep: 0.45, ojoY: 0.12,
        pupilaAlta: true, bocaY: 0.6, bocaW: 0.5,
        /* ojos de gato: ámbar o verde, nunca del color del cuerpo */
        iris: luz(c.cuerpo) > 0.5 ? '#2f8f5c' : '#e3a63a'
      });

      /* nariz */
      const nx = g.cx, ny = g.cy + g.R * 0.36;
      ctx.beginPath();
      ctx.moveTo(nx - g.R * 0.085, ny - g.R * 0.05);
      ctx.lineTo(nx + g.R * 0.085, ny - g.R * 0.05);
      ctx.quadraticCurveTo(nx, ny + g.R * 0.1, nx, ny + g.R * 0.1);
      ctx.closePath();
      const gn = ctx.createLinearGradient(nx, ny - g.R * 0.06, nx, ny + g.R * 0.1);
      gn.addColorStop(0, '#ffa7bb');
      gn.addColorStop(1, '#d4647d');
      ctx.fillStyle = gn;
      ctx.fill();

      /* bigotes */
      ctx.save();
      [-1, 1].forEach((l) => {
        for (let i = -1; i <= 1; i++) {
          trazoAfilado(ctx,
            g.cx + l * g.R * 0.24, g.cy + g.R * 0.44 + i * g.R * 0.06,
            g.cx + l * g.R * 0.7, g.cy + g.R * 0.38 + i * g.R * 0.16,
            g.cx + l * g.R * 1.12, g.cy + g.R * 0.3 + i * g.R * 0.26,
            g.R * 0.022);
          ctx.fillStyle = alfa(luz(c.cuerpo) > 0.5 ? '#3a3a40' : '#f2f2f0', 0.6);
          ctx.fill();
        }
      });
      ctx.restore();
      particulas(ctx, g, s, c.trazo);
    }
  });

  estilos.push({
    id: 'luna', nombre: 'Luna',
    dibujar(ctx, g, s, p) {
      const crema = '#f6e6b4';
      /* halo */
      const halo = ctx.createRadialGradient(g.cx, g.cy, g.R * 0.5, g.cx, g.cy, g.R * 2.6);
      halo.addColorStop(0, alfa('#ffe9a8', 0.3));
      halo.addColorStop(0.5, alfa('#ffe9a8', 0.08));
      halo.addColorStop(1, alfa('#ffe9a8', 0));
      ctx.fillStyle = halo;
      ctx.fillRect(g.cx - g.R * 2.8, g.cy - g.R * 2.8, g.R * 5.6, g.R * 5.6);

      const trazar = () => {
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, g.R, 0, TAU);
        ctx.arc(g.cx + g.R * 0.66, g.cy - g.R * 0.2, g.R * 0.9, 0, TAU, true);
      };
      ctx.save();
      ctx.shadowColor = alfa('#ffdf8a', 0.5);
      ctx.shadowBlur = g.R * 0.5;
      trazar();
      const gl = ctx.createRadialGradient(
        g.cx - g.R * 0.4, g.cy - g.R * 0.4, g.R * 0.1, g.cx, g.cy, g.R * 1.3);
      gl.addColorStop(0, '#fff8dd');
      gl.addColorStop(0.6, crema);
      gl.addColorStop(1, '#d9c179');
      ctx.fillStyle = gl;
      ctx.fill('evenodd');
      ctx.restore();
      sinSombra(ctx);

      /* cráteres con relieve */
      ctx.save();
      trazar();
      ctx.clip('evenodd');
      [[-0.5, -0.45, 0.16], [-0.22, 0.55, 0.11], [-0.68, 0.16, 0.09], [-0.1, -0.12, 0.07]].forEach((o) => {
        const x = g.cx + o[0] * g.R, y = g.cy + o[1] * g.R, r = o[2] * g.R;
        const gc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        gc.addColorStop(0, alfa('#b99f54', 0.45));
        gc.addColorStop(1, alfa('#8f7b3c', 0.18));
        ctx.fillStyle = gc;
        elipse(ctx, x, y, r, r * 0.86);
        ctx.fill();
        ctx.strokeStyle = alfa('#fffbe6', 0.4);
        ctx.lineWidth = r * 0.12;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.98, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      });
      ctx.restore();

      /* la cara va en la parte iluminada */
      const gg = { cx: g.cx - g.R * 0.4, cy: g.cy + g.R * 0.05, R: g.R * 0.62 };
      caraBase(ctx, gg, s, { cuerpo: crema, trazo: '#6b5a1f', iris: '#7a6124' },
        { ojoRx: 0.21, sep: 0.42, bocaY: 0.52, bocaW: 0.5, rubor: '#e0a35a' });
      particulas(ctx, g, s, '#ffe9a8');
    }
  });

  estilos.push({
    id: 'fantasma', nombre: 'Fantasma',
    dibujar(ctx, g, s, p) {
      const c = colores(p);
      const cuerpo = aclarar(c.cuerpo, 0.35);
      const trazar = () => {
        ctx.beginPath();
        ctx.moveTo(g.cx - g.R, g.cy + g.R * 0.95);
        ctx.lineTo(g.cx - g.R, g.cy);
        ctx.arc(g.cx, g.cy, g.R, Math.PI, 0);
        ctx.lineTo(g.cx + g.R, g.cy + g.R * 0.95);
        const ondas = 4;
        for (let i = 0; i < ondas; i++) {
          const x1 = g.cx + g.R - (i * 2 + 1) * (g.R / ondas);
          const x2 = g.cx + g.R - (i * 2 + 2) * (g.R / ondas);
          const dir = Math.sin(s.t * 2.6 + i * 1.1) * g.R * 0.1;
          ctx.quadraticCurveTo(x1, g.cy + g.R * (1.3 + 0.04 * i) + dir, x2, g.cy + g.R * 0.95);
        }
        ctx.closePath();
      };

      ctx.save();
      ctx.globalAlpha = 0.93;
      ctx.shadowColor = alfa(cuerpo, 0.6);
      ctx.shadowBlur = g.R * 0.6;
      trazar();
      const gr = ctx.createRadialGradient(
        g.cx + LUZ.x * g.R * 0.5, g.cy + LUZ.y * g.R * 0.4, g.R * 0.1,
        g.cx, g.cy + g.R * 0.3, g.R * 1.6);
      gr.addColorStop(0, alfa('#ffffff', 0.95));
      gr.addColorStop(0.45, alfa(cuerpo, 0.9));
      gr.addColorStop(1, alfa(oscurecer(cuerpo, 0.1), 0.35));
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.restore();
      sinSombra(ctx);

      /* borde luminoso */
      ctx.save();
      trazar();
      ctx.clip();
      ctx.strokeStyle = alfa('#ffffff', 0.5);
      ctx.lineWidth = g.R * 0.07;
      trazar();
      ctx.stroke();
      ctx.restore();

      caraBase(ctx, g, s, { cuerpo: aclarar(cuerpo, 0.2), trazo: '#24242c', iris: '#3d3d55' },
        { ojoRx: 0.21, sep: 0.42, bocaY: 0.42, bocaW: 0.5 });
      particulas(ctx, g, s, '#ffffff');
    }
  });

  estilos.push({
    id: 'minimo', nombre: 'Sólo la cara',
    dibujar(ctx, g, s, p) {
      const claro = p.oscuro;
      const tinta = claro ? '#f6f6f4' : '#1b1b20';
      const c = { cuerpo: claro ? '#20242c' : '#e9e6df', trazo: tinta, iris: claro ? '#8fd7ff' : '#2f6f9e' };
      ctx.save();
      /* una sombra suave detrás para que la cara se despegue del fondo */
      const velo = ctx.createRadialGradient(g.cx, g.cy, g.R * 0.2, g.cx, g.cy, g.R * 1.6);
      velo.addColorStop(0, alfa(claro ? '#000000' : '#ffffff', 0.22));
      velo.addColorStop(1, alfa(claro ? '#000000' : '#ffffff', 0));
      ctx.fillStyle = velo;
      elipse(ctx, g.cx, g.cy, g.R * 1.6, g.R * 1.5);
      ctx.fill();
      ctx.restore();
      caraBase(ctx, g, s, c, { ojoRx: 0.21, sep: 0.5, bocaY: 0.52, bocaW: 0.66 });
      particulas(ctx, g, s, tinta);
    }
  });

  const porId = {};
  estilos.forEach((e) => { porId[e.id] = e; });

  /* Dibuja sólo el rostro sobre lo que ya haya en el lienzo. */
  function dibujar(ctx, w, h, receta, s) {
    const estilo = porId[receta.rostro] || estilos[0];
    const paleta = global.Paletas.obtener(receta.paleta);
    const u = Math.min(w, h);
    const R = u * (receta.tamano || 0.3);
    const cx = w / 2;
    const cy = h * (receta.altura || 0.42) + s.flotar * R * 0.04;
    const g = { cx, cy, R, u };
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.inclin * 0.35);
    ctx.translate(-cx, -cy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    estilo.dibujar(ctx, g, s, paleta);
    sinSombra(ctx);
    ctx.restore();
    return { estilo, paleta };
  }

  const Rostros = { estilos, porId, crearEstado, actualizar, dibujar, decidirAnimo };
  global.Rostros = Rostros;
  if (typeof module !== 'undefined' && module.exports) module.exports = Rostros;
})(typeof window !== 'undefined' ? window : globalThis);
