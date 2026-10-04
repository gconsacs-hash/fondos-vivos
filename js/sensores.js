/* sensores.js - reúne las entradas del teléfono en un objeto simple para el rostro.
   Todo es opcional: si un sensor no está disponible, su valor queda neutro. */
(function (global) {
  'use strict';

  const { limita, resorte } = global.N;

  function crear(elemento) {
    const estado = {
      inclinX: 0, inclinY: 0,
      puntero: { x: 0, y: 0, activo: false },
      toqueNuevo: false, toqueDoble: false,
      agitado: false,
      hora: new Date().getHours(),
      bateria: null, cargando: false,
      volumen: 0,
      inactivo: 0,
      micActivo: false,
      sensorMovimiento: false
    };

    let ultimoToque = 0;
    let ultimaAcel = null;
    let analizador = null, datosAudio = null, ctxAudio = null;

    /* ---- puntero / toques ---- */
    function pos(ev) {
      const r = elemento.getBoundingClientRect();
      const t = (ev.touches && ev.touches[0]) || ev;
      const x = ((t.clientX - r.left) / r.width) * 2 - 1;
      const y = ((t.clientY - r.top) / r.height) * 2 - 1;
      return { x: limita(x, -1, 1), y: limita(y * 1.6, -1, 1) };
    }

    function abajo(ev) {
      const p = pos(ev);
      estado.puntero.x = p.x; estado.puntero.y = p.y; estado.puntero.activo = true;
      const ahora = Date.now();
      estado.toqueNuevo = true;
      estado.toqueDoble = (ahora - ultimoToque) < 420;
      ultimoToque = ahora;
      estado.inactivo = 0;
    }
    function mover(ev) {
      const p = pos(ev);
      estado.puntero.x = p.x; estado.puntero.y = p.y; estado.puntero.activo = true;
      estado.inactivo = 0;
    }
    function arriba() {
      setTimeout(() => { estado.puntero.activo = false; }, 1400);
    }

    elemento.addEventListener('pointerdown', abajo);
    elemento.addEventListener('pointermove', mover);
    elemento.addEventListener('pointerup', arriba);
    elemento.addEventListener('pointerleave', arriba);
    elemento.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    /* ---- inclinación y sacudidas ---- */
    function movimiento(ev) {
      const a = ev.accelerationIncludingGravity || ev.acceleration;
      if (!a || a.x === null) return;
      estado.sensorMovimiento = true;
      /* x: izquierda-derecha, y: adelante-atrás; se normaliza con g = 9.8 */
      estado.inclinX = resorte(estado.inclinX, limita(-a.x / 7, -1, 1), 0.08, 6);
      estado.inclinY = resorte(estado.inclinY, limita((a.y - 5) / 7, -1, 1), 0.08, 6);
      if (ultimaAcel) {
        const d = Math.abs(a.x - ultimaAcel.x) + Math.abs(a.y - ultimaAcel.y) + Math.abs(a.z - ultimaAcel.z);
        if (d > 28) { estado.agitado = true; estado.inactivo = 0; }
      }
      ultimaAcel = { x: a.x, y: a.y, z: a.z };
    }

    function orientacion(ev) {
      if (estado.sensorMovimiento) return;
      if (ev.gamma === null && ev.beta === null) return;
      estado.inclinX = resorte(estado.inclinX, limita((ev.gamma || 0) / 45, -1, 1), 0.08, 6);
      estado.inclinY = resorte(estado.inclinY, limita(((ev.beta || 0) - 40) / 45, -1, 1), 0.08, 6);
    }

    function pedirPermisoMovimiento() {
      const pedir = (cls) => (typeof cls !== 'undefined' && typeof cls.requestPermission === 'function')
        ? cls.requestPermission().catch(() => 'denied') : Promise.resolve('granted');
      return Promise.all([
        pedir(global.DeviceMotionEvent),
        pedir(global.DeviceOrientationEvent)
      ]).then(() => {
        global.addEventListener('devicemotion', movimiento);
        global.addEventListener('deviceorientation', orientacion);
      });
    }
    pedirPermisoMovimiento();

    /* ---- batería ---- */
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        const leer = () => { estado.bateria = b.level; estado.cargando = b.charging; };
        leer();
        b.addEventListener('levelchange', leer);
        b.addEventListener('chargingchange', leer);
      }).catch(() => { /* sin API de batería */ });
    }

    /* ---- micrófono (opcional, a pedido) ---- */
    function activarMicrofono() {
      if (estado.micActivo || !navigator.mediaDevices) return Promise.reject(new Error('sin micrófono'));
      return navigator.mediaDevices.getUserMedia({ audio: true }).then((flujo) => {
        const AC = global.AudioContext || global.webkitAudioContext;
        ctxAudio = new AC();
        const fuente = ctxAudio.createMediaStreamSource(flujo);
        analizador = ctxAudio.createAnalyser();
        analizador.fftSize = 512;
        datosAudio = new Uint8Array(analizador.frequencyBinCount);
        fuente.connect(analizador);
        estado.micActivo = true;
      });
    }

    function apagarMicrofono() {
      if (ctxAudio) { ctxAudio.close().catch(() => {}); }
      ctxAudio = null; analizador = null; estado.micActivo = false; estado.volumen = 0;
    }

    /* ---- muestreo por cuadro ---- */
    function leer(dt) {
      estado.hora = new Date().getHours();
      estado.inactivo += dt;
      if (analizador && datosAudio) {
        analizador.getByteFrequencyData(datosAudio);
        let suma = 0;
        for (let i = 0; i < datosAudio.length; i++) suma += datosAudio[i];
        const medio = suma / datosAudio.length / 255;
        estado.volumen = resorte(estado.volumen, limita(medio * 2.6, 0, 1), dt, 18);
      }
      return estado;
    }

    /* Los impulsos de un cuadro se consumen después de usarlos. */
    function limpiarImpulsos() {
      estado.toqueNuevo = false;
      estado.toqueDoble = false;
      estado.agitado = false;
    }

    return { estado, leer, limpiarImpulsos, activarMicrofono, apagarMicrofono, pedirPermisoMovimiento };
  }

  global.Sensores = { crear };
})(typeof window !== 'undefined' ? window : globalThis);
