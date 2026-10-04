/* galeria.js - guarda recetas de fondo en el navegador (no imágenes: pesan nada). */
(function (global) {
  'use strict';

  const CLAVE = 'fondos-vivos:galeria';

  function leer() {
    try {
      const txt = localStorage.getItem(CLAVE);
      const arr = txt ? JSON.parse(txt) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function escribir(arr) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(arr.slice(0, 60)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function guardar(receta) {
    const arr = leer();
    const item = {
      id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
      cuando: new Date().toISOString(),
      receta: JSON.parse(JSON.stringify(receta))
    };
    arr.unshift(item);
    escribir(arr);
    return item;
  }

  function borrar(id) {
    escribir(leer().filter((i) => i.id !== id));
  }

  function limpiar() {
    escribir([]);
  }

  global.Galeria = { leer, guardar, borrar, limpiar };
})(typeof window !== 'undefined' ? window : globalThis);
