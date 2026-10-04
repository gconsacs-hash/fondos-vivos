/* fondos.js - generadores de fondo. Todo depende sólo de (ancho, alto, semilla, paleta),
   así que el mismo fondo se puede redibujar a cualquier resolución. */
(function (global) {
  'use strict';

  const { alfa, mezclar, aclarar, oscurecer, limita, lerp, grano, vineta, ruido2D, luz } = global.N;

  /* ---------- ayudas ---------- */

  function degradado(ctx, w, h, c1, c2, angulo) {
    const a = (angulo === undefined ? Math.PI / 2 : angulo);
    const cx = w / 2, cy = h / 2;
    const r = Math.max(w, h);
    const g = ctx.createLinearGradient(
      cx - Math.cos(a) * r / 2, cy - Math.sin(a) * r / 2,
      cx + Math.cos(a) * r / 2, cy + Math.sin(a) * r / 2
    );
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function elegir(rnd, arr) {
    return arr[Math.floor(rnd() * arr.length)];
  }

  /* Perfil de montaña por desplazamiento del punto medio. */
  function cresta(rnd, puntos, rugosidad) {
    let p = [0, 0.5, 1];
    let alturas = [0.5 + (rnd() - 0.5) * 0.1, 0.5, 0.5 + (rnd() - 0.5) * 0.1];
    let desp = rugosidad;
    while (alturas.length < puntos) {
      const nuevo = [];
      for (let i = 0; i < alturas.length - 1; i++) {
        nuevo.push(alturas[i]);
        nuevo.push((alturas[i] + alturas[i + 1]) / 2 + (rnd() - 0.5) * desp);
      }
      nuevo.push(alturas[alturas.length - 1]);
      alturas = nuevo;
      desp *= 0.55;
    }
    void p;
    return alturas;
  }

  function borrosidad(ctx, px) {
    try { ctx.filter = 'blur(' + px + 'px)'; } catch (e) { /* sin soporte: se dibuja nítido */ }
  }
  function sinBorrosidad(ctx) {
    try { ctx.filter = 'none'; } catch (e) { /* nada */ }
  }

  /* ---------- estilos ---------- */

  const estilos = [];

  estilos.push({
    id: 'malla', nombre: 'Malla de color',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      ctx.fillStyle = p.colores[0];
      ctx.fillRect(0, 0, w, h);
      const manchas = 5 + Math.floor(rnd() * 3);
      for (let i = 0; i < manchas; i++) {
        /* el sesgo hacia los primeros colores deja respirar al fondo */
        const idx = 1 + Math.floor(rnd() * rnd() * (p.colores.length - 1));
        const c = p.colores[idx];
        const x = rnd() * w, y = rnd() * h;
        const r = (0.22 + rnd() * 0.4) * Math.max(w, h);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, alfa(c, 0.75));
        g.addColorStop(0.55, alfa(c, 0.3));
        g.addColorStop(1, alfa(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      vineta(ctx, w, h, 0.3);
      grano(ctx, w, h, 0.07, rnd);
    }
  });

  estilos.push({
    id: 'aurora', nombre: 'Aurora',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      degradado(ctx, w, h, oscurecer(p.colores[0], 0.25), p.colores[1]);
      const u = Math.min(w, h);
      for (let i = 0; i < 4; i++) {
        const c = p.colores[2 + Math.floor(rnd() * (p.colores.length - 2))];
        const yBase = h * (0.2 + rnd() * 0.6);
        const amp = h * (0.05 + rnd() * 0.12);
        ctx.save();
        borrosidad(ctx, u * (0.03 + rnd() * 0.05));
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.moveTo(-w * 0.1, yBase);
        ctx.bezierCurveTo(w * 0.3, yBase - amp, w * 0.7, yBase + amp, w * 1.1, yBase - amp * 0.4);
        ctx.lineTo(w * 1.1, yBase + amp * 2.2);
        ctx.bezierCurveTo(w * 0.7, yBase + amp * 2.6, w * 0.3, yBase + amp * 1.2, -w * 0.1, yBase + amp * 1.8);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp * 2.5);
        g.addColorStop(0, alfa(c, 0.65));
        g.addColorStop(1, alfa(c, 0.05));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        sinBorrosidad(ctx);
      }
      /* estrellas */
      const n = Math.floor(w * h / 14000);
      for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h * 0.7;
        const r = u * (0.0008 + rnd() * 0.0022);
        ctx.fillStyle = alfa('#ffffff', 0.25 + rnd() * 0.6);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      grano(ctx, w, h, 0.05, rnd);
    }
  });

  estilos.push({
    id: 'ondas', nombre: 'Ondas',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      degradado(ctx, w, h, p.colores[0], mezclar(p.colores[0], p.colores[1], 0.7));
      const capas = 6;
      for (let k = 0; k < capas; k++) {
        const t = k / (capas - 1);
        const c = mezclar(p.colores[1], p.colores[p.colores.length - 1], t * 0.9);
        const yBase = h * (0.35 + t * 0.62);
        const amp = h * (0.10 - t * 0.012) * (0.6 + rnd() * 0.8);
        const f1 = 1 + rnd() * 2, f2 = 2 + rnd() * 3;
        const fase = rnd() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += Math.max(2, w / 240)) {
          const n = x / w;
          const y = yBase
            + Math.sin(n * Math.PI * 2 * f1 + fase) * amp
            + Math.sin(n * Math.PI * 2 * f2 + fase * 1.7) * amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = alfa(c, 0.85);
        ctx.fill();
      }
      grano(ctx, w, h, 0.06, rnd);
    }
  });

  estilos.push({
    id: 'topografia', nombre: 'Topografía',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      degradado(ctx, w, h, p.colores[0], mezclar(p.colores[0], p.colores[2], 0.45));
      const u = Math.min(w, h);
      const cx = w * (0.3 + rnd() * 0.4), cy = h * (0.3 + rnd() * 0.4);
      const f1 = 2 + Math.floor(rnd() * 3), f2 = 4 + Math.floor(rnd() * 4);
      const fase = rnd() * Math.PI * 2;
      const lineas = 26;
      const claro = luz(p.colores[0]) < 0.5;
      for (let i = lineas; i >= 1; i--) {
        const rr = u * 0.06 * i;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          const d = rr * (1
            + 0.14 * Math.sin(a * f1 + fase + i * 0.18)
            + 0.07 * Math.sin(a * f2 - fase + i * 0.1));
          const x = cx + Math.cos(a) * d;
          const y = cy + Math.sin(a) * d * 1.25;
          if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const t = i / lineas;
        ctx.fillStyle = alfa(mezclar(p.colores[1], p.colores[3], 1 - t), 0.06);
        ctx.fill();
        ctx.lineWidth = Math.max(1, u * 0.0022);
        ctx.strokeStyle = alfa(claro ? p.colores[4] : p.colores[3], 0.18 + (1 - t) * 0.3);
        ctx.stroke();
      }
      grano(ctx, w, h, 0.05, rnd);
    }
  });

  estilos.push({
    id: 'geo', nombre: 'Geométrico',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      ctx.fillStyle = p.colores[0];
      ctx.fillRect(0, 0, w, h);
      const cols = 4 + Math.floor(rnd() * 3);
      const cw = w / cols;
      const filas = Math.ceil(h / cw);
      for (let j = 0; j < filas; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cw, y = j * cw;
          const voltear = rnd() < 0.5;
          for (let t = 0; t < 2; t++) {
            const c = p.colores[1 + Math.floor(rnd() * (p.colores.length - 1))];
            ctx.beginPath();
            if (voltear === (t === 0)) {
              ctx.moveTo(x, y); ctx.lineTo(x + cw, y); ctx.lineTo(x, y + cw);
            } else {
              ctx.moveTo(x + cw, y); ctx.lineTo(x + cw, y + cw); ctx.lineTo(x, y + cw);
            }
            ctx.closePath();
            ctx.fillStyle = alfa(c, 0.55 + rnd() * 0.4);
            ctx.fill();
          }
        }
      }
      vineta(ctx, w, h, 0.28);
      grano(ctx, w, h, 0.08, rnd);
    }
  });

  estilos.push({
    id: 'montanas', nombre: 'Montañas',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      const noche = p.oscuro;
      degradado(ctx, w, h,
        noche ? p.colores[0] : aclarar(p.colores[1], 0.5),
        mezclar(p.colores[1], p.colores[3], 0.6));
      const u = Math.min(w, h);
      /* sol o luna */
      const sx = w * (0.2 + rnd() * 0.6), sy = h * (0.14 + rnd() * 0.16);
      const sr = u * (0.08 + rnd() * 0.05);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
      halo.addColorStop(0, alfa(p.colores[4], 0.5));
      halo.addColorStop(1, alfa(p.colores[4], 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = aclarar(p.colores[4], 0.25);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();

      const capas = 5;
      for (let k = 0; k < capas; k++) {
        const t = k / (capas - 1);
        const alturas = cresta(rnd, 65, 0.45 - t * 0.2);
        const base = h * (0.48 + t * 0.14);
        const esc = h * (0.30 - t * 0.04);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < alturas.length; i++) {
          const x = (i / (alturas.length - 1)) * w;
          const y = base - (alturas[i] - 0.5) * esc + t * h * 0.06;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const c = mezclar(p.colores[3], p.colores[0], 0.25 + t * 0.6);
        ctx.fillStyle = c;
        ctx.fill();
        /* neblina entre capas */
        ctx.fillStyle = alfa(aclarar(p.colores[2], 0.4), 0.10);
        ctx.fillRect(0, base - esc * 0.1, w, h - base + esc * 0.1);
      }
      grano(ctx, w, h, 0.06, rnd);
    }
  });

  estilos.push({
    id: 'constelacion', nombre: 'Constelación',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, Math.max(w, h) * 0.8);
      g.addColorStop(0, mezclar(p.colores[1], p.colores[0], 0.35));
      g.addColorStop(1, oscurecer(p.colores[0], 0.3));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const u = Math.min(w, h);
      const n = Math.floor(limita(w * h / 22000, 40, 220));
      const pts = [];
      for (let i = 0; i < n; i++) pts.push({ x: rnd() * w, y: rnd() * h, r: u * (0.0015 + rnd() * 0.004) });
      const dmax = u * 0.17;
      ctx.lineWidth = Math.max(1, u * 0.0012);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < dmax) {
            ctx.strokeStyle = alfa(p.colores[4], 0.22 * (1 - d / dmax));
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      pts.forEach((pt) => {
        ctx.fillStyle = alfa(p.colores[4], 0.55 + rnd() * 0.45);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });
      grano(ctx, w, h, 0.05, rnd);
    }
  });

  estilos.push({
    id: 'bauhaus', nombre: 'Bauhaus',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      ctx.fillStyle = p.oscuro ? p.colores[0] : p.colores[0];
      ctx.fillRect(0, 0, w, h);
      const cols = 3 + Math.floor(rnd() * 2);
      const cw = w / cols;
      const filas = Math.ceil(h / cw);
      for (let j = 0; j < filas; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cw, y = j * cw;
          const c = p.colores[1 + Math.floor(rnd() * (p.colores.length - 1))];
          ctx.fillStyle = c;
          const tipo = Math.floor(rnd() * 5);
          const rot = Math.floor(rnd() * 4) * Math.PI / 2;
          ctx.save();
          ctx.translate(x + cw / 2, y + cw / 2);
          ctx.rotate(rot);
          ctx.translate(-cw / 2, -cw / 2);
          ctx.beginPath();
          if (tipo === 0) {
            ctx.arc(0, 0, cw, 0, Math.PI / 2);
            ctx.lineTo(0, 0);
          } else if (tipo === 1) {
            ctx.arc(cw / 2, cw / 2, cw * 0.4, 0, Math.PI * 2);
          } else if (tipo === 2) {
            ctx.arc(cw / 2, cw, cw * 0.5, Math.PI, 0);
          } else if (tipo === 3) {
            ctx.rect(0, cw * 0.3, cw, cw * 0.4);
          } else {
            ctx.moveTo(0, cw); ctx.lineTo(cw, cw); ctx.lineTo(cw / 2, 0);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      grano(ctx, w, h, 0.08, rnd);
    }
  });

  estilos.push({
    id: 'puntos', nombre: 'Puntos',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      degradado(ctx, w, h, p.colores[0], mezclar(p.colores[0], p.colores[1], 0.8), Math.PI / 2 + (rnd() - 0.5));
      const u = Math.min(w, h);
      const paso = u * (0.045 + rnd() * 0.02);
      const fx = w * (0.2 + rnd() * 0.6), fy = h * (0.2 + rnd() * 0.6);
      const dmax = Math.hypot(w, h);
      for (let y = paso / 2; y < h; y += paso) {
        for (let x = paso / 2; x < w; x += paso) {
          const d = Math.hypot(x - fx, y - fy) / dmax;
          const onda = 0.5 + 0.5 * Math.sin(d * 24 - 1.2);
          const r = paso * 0.1 + paso * 0.3 * onda;
          ctx.fillStyle = alfa(mezclar(p.colores[2], p.colores[4], onda), 0.35 + onda * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      grano(ctx, w, h, 0.05, rnd);
    }
  });

  estilos.push({
    id: 'brumas', nombre: 'Brumas',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      ctx.fillStyle = p.colores[0];
      ctx.fillRect(0, 0, w, h);
      const u = Math.min(w, h);
      ctx.save();
      borrosidad(ctx, u * 0.12);
      for (let i = 0; i < 7; i++) {
        const c = p.colores[1 + Math.floor(rnd() * (p.colores.length - 1))];
        ctx.fillStyle = alfa(c, 0.55);
        const x = rnd() * w, y = rnd() * h;
        const rx = u * (0.18 + rnd() * 0.3), ry = u * (0.18 + rnd() * 0.3);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      sinBorrosidad(ctx);
      vineta(ctx, w, h, 0.22);
      grano(ctx, w, h, 0.09, rnd);
    }
  });

  estilos.push({
    id: 'flujo', nombre: 'Flujo',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      const nz = ruido2D(Math.floor(rnd() * 1e9));
      degradado(ctx, w, h, p.colores[0], mezclar(p.colores[0], p.colores[1], 0.9));
      const u = Math.min(w, h);
      const esc = 2.4 / u;
      const trazos = Math.floor(limita(w * h / 2600, 180, 1400));
      ctx.lineCap = 'round';
      for (let i = 0; i < trazos; i++) {
        let x = rnd() * w, y = rnd() * h;
        const c = mezclar(p.colores[2], p.colores[4], rnd());
        ctx.strokeStyle = alfa(c, 0.12 + rnd() * 0.3);
        ctx.lineWidth = u * (0.001 + rnd() * 0.004);
        ctx.beginPath();
        ctx.moveTo(x, y);
        const pasos = 18 + Math.floor(rnd() * 24);
        for (let s = 0; s < pasos; s++) {
          const a = nz(x * esc, y * esc) * Math.PI * 4;
          x += Math.cos(a) * u * 0.012;
          y += Math.sin(a) * u * 0.012;
          if (x < -u || x > w + u || y < -u || y > h + u) break;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      grano(ctx, w, h, 0.06, rnd);
    }
  });

  estilos.push({
    id: 'degradado', nombre: 'Degradado limpio',
    dibujar(ctx, w, h, o) {
      const { rnd, p } = o;
      const i1 = 1 + Math.floor(rnd() * 2);
      const c1 = p.colores[i1];
      const c2 = p.colores[Math.min(p.colores.length - 1, i1 + 2)];
      const ang = Math.PI / 2 + (rnd() - 0.5) * 1.2;
      degradado(ctx, w, h, c1, c2, ang);
      const g = ctx.createRadialGradient(w * 0.5, h * 0.28, 0, w * 0.5, h * 0.28, Math.max(w, h) * 0.7);
      g.addColorStop(0, alfa('#ffffff', 0.12));
      g.addColorStop(1, alfa('#ffffff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      grano(ctx, w, h, 0.07, rnd);
    }
  });

  const porId = {};
  estilos.forEach((e) => { porId[e.id] = e; });

  /* Dibuja un fondo completo según una receta. */
  function dibujar(ctx, w, h, receta) {
    const estilo = porId[receta.estilo] || estilos[0];
    const paleta = global.Paletas.obtener(receta.paleta);
    const rnd = global.N.rng(receta.semilla >>> 0);
    ctx.save();
    ctx.fillStyle = paleta.colores[0];
    ctx.fillRect(0, 0, w, h);
    estilo.dibujar(ctx, w, h, { rnd, p: paleta, lerp, limita });
    ctx.restore();
    return { estilo, paleta };
  }

  function recetaAlAzar(semilla) {
    const rnd = global.N.rng(semilla >>> 0);
    return {
      estilo: elegir(rnd, estilos).id,
      paleta: global.Paletas.alAzar(rnd).id,
      semilla: Math.floor(rnd() * 0xFFFFFFFF) >>> 0
    };
  }

  const Fondos = { estilos, porId, dibujar, recetaAlAzar, degradado };
  global.Fondos = Fondos;
  if (typeof module !== 'undefined' && module.exports) module.exports = Fondos;
})(typeof window !== 'undefined' ? window : globalThis);
