/* app.js - une todo: vistas, bucle de dibujo, controles y exportación. */
(function () {
  'use strict';

  const { limita } = N;

  const el = (id) => document.getElementById(id);
  const lienzo = el('lienzo');
  const ctx = lienzo.getContext('2d');

  const app = {
    vista: 'fondo',
    receta: {
      estilo: 'malla',
      paleta: 'volcan',
      semilla: N.semillaNueva(),
      rostro: 'gota',
      efecto: 'ninguno',
      tamano: 0.3,
      altura: 0.42,
      conRostro: false
    },
    sucio: true,
    cacheFondo: null,
    claveCache: '',
    capa: null,
    capaExport: null,
    claveCapaExport: '',
    tiempo: 0,
    rostroEstado: Rostros.crearEstado(),
    retrato: Retrato.crear(),
    marcaPendiente: null,
    sens: null,
    pantallaCompleta: false,
    wakeLock: null
  };

  /* ---------- tamaño del lienzo ---------- */

  function ajustarLienzo() {
    const r = lienzo.getBoundingClientRect();
    const dpr = limita(window.devicePixelRatio || 1, 1, 2);
    const w = Math.max(120, Math.round(r.width * dpr));
    const h = Math.max(200, Math.round(r.height * dpr));
    if (lienzo.width !== w || lienzo.height !== h) {
      lienzo.width = w;
      lienzo.height = h;
      app.sucio = true;
    }
  }

  /* ---------- fondo con caché ---------- */

  function claveFondo() {
    return [app.receta.estilo, app.receta.paleta, app.receta.semilla, lienzo.width, lienzo.height].join('|');
  }

  function fondoPreparado() {
    const clave = claveFondo();
    if (app.cacheFondo && app.claveCache === clave) return app.cacheFondo;
    const c = app.cacheFondo && app.cacheFondo.width === lienzo.width && app.cacheFondo.height === lienzo.height
      ? app.cacheFondo
      : Exportar.nuevoLienzo(lienzo.width, lienzo.height);
    const cx = c.getContext('2d');
    cx.clearRect(0, 0, c.width, c.height);
    Fondos.dibujar(cx, c.width, c.height, app.receta);
    app.cacheFondo = c;
    app.claveCache = clave;
    return c;
  }

  /* ---------- bucle ---------- */

  const CICLO = 6; /* segundos: un giro completo del efecto, igual al del GIF */
  let ultimo = performance.now();

  function cuadro(ahora) {
    const dt = limita((ahora - ultimo) / 1000, 0, 0.1);
    ultimo = ahora;
    app.tiempo += dt;

    const w = lienzo.width, h = lienzo.height;
    const conCara = app.receta.conRostro || app.vista === 'retrato';
    const conEfecto = app.receta.efecto !== 'ninguno';
    const animado = conCara || conEfecto;

    if (animado) {
      const e = app.sens.leer(dt);
      if (conCara) {
        Rostros.actualizar(app.rostroEstado, dt, e);
        mostrarAnimo();
      }
      if (e.toqueNuevo && app.capa) {
        app.capa.toque((e.puntero.x + 1) / 2, (e.puntero.y + 1) / 2);
      }
      if (app.capa) app.capa.actualizar(dt);
      app.sens.limpiarImpulsos();
    }

    if (animado || app.sucio) {
      if (app.vista === 'retrato') {
        app.retrato.dibujar(ctx, w, h, app.rostroEstado, app.receta);
        if (!app.retrato.img) placa('Elige una imagen en «Imagen viva»');
      } else {
        ctx.drawImage(fondoPreparado(), 0, 0);
        if (app.receta.conRostro) Rostros.dibujar(ctx, w, h, app.receta, app.rostroEstado);
      }
      if (conEfecto && app.capa) {
        app.capa.dibujar(ctx, w, h, app.tiempo / CICLO, app.sens.estado);
      }
      app.sucio = false;
    }
    requestAnimationFrame(cuadro);
  }

  function placa(texto) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, lienzo.height * 0.45, lienzo.width, lienzo.height * 0.1);
    ctx.fillStyle = '#e9edf3';
    ctx.textAlign = 'center';
    ctx.font = Math.round(lienzo.width * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText(texto, lienzo.width / 2, lienzo.height * 0.51);
    ctx.restore();
  }

  const nombresAnimo = {
    neutral: 'tranquilo', feliz: 'contento', sorprendido: '¡sorpresa!', enamorado: 'enamorado',
    energico: 'cargando energía', bajon: 'batería baja', cantando: 'cantando',
    mareado: 'mareado', dormido: 'durmiendo', aburrido: 'aburrido'
  };

  let ultimoAnimo = '';
  function mostrarAnimo() {
    const a = app.rostroEstado.animo;
    if (a === ultimoAnimo) return;
    ultimoAnimo = a;
    const hud = el('hud');
    hud.textContent = nombresAnimo[a] || a;
    hud.classList.add('visible');
    clearTimeout(hud._t);
    hud._t = setTimeout(() => hud.classList.remove('visible'), 2200);
  }

  /* ---------- guion de animación para exportar (ciclo perfecto) ---------- */

  function estadoGuion(t) {
    const s = Rostros.crearEstado();
    const v = t * Math.PI * 2;
    s.t = t * 6;
    s.parpadeo = t < 0.12 ? Math.sin((t / 0.12) * Math.PI) : 0;
    s.mirX = Math.sin(v) * 0.6;
    s.mirY = Math.cos(v) * 0.28;
    s.sonrisa = 0.5 + 0.4 * Math.sin(v);
    s.apertura = Math.max(0, Math.sin(v * 2)) * 0.25;
    s.ceja = 0.15 + 0.2 * Math.sin(v);
    s.rubor = 0.35;
    s.flotar = Math.sin(v);
    s.inclin = Math.sin(v) * 0.05;
    s.animo = 'feliz';
    s.particulas = [];
    return s;
  }

  /* Capa de efecto aparte para exportar: así el GIF no arrastra las ondas del dedo. */
  function capaParaExportar() {
    const clave = app.receta.efecto + '|' + app.receta.semilla;
    if (!app.capaExport || app.claveCapaExport !== clave) {
      app.capaExport = Efectos.crear(app.receta.efecto, app.receta.semilla);
      app.claveCapaExport = clave;
    }
    return app.capaExport;
  }

  function dibujarExport(ctx2, w, h, t) {
    const s = estadoGuion(t);
    if (app.vista === 'retrato') {
      app.retrato.dibujar(ctx2, w, h, s, app.receta);
    } else {
      Fondos.dibujar(ctx2, w, h, app.receta);
      if (app.receta.conRostro) Rostros.dibujar(ctx2, w, h, app.receta, s);
    }
    if (app.receta.efecto !== 'ninguno') capaParaExportar().dibujar(ctx2, w, h, t, {});
  }

  function dibujarInstantanea(ctx2, w, h) {
    if (app.vista === 'retrato') {
      app.retrato.dibujar(ctx2, w, h, app.rostroEstado, app.receta);
    } else {
      Fondos.dibujar(ctx2, w, h, app.receta);
      if (app.receta.conRostro) Rostros.dibujar(ctx2, w, h, app.receta, app.rostroEstado);
    }
    if (app.receta.efecto !== 'ninguno') {
      capaParaExportar().dibujar(ctx2, w, h, app.tiempo / CICLO, app.sens.estado);
    }
  }

  /* ---------- construcción de controles ---------- */

  function chip(texto, activo, alTocar, muestra) {
    const b = document.createElement('button');
    b.className = 'chip' + (activo ? ' activo' : '');
    if (muestra) {
      const m = document.createElement('span');
      m.className = 'muestra';
      m.style.background = 'linear-gradient(90deg,' + muestra.join(',') + ')';
      b.appendChild(m);
    }
    b.appendChild(document.createTextNode(texto));
    b.addEventListener('click', alTocar);
    return b;
  }

  function pintarEstilos() {
    const cont = el('estilos');
    cont.textContent = '';
    Fondos.estilos.forEach((e) => {
      cont.appendChild(chip(e.nombre, app.receta.estilo === e.id, () => {
        app.receta.estilo = e.id;
        app.sucio = true;
        pintarEstilos();
        sincronizarSelect();
      }));
    });
  }

  function pintarPaletas() {
    [el('paletas'), el('paletasRostro')].forEach((cont) => {
      cont.textContent = '';
      Paletas.lista.forEach((p) => {
        cont.appendChild(chip(p.nombre, app.receta.paleta === p.id, () => {
          app.receta.paleta = p.id;
          app.sucio = true;
          pintarPaletas();
        }, p.colores.slice(1)));
      });
    });
  }

  function pintarRostros() {
    const cont = el('rostros');
    cont.textContent = '';
    Rostros.estilos.forEach((e) => {
      cont.appendChild(chip(e.nombre, app.receta.rostro === e.id, () => {
        app.receta.rostro = e.id;
        app.sucio = true;
        pintarRostros();
      }));
    });
  }

  function pintarEfectos() {
    const cont = el('efectos');
    cont.textContent = '';
    Efectos.estilos.forEach((e) => {
      cont.appendChild(chip(e.nombre, app.receta.efecto === e.id, () => {
        app.receta.efecto = e.id;
        app.capa = Efectos.crear(e.id, app.receta.semilla);
        app.sucio = true;
        pintarEfectos();
        actualizarBotonesExport();
      }));
    });
  }

  function sincronizarSelect() {
    const sel = el('fondoRostro');
    if (sel.value !== app.receta.estilo) sel.value = app.receta.estilo;
  }

  function pintarResoluciones() {
    const sel = el('resolucion');
    sel.textContent = '';
    const todas = [Exportar.resolucionPantalla()].concat(Exportar.resoluciones);
    todas.forEach((r, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = r.nombre;
      sel.appendChild(o);
    });
    sel._lista = todas;
    sel.value = '1';
  }

  function resolucionElegida() {
    const sel = el('resolucion');
    return sel._lista[+sel.value] || sel._lista[0];
  }

  /* ---------- vistas ---------- */

  function cambiarVista(v) {
    app.vista = v;
    app.receta.conRostro = (v === 'rostro');
    app.sucio = true;
    ['fondo', 'rostro', 'retrato', 'galeria'].forEach((k) => {
      el('panel-' + k).hidden = (k !== v);
    });
    document.querySelectorAll('#nav button').forEach((b) => {
      b.classList.toggle('activo', b.dataset.vista === v);
    });
    el('exportar').hidden = (v === 'galeria');
    el('efectosSec').hidden = (v === 'galeria');
    actualizarBotonesExport();
    if (v === 'galeria') pintarGaleria();
  }

  function actualizarBotonesExport() {
    const animables = (app.vista === 'rostro' || app.vista === 'retrato' || app.receta.efecto !== 'ninguno');
    el('btnGif').disabled = !animables;
    el('btnWebm').disabled = !animables || !Exportar.soportaWebm();
    el('duracion').disabled = !animables;
    el('aviso').textContent = animables
      ? 'El GIF y el vídeo sirven para la pantalla de bloqueo (Samsung permite vídeo) y para compartir. El fondo del escritorio en Android usa el PNG.'
      : 'Guarda el PNG y en el teléfono: mantener pulsado el escritorio → Fondos de pantalla → elegir la imagen. Si eliges un efecto en movimiento, se activan el GIF y el vídeo.';
  }

  /* ---------- galería ---------- */

  function pintarGaleria() {
    const cont = el('listaGaleria');
    cont.textContent = '';
    const items = Galeria.leer();
    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'nota vacia';
      p.textContent = 'Todavía no has guardado nada. Usa el botón ★ Galería.';
      cont.appendChild(p);
      return;
    }
    items.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'item';
      const c = document.createElement('canvas');
      c.width = 110; c.height = 238;
      const cx = c.getContext('2d');
      Fondos.dibujar(cx, c.width, c.height, item.receta);
      if (item.receta.conRostro) Rostros.dibujar(cx, c.width, c.height, item.receta, estadoGuion(0.5));
      if (item.receta.efecto && item.receta.efecto !== 'ninguno') {
        Efectos.crear(item.receta.efecto, item.receta.semilla).dibujar(cx, c.width, c.height, 0.3, {});
      }
      c.title = 'Abrir';
      c.addEventListener('click', () => {
        Object.assign(app.receta, item.receta);
        app.sucio = true;
        app.capa = Efectos.crear(app.receta.efecto, app.receta.semilla);
        pintarEstilos(); pintarPaletas(); pintarRostros(); pintarEfectos();
        el('tamano').value = app.receta.tamano;
        el('altura').value = app.receta.altura;
        cambiarVista(item.receta.conRostro ? 'rostro' : 'fondo');
      });
      const x = document.createElement('button');
      x.className = 'borrar';
      x.textContent = '✕';
      x.addEventListener('click', (ev) => {
        ev.stopPropagation();
        Galeria.borrar(item.id);
        pintarGaleria();
      });
      div.appendChild(c);
      div.appendChild(x);
      cont.appendChild(div);
    });
  }

  /* ---------- progreso ---------- */

  function progreso(v, texto) {
    const p = el('progreso');
    if (v === null) { p.hidden = true; return; }
    p.hidden = false;
    p.querySelector('i').style.width = Math.round(v * 100) + '%';
    p.querySelector('span').textContent = texto || '';
  }

  /* ---------- pantalla completa ---------- */

  async function entrarPantalla() {
    document.body.classList.add('pantalla');
    el('btnSalirPantalla').hidden = false;
    app.pantallaCompleta = true;
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch (e) { /* el navegador puede negarlo */ }
    try {
      if (navigator.wakeLock) app.wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* sin wake lock */ }
    setTimeout(ajustarLienzo, 120);
  }

  async function salirPantalla() {
    document.body.classList.remove('pantalla');
    el('btnSalirPantalla').hidden = true;
    app.pantallaCompleta = false;
    if (app.wakeLock) { try { app.wakeLock.release(); } catch (e) { /* ya liberado */ } app.wakeLock = null; }
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* nada */ }
    setTimeout(ajustarLienzo, 120);
  }

  /* ---------- eventos ---------- */

  function conectar() {
    document.querySelectorAll('#nav button').forEach((b) => {
      b.addEventListener('click', () => cambiarVista(b.dataset.vista));
    });

    const variar = () => {
      app.receta.semilla = N.semillaNueva();
      app.capa = Efectos.crear(app.receta.efecto, app.receta.semilla);
      app.sucio = true;
    };
    el('btnVariar').addEventListener('click', variar);
    el('btnVariarRostro').addEventListener('click', variar);
    el('btnSorpresa').addEventListener('click', () => {
      const r = Fondos.recetaAlAzar(N.semillaNueva());
      app.receta.estilo = r.estilo;
      app.receta.paleta = r.paleta;
      app.receta.semilla = r.semilla;
      app.capa = Efectos.crear(app.receta.efecto, app.receta.semilla);
      app.sucio = true;
      pintarEstilos(); pintarPaletas(); sincronizarSelect();
    });
    el('chkGuias').addEventListener('change', (e) => {
      el('guias').hidden = !e.target.checked;
    });

    const sel = el('fondoRostro');
    Fondos.estilos.forEach((e) => {
      const o = document.createElement('option');
      o.value = e.id;
      o.textContent = e.nombre;
      sel.appendChild(o);
    });
    sel.value = app.receta.estilo;
    sel.addEventListener('change', () => {
      app.receta.estilo = sel.value;
      app.sucio = true;
      pintarEstilos();
    });

    el('tamano').value = app.receta.tamano;
    el('altura').value = app.receta.altura;
    el('tamano').addEventListener('input', (e) => { app.receta.tamano = +e.target.value; app.sucio = true; });
    el('altura').addEventListener('input', (e) => { app.receta.altura = +e.target.value; app.sucio = true; });

    el('btnMic').addEventListener('click', () => {
      const b = el('btnMic');
      if (app.sens.estado.micActivo) {
        app.sens.apagarMicrofono();
        b.classList.remove('activo');
        b.textContent = 'Escuchar voz';
        return;
      }
      app.sens.activarMicrofono().then(() => {
        b.classList.add('activo');
        b.textContent = 'Micrófono encendido';
      }).catch(() => {
        b.textContent = 'Sin micrófono';
        setTimeout(() => { b.textContent = 'Escuchar voz'; }, 2000);
      });
    });

    el('btnSensores').addEventListener('click', () => {
      app.sens.pedirPermisoMovimiento().then(() => {
        const b = el('btnSensores');
        b.classList.add('activo');
        b.textContent = 'Sensores activos';
      });
    });

    el('btnPantalla').addEventListener('click', entrarPantalla);
    el('btnSalirPantalla').addEventListener('click', salirPantalla);
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && app.pantallaCompleta) salirPantalla();
    });

    /* --- retrato --- */
    el('archivoFoto').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      app.retrato.cargar(f).then(() => {
        app.sucio = true;
        estadoMarcas();
      }).catch(() => { el('estadoMarcas').textContent = 'No se pudo abrir esa imagen.'; });
    });

    document.querySelectorAll('[data-marca]').forEach((b) => {
      b.addEventListener('click', () => {
        app.marcaPendiente = b.dataset.marca;
        document.querySelectorAll('[data-marca]').forEach((o) => o.classList.toggle('activo', o === b));
        el('estadoMarcas').textContent = 'Toca ahora ese punto sobre la imagen.';
      });
    });

    lienzo.addEventListener('pointerdown', (ev) => {
      if (app.vista !== 'retrato' || !app.marcaPendiente || !app.retrato.img) return;
      const r = lienzo.getBoundingClientRect();
      const px = (ev.clientX - r.left) * (lienzo.width / r.width);
      const py = (ev.clientY - r.top) * (lienzo.height / r.height);
      app.retrato.marcarDesdeLienzo(app.marcaPendiente, px, py, lienzo.width, lienzo.height, app.rostroEstado);
      app.marcaPendiente = null;
      document.querySelectorAll('[data-marca]').forEach((o) => o.classList.remove('activo'));
      app.sucio = true;
      estadoMarcas();
    });

    el('fuerza').addEventListener('input', (e) => { app.retrato.fuerza = +e.target.value; app.sucio = true; });
    el('tamanoOjo').addEventListener('input', (e) => { app.retrato.tamanoOjo = +e.target.value; app.sucio = true; });
    el('desplaz').addEventListener('input', (e) => { app.retrato.desplazamiento = +e.target.value; app.sucio = true; });

    /* --- exportar --- */
    el('btnPng').addEventListener('click', () => {
      const r = resolucionElegida();
      progreso(0.3, 'dibujando ' + r.w + '×' + r.h + '…');
      setTimeout(() => {
        Exportar.png((c, w, h) => dibujarInstantanea(c, w, h), r.w, r.h, nombreArchivo())
          .then(() => { progreso(1, 'PNG guardado'); setTimeout(() => progreso(null), 1800); });
      }, 30);
    });

    el('btnGif').addEventListener('click', () => {
      const r = resolucionElegida();
      const w = 360;
      const h = Math.round(360 * r.h / r.w / 2) * 2;
      el('btnGif').disabled = true;
      Exportar.gif({
        w, h,
        cuadros: 18,
        retardoMs: 80,
        dibujarEn: dibujarExport,
        nombre: nombreArchivo(),
        onProgreso: (v, t) => progreso(v, t)
      }).then(() => {
        progreso(1, 'GIF guardado (' + w + '×' + h + ')');
        setTimeout(() => progreso(null), 2400);
      }).catch(() => progreso(null)).then(() => { el('btnGif').disabled = false; });
    });

    el('btnWebm').addEventListener('click', () => {
      const r = resolucionElegida();
      const w = Math.min(r.w, 720);
      const h = Math.round(w * r.h / r.w / 2) * 2;
      el('btnWebm').disabled = true;
      Exportar.webm({
        w, h,
        segundos: +el('duracion').value,
        dibujarEn: dibujarExport,
        nombre: nombreArchivo(),
        onProgreso: (v, t) => progreso(v, t)
      }).then(() => {
        progreso(1, 'vídeo guardado (' + w + '×' + h + ')');
        setTimeout(() => progreso(null), 2400);
      }).catch((e) => {
        progreso(1, e.message);
        setTimeout(() => progreso(null), 2400);
      }).then(() => { el('btnWebm').disabled = false; });
    });

    el('btnGuardar').addEventListener('click', () => {
      Galeria.guardar(app.receta);
      progreso(1, 'guardado en la galería');
      setTimeout(() => progreso(null), 1600);
    });

    el('btnLimpiarGaleria').addEventListener('click', () => {
      Galeria.limpiar();
      pintarGaleria();
    });

    window.addEventListener('resize', () => { ajustarLienzo(); app.sucio = true; });
    window.addEventListener('orientationchange', () => setTimeout(() => { ajustarLienzo(); app.sucio = true; }, 200));
  }

  function nombreArchivo() {
    if (app.vista === 'retrato') return 'imagen-viva';
    return (app.receta.conRostro ? 'rostro-' + app.receta.rostro : 'fondo-' + app.receta.estilo);
  }

  function estadoMarcas() {
    const p = app.retrato.puntos;
    const faltan = ['ojoI', 'ojoD', 'boca'].filter((k) => !p[k]);
    const nombres = { ojoI: 'ojo izquierdo', ojoD: 'ojo derecho', boca: 'boca' };
    el('estadoMarcas').textContent = faltan.length
      ? 'Falta marcar: ' + faltan.map((k) => nombres[k]).join(', ') + '.'
      : '¡Listo! Toca la imagen, inclina el teléfono o arrastra el dedo para verlo reaccionar.';
  }

  /* ---------- arranque ---------- */

  function iniciar() {
    ajustarLienzo();
    app.sens = Sensores.crear(el('escenario'));
    app.capa = Efectos.crear(app.receta.efecto, app.receta.semilla);
    pintarEstilos();
    pintarPaletas();
    pintarRostros();
    pintarEfectos();
    pintarResoluciones();
    conectar();
    cambiarVista('fondo');
    requestAnimationFrame(cuadro);

    /* gancho para depurar desde la consola del navegador */
    window.FondosVivos = app;

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
    }
  }

  iniciar();
})();
