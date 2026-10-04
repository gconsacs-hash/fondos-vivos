/* paletas.js - paletas de color. colores[0] es siempre el fondo base. */
(function (global) {
  'use strict';

  const lista = [
    { id: 'volcan', nombre: 'Volcán Osorno', oscuro: true,
      colores: ['#0d1b2a', '#1b3a4b', '#3f6d8c', '#c9d6df', '#f4a261'] },
    { id: 'lluvia', nombre: 'Lluvia del sur', oscuro: true,
      colores: ['#11161c', '#1f2a33', '#43606e', '#7fa6ad', '#d8e3e2'] },
    { id: 'valdiviano', nombre: 'Bosque valdiviano', oscuro: true,
      colores: ['#0b1f14', '#14331f', '#2c5e3a', '#6aa84f', '#d8e6c0'] },
    { id: 'atardecer', nombre: 'Atardecer', oscuro: true,
      colores: ['#1a0f1f', '#45215a', '#a8325e', '#f1604a', '#ffce7a'] },
    { id: 'durazno', nombre: 'Durazno', oscuro: false,
      colores: ['#fdece0', '#f9c6a3', '#ef8f6e', '#c75f55', '#5c2e2e'] },
    { id: 'menta', nombre: 'Menta', oscuro: false,
      colores: ['#eefaf3', '#bfe8d6', '#79cdb0', '#3a8f7c', '#154d44'] },
    { id: 'neon', nombre: 'Neón', oscuro: true,
      colores: ['#07070f', '#1b1046', '#5b2bd9', '#d726a8', '#2ef2e0'] },
    { id: 'arena', nombre: 'Arena', oscuro: false,
      colores: ['#f6efe3', '#e4d2b4', '#c9a87c', '#8d6b48', '#3f3326'] },
    { id: 'carbon', nombre: 'Carbón', oscuro: true,
      colores: ['#0a0a0a', '#1a1a1a', '#333333', '#777777', '#e8e8e8'] },
    { id: 'lavanda', nombre: 'Lavanda', oscuro: false,
      colores: ['#f3effa', '#d8cdee', '#b0a0dd', '#7c69b5', '#3a3060'] },
    { id: 'coihue', nombre: 'Coihue', oscuro: true,
      colores: ['#141a12', '#263122', '#4c6240', '#8aa06b', '#e0d9ad'] },
    { id: 'oceano', nombre: 'Océano', oscuro: true,
      colores: ['#03141f', '#07293d', '#0d5b78', '#2aa0a8', '#9be5d6'] },
    { id: 'cereza', nombre: 'Cereza', oscuro: true,
      colores: ['#1b0a12', '#4a0f26', '#8f1b3c', '#d84a5c', '#ffd7c2'] },
    { id: 'papel', nombre: 'Papel', oscuro: false,
      colores: ['#faf7f0', '#ece5d8', '#cfc3ad', '#8f8471', '#3b352c'] },
    { id: 'hielo', nombre: 'Hielo', oscuro: false,
      colores: ['#f0f7fb', '#cde6f2', '#93c6e0', '#4f8aad', '#1d3d52'] },
    { id: 'mostaza', nombre: 'Mostaza', oscuro: true,
      colores: ['#15120b', '#2e2614', '#6d5a1c', '#c99a21', '#f6e3a1'] }
  ];

  const porId = {};
  lista.forEach((p) => { porId[p.id] = p; });

  function obtener(id) {
    return porId[id] || lista[0];
  }

  function alAzar(rnd) {
    return lista[Math.floor(rnd() * lista.length)];
  }

  const Paletas = { lista, porId, obtener, alAzar };
  global.Paletas = Paletas;
  if (typeof module !== 'undefined' && module.exports) module.exports = Paletas;
})(typeof window !== 'undefined' ? window : globalThis);
