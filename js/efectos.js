/* efectos.js - capas de movimiento que se dibujan encima de cualquier fondo o imagen.
   Todas las posiciones son 0..1 y todo el movimiento tiene periodo 1 en el tiempo,
   así el GIF y el vídeo exportados cierran el ciclo sin salto. */
(function (global) {
  'use strict';

  const { alfa, limita, rng } = global.N;

  const frac = (v) => v - Math.floor(v);
  const TAU = Math.PI * 2;

  function entero(rnd, min, max) {
    return min + Math.floor(rnd() * (max - min + 1));
  }

  const estilos = [];

  estilos.push({ id: 'ninguno', nombre: 'Sin efecto', crear() { return []; }, dibujar() {} });

  estilos.push({
    id: 'lluvia', nombre: 'Lluvia',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 110; i++) {
        p.push({ x: rnd(), y: rnd(), v: entero(rnd, 2, 4), largo: 0.03 + rnd() * 0.06, a: 0.15 + rnd() * 0.45 });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      const viento = (e.inclinX || 0) * 0.05;
      ctx.lineCap = 'round';
      ps.forEach((q) => {
        const y = frac(q.y + tt * q.v);
        const x = frac(q.x + viento * y);
        ctx.strokeStyle = alfa('#cfe6ff', q.a);
        ctx.lineWidth = Math.max(1, w * 0.0035);
        ctx.beginPath();
        ctx.moveTo(x * w, y * h);
        ctx.lineTo((x - viento * 0.6) * w, (y + q.largo) * h);
        ctx.stroke();
      });
    }
  });

  estilos.push({
    id: 'nieve', nombre: 'Nieve',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 90; i++) {
        p.push({ x: rnd(), y: rnd(), v: entero(rnd, 1, 2), r: 0.004 + rnd() * 0.009, k: entero(rnd, 1, 3), f: rnd(), a: 0.4 + rnd() * 0.6 });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      const viento = (e.inclinX || 0) * 0.08;
      ps.forEach((q) => {
        const y = frac(q.y + tt * q.v);
        const x = frac(q.x + Math.sin((tt * q.k + q.f) * TAU) * 0.03 + viento);
        ctx.fillStyle = alfa('#ffffff', q.a);
        ctx.beginPath();
        ctx.arc(x * w, y * h, q.r * w, 0, TAU);
        ctx.fill();
      });
    }
  });

  estilos.push({
    id: 'petalos', nombre: 'Pétalos',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 48; i++) {
        p.push({ x: rnd(), y: rnd(), v: entero(rnd, 1, 2), r: 0.012 + rnd() * 0.014, k: entero(rnd, 1, 2), f: rnd(), giro: entero(rnd, 1, 3), tono: rnd() });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      const viento = (e.inclinX || 0) * 0.1;
      ps.forEach((q) => {
        const y = frac(q.y + tt * q.v);
        const x = frac(q.x + Math.sin((tt * q.k + q.f) * TAU) * 0.05 + viento);
        ctx.save();
        ctx.translate(x * w, y * h);
        ctx.rotate((tt * q.giro + q.f) * TAU);
        ctx.fillStyle = alfa(q.tono > 0.5 ? '#ffc0d4' : '#ff9ec2', 0.85);
        ctx.beginPath();
        ctx.ellipse(0, 0, q.r * w, q.r * w * 0.55, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    }
  });

  estilos.push({
    id: 'bokeh', nombre: 'Bokeh',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 26; i++) {
        p.push({ x: rnd(), y: rnd(), v: entero(rnd, 1, 2) * (rnd() < 0.5 ? -1 : 1), r: 0.03 + rnd() * 0.07, k: entero(rnd, 1, 3), f: rnd(), tono: rnd() });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      const col = ['#ffe9a8', '#a8e6ff', '#ffc0d4', '#d4ffc0'];
      ps.forEach((q, i) => {
        const y = frac(q.y + tt * q.v * 0.5);
        const x = frac(q.x + (e.inclinX || 0) * 0.03);
        const pulso = 0.7 + 0.3 * Math.sin((tt * q.k + q.f) * TAU);
        const r = q.r * w * pulso;
        const c = col[i % col.length];
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
        g.addColorStop(0, alfa(c, 0.4));
        g.addColorStop(0.7, alfa(c, 0.12));
        g.addColorStop(1, alfa(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x * w, y * h, r, 0, TAU);
        ctx.fill();
      });
    }
  });

  estilos.push({
    id: 'luciernagas', nombre: 'Luciérnagas',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 34; i++) {
        p.push({ x: rnd(), y: rnd(), kx: entero(rnd, 1, 2), ky: entero(rnd, 1, 3), fx: rnd(), fy: rnd(), r: 0.004 + rnd() * 0.006, k: entero(rnd, 2, 5), f: rnd() });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      const dedo = e.puntero && e.puntero.activo ? e.puntero : null;
      ps.forEach((q) => {
        let x = q.x + Math.sin((tt * q.kx + q.fx) * TAU) * 0.08;
        let y = q.y + Math.cos((tt * q.ky + q.fy) * TAU) * 0.08;
        if (dedo) {
          const dx = (dedo.x + 1) / 2, dy = (dedo.y + 1) / 2;
          x += (dx - x) * 0.25;
          y += (dy - y) * 0.25;
        }
        const brillo = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin((tt * q.k + q.f) * TAU)), 2);
        const r = q.r * w;
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * 7);
        g.addColorStop(0, alfa('#fff6a8', 0.9 * brillo));
        g.addColorStop(1, alfa('#ffd54a', 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x * w, y * h, r * 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = alfa('#fffbe0', brillo);
        ctx.beginPath();
        ctx.arc(x * w, y * h, r, 0, TAU);
        ctx.fill();
      });
    }
  });

  estilos.push({
    id: 'destello', nombre: 'Destello',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 40; i++) {
        p.push({ x: rnd(), y: rnd(), k: entero(rnd, 2, 6), f: rnd(), r: 0.003 + rnd() * 0.006 });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps) {
      const tt = frac(t);
      const cx = (tt * 1.8 - 0.4) * w;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createLinearGradient(cx - w * 0.35, 0, cx + w * 0.35, h);
      g.addColorStop(0, alfa('#ffffff', 0));
      g.addColorStop(0.5, alfa('#ffffff', 0.18));
      g.addColorStop(1, alfa('#ffffff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      ps.forEach((q) => {
        const brillo = Math.pow(Math.max(0, Math.sin((tt * q.k + q.f) * TAU)), 3);
        if (brillo < 0.02) return;
        const r = q.r * w * (1 + brillo);
        ctx.fillStyle = alfa('#ffffff', brillo);
        ctx.beginPath();
        ctx.moveTo(q.x * w, q.y * h - r * 3);
        ctx.lineTo(q.x * w + r, q.y * h);
        ctx.lineTo(q.x * w, q.y * h + r * 3);
        ctx.lineTo(q.x * w - r, q.y * h);
        ctx.closePath();
        ctx.fill();
      });
    }
  });

  estilos.push({
    id: 'polvo', nombre: 'Polvo de luz',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 120; i++) {
        p.push({ x: rnd(), y: rnd(), v: (rnd() < 0.5 ? -1 : 1), kx: entero(rnd, 1, 3), fx: rnd(), r: 0.002 + rnd() * 0.004, a: 0.2 + rnd() * 0.6 });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      ps.forEach((q) => {
        const y = frac(q.y + tt * q.v * 0.5);
        const x = frac(q.x + Math.sin((tt * q.kx + q.fx) * TAU) * 0.02 + (e.inclinX || 0) * 0.02);
        ctx.fillStyle = alfa('#fff3d6', q.a);
        ctx.beginPath();
        ctx.arc(x * w, y * h, q.r * w, 0, TAU);
        ctx.fill();
      });
    }
  });

  estilos.push({
    id: 'estrellas', nombre: 'Estrellas',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 130; i++) {
        p.push({ x: rnd(), y: rnd() * 0.85, r: 0.0015 + rnd() * 0.004, k: entero(rnd, 1, 4), f: rnd() });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps) {
      const tt = frac(t);
      ps.forEach((q) => {
        const brillo = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((tt * q.k + q.f) * TAU));
        ctx.fillStyle = alfa('#ffffff', brillo);
        ctx.beginPath();
        ctx.arc(q.x * w, q.y * h, q.r * w * brillo, 0, TAU);
        ctx.fill();
      });
      /* estrella fugaz en una parte del ciclo */
      const f0 = 0.25, f1 = 0.4;
      if (tt > f0 && tt < f1) {
        const u = (tt - f0) / (f1 - f0);
        const x = (0.15 + u * 0.7) * w;
        const y = (0.1 + u * 0.35) * h;
        const largo = w * 0.16;
        const g = ctx.createLinearGradient(x, y, x - largo, y - largo * 0.5);
        g.addColorStop(0, alfa('#ffffff', 0.9 * Math.sin(u * Math.PI)));
        g.addColorStop(1, alfa('#ffffff', 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(1, w * 0.004);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - largo, y - largo * 0.5);
        ctx.stroke();
      }
    }
  });

  estilos.push({
    id: 'niebla', nombre: 'Niebla',
    crear(rnd) {
      const p = [];
      for (let i = 0; i < 5; i++) {
        p.push({ y: rnd(), x: rnd(), v: (rnd() < 0.5 ? -1 : 1), alto: 0.08 + rnd() * 0.16, a: 0.08 + rnd() * 0.12 });
      }
      return p;
    },
    dibujar(ctx, w, h, t, ps, e) {
      const tt = frac(t);
      ps.forEach((q) => {
        const x = frac(q.x + tt * q.v) * 2 - 0.5;
        const y = q.y * h;
        const g = ctx.createLinearGradient(x * w, 0, (x + 0.8) * w, 0);
        g.addColorStop(0, alfa('#ffffff', 0));
        g.addColorStop(0.5, alfa('#ffffff', q.a * (1 + (e.inclinY || 0) * 0.2)));
        g.addColorStop(1, alfa('#ffffff', 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, y, w, q.alto * h);
      });
    }
  });

  const porId = {};
  estilos.forEach((e) => { porId[e.id] = e; });

  /* Una capa viva: partículas fijas + ondas que nacen al tocar. */
  function crear(id, semilla) {
    const def = porId[id] || porId.ninguno;
    const rnd = rng((semilla === undefined ? 1 : semilla) >>> 0);
    const particulas = def.crear(rnd);
    const ondas = [];
    return {
      id: def.id,
      toque(nx, ny) {
        ondas.push({ x: nx, y: ny, t: 0 });
        if (ondas.length > 6) ondas.shift();
      },
      actualizar(dt) {
        for (let i = ondas.length - 1; i >= 0; i--) {
          ondas[i].t += dt;
          if (ondas[i].t > 1.3) ondas.splice(i, 1);
        }
      },
      dibujar(ctx, w, h, t, entradas) {
        def.dibujar(ctx, w, h, t, particulas, entradas || {});
        ondas.forEach((o) => {
          const u = limita(o.t / 1.3, 0, 1);
          ctx.strokeStyle = alfa('#ffffff', (1 - u) * 0.5);
          ctx.lineWidth = Math.max(1, w * 0.006 * (1 - u));
          ctx.beginPath();
          ctx.arc(o.x * w, o.y * h, u * Math.min(w, h) * 0.5, 0, TAU);
          ctx.stroke();
        });
      }
    };
  }

  const Efectos = { estilos, porId, crear };
  global.Efectos = Efectos;
  if (typeof module !== 'undefined' && module.exports) module.exports = Efectos;
})(typeof window !== 'undefined' ? window : globalThis);
